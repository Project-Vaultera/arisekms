import { FORWARDED_FOR_TOKEN_HEADER } from '../../constants';

// One answer to "who is calling", shared by the request logs, the auth throttle
// and the audit trail.
//
// Caddy *appends* the peer to X-Forwarded-For, so the right-most entry is the
// one Caddy saw and everything to its left is client-supplied. Reading the
// left-most entry is the classic bypass: a client picks a fresh value per
// request and every counter resets.
export const UNKNOWN_CLIENT_IP = 'unknown';

// Deliberately structural rather than Express's Request, so the guard and the
// logging middleware can both use it without dragging Express types along.
export interface HasForwardingHeaders {
  header(name: string): string | undefined;
  ip?: string;
  socket?: { remoteAddress?: string };
}

export function clientIpFromHeader(
  forwardedFor: string | undefined,
): string | undefined {
  const hops = (forwardedFor ?? '')
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean);
  return hops.length ? hops[hops.length - 1] : undefined;
}

export function resolveClientIp(request: HasForwardingHeaders): string {
  return (
    clientIpFromHeader(request.header(FORWARDED_FOR_TOKEN_HEADER)) ??
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