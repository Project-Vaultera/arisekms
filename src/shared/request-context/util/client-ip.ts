import { FORWARDED_FOR_TOKEN_HEADER } from '../../constants';

// One answer to "who is calling", shared by the request logs, the auth throttle
// and the audit trail.
//
// Each proxy in front of us *appends* the peer it saw to X-Forwarded-For, so
// the trustworthy entries sit at the right end and everything to their left is
// caller-supplied. Reading the left-most entry is the classic bypass: a client
// picks a fresh value per request and every counter resets.
//
// How many hops to walk back is a deployment fact, not a constant:
//
//   client -> Caddy                 -> app   XFF: [client]          1 hop
//   client -> ALB                   -> app   XFF: [client]          1 hop
//   client -> Cloudflare -> ALB     -> app   XFF: [client, cf-edge] 2 hops
//
// `APP_TRUSTED_PROXY_HOPS` carries it. Too few hops and every caller collapses
// onto the CDN's address, which is the shared-bucket bug the throttle exists to
// prevent; too many and a caller-supplied value gets trusted. A header shorter
// than the configured depth cannot have come from our chain, so it is ignored
// and the socket address wins.
export const UNKNOWN_CLIENT_IP = 'unknown';

export const DEFAULT_TRUSTED_PROXY_HOPS = 1;

// Process-wide default, set once at bootstrap from configuration so the
// throttle, the logs and the audit trail agree. The guard passes the value
// explicitly instead of relying on this.
let trustedHops = DEFAULT_TRUSTED_PROXY_HOPS;

export function setTrustedProxyHops(hops: number): void {
  trustedHops =
    Number.isFinite(hops) && hops >= 1
      ? Math.trunc(hops)
      : DEFAULT_TRUSTED_PROXY_HOPS;
}

// Deliberately structural rather than Express's Request, so the guard and the
// logging middleware can both use it without dragging Express types along.
export interface HasForwardingHeaders {
  header(name: string): string | undefined;
  ip?: string;
  socket?: { remoteAddress?: string };
}

export function clientIpFromHeader(
  forwardedFor: string | undefined,
  hops: number = trustedHops,
): string | undefined {
  const entries = (forwardedFor ?? '')
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean);
  // Shorter than the chain we expect: this header did not come from our
  // proxies, so none of it is trustworthy.
  if (entries.length < hops) {
    return undefined;
  }
  return entries[entries.length - hops];
}

export function resolveClientIp(
  request: HasForwardingHeaders,
  hops: number = trustedHops,
): string {
  return (
    clientIpFromHeader(request.header(FORWARDED_FOR_TOKEN_HEADER), hops) ??
    request.ip ??
    request.socket?.remoteAddress ??
    UNKNOWN_CLIENT_IP
  );
}

// The textual parts of an IP, ignoring IPv6 zone ids and IPv4-mapped prefixes.
function ipFamily(ip: string): 'v4' | 'v6' {
  return ip.includes(':') ? 'v6' : 'v4';
}

/**
 * How much of an IP identifies a client without identifying a whole network.
 * IPv4 keeps three octets (`203.0.113.x`), IPv6 keeps three hextets — far more
 * than the /64 a single subscriber is usually given.
 */
export function clientIpPrefix(ip: string): string {
  if (ip === UNKNOWN_CLIENT_IP) {
    return ip;
  }
  const bare = ip.replace(/^::ffff:/, '').replace(/%.*$/, '');
  if (ipFamily(bare) === 'v4') {
    return `${bare.split('.').slice(0, 3).join('.')}.0/24`;
  }
  const hextets = bare.split(':').filter(Boolean).slice(0, 3);
  return `${hextets.join(':')}::/48`;
}