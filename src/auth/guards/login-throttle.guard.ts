import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  clientIpPrefix,
  resolveClientIp,
  UNKNOWN_CLIENT_IP,
} from '../../shared/request-context/util/client-ip';

// Auth throttle. Three layers, checked narrowest first so one client's retries
// never starve another's:
//
//   (ip, username)  fast — stops guessing one account
//   username        net  — stops spreading a guess across many addresses
//   ip / ip-prefix  gross — stops unauthenticated floods and signup spam
//
// An IP that misbehaves through the gross layer is dropped to its /24 (or /48)
// for the rest of the window, so a single noisy neighbour cannot lock out a
// whole network.
//
// In-process state: correct for the single API replica this runs on, and reset
// by a restart. Move to a shared store before scaling out.

export interface WindowRule {
  max: number;
  windowMs: number;
}

export interface AuthThrottleRules {
  perIpUser: WindowRule;
  perUser: WindowRule;
  perIp: WindowRule;
  /** Unauthenticated `POST /auth/register`. */
  perIpRegister: WindowRule;
}

export const AUTH_THROTTLE_RULES: AuthThrottleRules = {
  perIpUser: { max: 10, windowMs: 60_000 },
  perUser: { max: 20, windowMs: 300_000 },
  perIp: { max: 30, windowMs: 60_000 },
  perIpRegister: { max: 20, windowMs: 3_600_000 },
};

// Bounds unbounded growth from unique IPs / usernames over a long uptime.
const MAX_TRACKED_KEYS = 20_000;

const hits = new Map<string, number[]>();
const widenedIps = new Map<string, number>();

export function resetLoginThrottle(): void {
  hits.clear();
  widenedIps.clear();
}

function hit(key: string, rule: WindowRule, now: number): number {
  // Opportunistic sweep; cheap and only when the map has actually grown.
  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, times] of hits) {
      if (!times.some((t) => now - t < rule.windowMs)) {
        hits.delete(k);
      }
    }
  }
  const list = (hits.get(key) ?? []).filter((t) => now - t < rule.windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length;
}

function retryAfterSeconds(rule: WindowRule, key: string, now: number): number {
  const oldest = hits.get(key)?.[0] ?? now;
  return Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000));
}

function tooMany(retryAfter: number): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Too many attempts, try again later',
      retryAfter,
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const now = Date.now();
    const isRegister = request.route?.path?.endsWith('/register') ?? false;

    if (this.config.get<boolean>('throttle.enabled') === false) {
      return true;
    }

    // Direct connections only when the proxy is untrusted: the header would
    // then be whatever the caller sent and therefore read.
    const ip =
      this.config.get<boolean>('throttle.trustProxyHeaders') === false
        ? (request.socket?.remoteAddress ?? UNKNOWN_CLIENT_IP)
        : resolveClientIp(request);
    // `unknown` would pool every untaggable client into one bucket, so let them
    // through rather than letting them lock each other out.
    if (ip === UNKNOWN_CLIENT_IP) {
      return true;
    }

    const username = String(request.body?.username ?? '')
      .trim()
      .toLowerCase();
    // The live network bucket is the single source of truth for widening: a
    // network is spent until its window passes, and every address in it is
    // then judged against that one bucket (the owner included, so it never
    // drops back to a fresh per-address allowance).
    const networkKey = `ip:${clientIpPrefix(ip)}`;
    const widenedUntil = widenedIps.get(networkKey);
    if (widenedUntil !== undefined && widenedUntil <= now) {
      widenedIps.delete(networkKey);
      hits.delete(networkKey);
    }
    if (widenedIps.has(networkKey)) {
      return this.decide(ip, networkKey, username, isRegister, now, response);
    }

    return this.decide(ip, `ip:${ip}`, username, isRegister, now, response);
  }

  /**
   * `scoped` is the bucket for an unidentified network, i.e. a real key. The
   * per-(address, username) bucket always keys on the plain address so a pair
   * is not split by widening.
   */
  private decide(
    ip: string,
    scoped: string,
    username: string,
    isRegister: boolean,
    now: number,
    response: { setHeader?: (name: string, value: string) => void },
  ): boolean {
    // Clients (and the FE) retry immediately on a bare 429 without this.
    const deny = (rule: WindowRule, key: string): never => {
      const retryAfter = retryAfterSeconds(rule, key, now);
      response?.setHeader?.('Retry-After', String(retryAfter));
      throw tooMany(retryAfter);
    };

    if (username) {
      // Always the plain address, so widening does not split the pair bucket.
      const pairKey = `u:${username}|ip:${ip}`;
      if (hit(pairKey, AUTH_THROTTLE_RULES.perIpUser, now) > AUTH_THROTTLE_RULES.perIpUser.max) {
        deny(AUTH_THROTTLE_RULES.perIpUser, pairKey);
      }
      const userKey = `u:${username}`;
      if (hit(userKey, AUTH_THROTTLE_RULES.perUser, now) > AUTH_THROTTLE_RULES.perUser.max) {
        deny(AUTH_THROTTLE_RULES.perUser, userKey);
      }
    }

    const rule = isRegister ? AUTH_THROTTLE_RULES.perIpRegister : AUTH_THROTTLE_RULES.perIp;

    // On a live network bucket: it is already over budget by construction (the
    // spilled request is carried into it), so it only has to be counted.
    if (scoped.includes('/')) {
      if (hit(scoped, rule, now) > rule.max) {
        deny(rule, scoped);
      }
      return true;
    }

    if (hit(scoped, rule, now) > rule.max) {
      // This address is flooding. Widening happens on the request that is
      // tripping, so that request counts against the address and every later
      // one against the network — no allowance comes free.
      const networkKey = `ip:${clientIpPrefix(ip)}`;
      const windowEnd = (hits.get(scoped)?.[0] ?? now) + rule.windowMs;
      const spent = hits.get(scoped) ?? [];
      hits.set(networkKey, [...spent.slice(-rule.max), now]);
      widenedIps.set(networkKey, windowEnd);
      deny(rule, scoped);
    }

    return true;
  }
}
