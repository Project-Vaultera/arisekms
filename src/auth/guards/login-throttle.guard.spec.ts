import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FORWARDED_FOR_TOKEN_HEADER } from '../../shared/constants';
import { LoginThrottleGuard, resetLoginThrottle } from './login-throttle.guard';

// A request as the guard sees it. `forwarded` mimics Caddy appending the peer:
// anything before the last hop is what the client sent itself.
function contextFor(options: {
  ip?: string;
  forwarded?: string;
  username?: string;
  route?: string;
}) {
  const headers: Record<string, string | undefined> = {
    [FORWARDED_FOR_TOKEN_HEADER]: options.forwarded,
  };
  // setHeader is what Express actually exposes on the response.
  const sent: Record<string, string> = {};
  const response = {
    sent,
    setHeader: (name: string, value: string) => {
      sent[name.toLowerCase()] = value;
    },
  };
  const request = {
    ip: options.ip,
    socket: { remoteAddress: options.ip },
    route: { path: options.route ?? '/login' },
    body: { username: options.username, password: 'x' },
    header: (name: string) => headers[name],
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, response };
}

function guard(overrides: Record<string, unknown> = {}) {
  const config = {
    get: (key: string) => overrides[key],
  } as unknown as ConfigService;
  return new LoginThrottleGuard(config);
}

// Attempts are counted, so the (max + 1)th attempt from the same key trips.
const attempt = (
  g: LoginThrottleGuard,
  options: Parameters<typeof contextFor>[0],
) => g.canActivate(contextFor(options).context);

describe('LoginThrottleGuard', () => {
  beforeEach(() => resetLoginThrottle());

  it('lets a single client through under the per-pair limit', () => {
    const g = guard();
    for (let i = 0; i < 10; i++) {
      expect(attempt(g, { forwarded: '203.0.113.5', username: 'ann' })).toBe(
        true,
      );
    }
  });

  it('does not let one client starve another (the #20 regression)', () => {
    const g = guard();
    for (let i = 0; i < 12; i++) {
      try {
        attempt(g, { forwarded: '203.0.113.5', username: 'ann' });
      } catch {
        // ann is over her own budget; bob must still get in
      }
    }
    expect(attempt(g, { forwarded: '198.51.100.9', username: 'bob' })).toBe(
      true,
    );
  });

  it('limits a username per address before the username net trips', () => {
    const g = guard();
    for (let i = 0; i < 10; i++) {
      attempt(g, { forwarded: '203.0.113.5', username: 'ann' });
    }
    expect(() =>
      attempt(g, { forwarded: '203.0.113.5', username: 'ann' }),
    ).toThrow(HttpException);
    // a different address may still try the same account
    expect(attempt(g, { forwarded: '198.51.100.9', username: 'ann' })).toBe(
      true,
    );
  });

  it('returns 429 with Retry-After once the pair budget is spent', () => {
    const g = guard();
    for (let i = 0; i < 10; i++) {
      attempt(g, { forwarded: '203.0.113.5', username: 'ann' });
    }
    const { context, response } = contextFor({
      forwarded: '203.0.113.5',
      username: 'ann',
    });
    let status: unknown;
    expect(() => {
      try {
        g.canActivate(context);
      } catch (error) {
        status = (error as HttpException).getStatus();
        throw error;
      }
    }).toThrow(HttpException);
    expect(status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(Number(response.sent['retry-after'])).toBeGreaterThan(0);
    expect(Number(response.sent['retry-after'])).toBeLessThanOrEqual(60);
  });

  it('keys on the right-most hop, so a spoofed prefix cannot reset it', () => {
    const g = guard();
    // The caller swaps the value it prepends; Caddy's appended peer holds.
    for (let i = 0; i < 10; i++) {
      attempt(g, { forwarded: `10.0.0.${i}, 203.0.113.5`, username: 'ann' });
    }
    expect(() =>
      attempt(g, { forwarded: '10.9.9.9, 203.0.113.5', username: 'ann' }),
    ).toThrow(HttpException);
  });

  it('widens a flooding address to its /24', () => {
    const g = guard();
    for (let i = 0; i < 30; i++) {
      attempt(g, { forwarded: '203.0.113.5', username: `u${i}` });
    }
    expect(() => attempt(g, { forwarded: '203.0.113.5', username: 'x' })).toThrow(
      HttpException,
    );
    // a neighbour in the same /24 is now counted with it...
    expect(() => attempt(g, { forwarded: '203.0.113.6', username: 'y' })).toThrow(
      HttpException,
    );
    // ...while another /24 is unaffected
    expect(attempt(g, { forwarded: '198.51.100.7', username: 'z' })).toBe(true);
  });

  it('keeps the flooder widened for the window, then releases', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-25T00:00:00Z'));
    try {
      const g = guard();
      // 31 attempts: the last one trips and widens.
      for (let i = 0; i < 30; i++) {
        attempt(g, { forwarded: '203.0.113.5', username: `u${i}` });
      }
      expect(() =>
        attempt(g, { forwarded: '203.0.113.5', username: 'spill' }),
      ).toThrow(HttpException);
      // The owner does not regain a fresh per-address allowance.
      expect(() =>
        attempt(g, { forwarded: '203.0.113.5', username: 'again' }),
      ).toThrow(HttpException);
      jest.setSystemTime(new Date('2026-11-25T00:01:05Z'));
      expect(attempt(g, { forwarded: '203.0.113.5', username: 'later' })).toBe(
        true,
      );
      expect(attempt(g, { forwarded: '203.0.113.6', username: 'later' })).toBe(
        true,
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses a tighter budget for registration', () => {
    const g = guard();
    for (let i = 0; i < 20; i++) {
      attempt(g, { ip: '203.0.113.5', route: '/register' });
    }
    expect(() =>
      attempt(g, { ip: '203.0.113.5', route: '/register' }),
    ).toThrow(HttpException);
    // login shares the address but not the register budget
    expect(attempt(g, { ip: '203.0.113.5', username: 'ann' })).toBe(true);
  });

  it('ignores the header when the proxy is untrusted', () => {
    const g = guard({ 'throttle.trustProxyHeaders': false });
    for (let i = 0; i < 10; i++) {
      attempt(g, {
        ip: '203.0.113.5',
        forwarded: `9.9.9.${i}`,
        username: 'ann',
      });
    }
    expect(() =>
      attempt(g, { ip: '203.0.113.5', forwarded: '1.1.1.1', username: 'ann' }),
    ).toThrow(HttpException);
  });

  it('is bypassed entirely when disabled', () => {
    const g = guard({ 'throttle.enabled': false });
    for (let i = 0; i < 100; i++) {
      expect(attempt(g, { forwarded: '203.0.113.5', username: 'ann' })).toBe(
        true,
      );
    }
  });

  it('lets requests through when the client cannot be identified', () => {
    const g = guard();
    for (let i = 0; i < 50; i++) {
      expect(attempt(g, { username: 'ann' })).toBe(true);
    }
  });
});