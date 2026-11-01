import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

// Tiny in-memory throttle for auth endpoints: 10 requests per minute per IP.
// No new dependency; resets on restart which is fine for a single dev process.
const WINDOW_MS = 60_000;
const MAX_HITS = 10;
const hits = new Map<string, number[]>();

export function resetLoginThrottle(): void {
  hits.clear();
}

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const ip = (req.ip ?? req.connection?.remoteAddress ?? 'unknown') as string;
    const now = Date.now();
    const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (list.length >= MAX_HITS) {
      throw new HttpException('Too many attempts, try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
    list.push(now);
    hits.set(ip, list);
    return true;
  }
}
