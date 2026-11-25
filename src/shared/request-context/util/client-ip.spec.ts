import { FORWARDED_FOR_TOKEN_HEADER } from '../../constants';
import {
  clientIpFromHeader,
  clientIpPrefix,
  DEFAULT_TRUSTED_PROXY_HOPS,
  resolveClientIp,
  setTrustedProxyHops,
  UNKNOWN_CLIENT_IP,
} from './client-ip';

describe('client IP resolution', () => {
  it('takes the right-most hop, which is the one Caddy appended', () => {
    expect(clientIpFromHeader('10.0.0.1, 203.0.113.5')).toBe('203.0.113.5');
  });

  it('ignores a spoofed prefix', () => {
    // The client sent the first value itself; only the last one is trustworthy.
    expect(clientIpFromHeader('9.9.9.9, 203.0.113.5')).toBe('203.0.113.5');
  });

  it('tolerates spacing, empties and a missing header', () => {
    expect(clientIpFromHeader(' 203.0.113.5 ')).toBe('203.0.113.5');
    expect(clientIpFromHeader('a,,b')).toBe('b');
    expect(clientIpFromHeader('')).toBeUndefined();
    expect(clientIpFromHeader(undefined)).toBeUndefined();
  });

  it('walks back the configured number of proxies', () => {
    // Cloudflare in front of the load balancer: the ALB appended the CDN edge,
    // so the caller is one further left.
    expect(clientIpFromHeader('203.0.113.5, 198.51.100.7', 2)).toBe(
      '203.0.113.5',
    );
    // A spoofed prefix still cannot shift a right-anchored count.
    expect(clientIpFromHeader('9.9.9.9, 203.0.113.5, 198.51.100.7', 2)).toBe(
      '203.0.113.5',
    );
  });

  it('ignores a header shorter than the trusted chain', () => {
    // Direct-to-app request carrying a hand-written value: not from our
    // proxies, so it must not be trusted at all.
    expect(clientIpFromHeader('9.9.9.9', 2)).toBeUndefined();
    const request = {
      header: (name: string) =>
        name === FORWARDED_FOR_TOKEN_HEADER ? '9.9.9.9' : undefined,
      ip: '10.0.0.4',
      socket: { remoteAddress: '10.0.0.4' },
    };
    expect(resolveClientIp(request, 2)).toBe('10.0.0.4');
  });

  it('defaults to one hop and never trusts a nonsense depth', () => {
    expect(clientIpFromHeader('203.0.113.5')).toBe('203.0.113.5');
    setTrustedProxyHops(Number.NaN);
    expect(clientIpFromHeader('1.1.1.1, 203.0.113.5')).toBe('203.0.113.5');
    setTrustedProxyHops(0);
    expect(clientIpFromHeader('1.1.1.1, 203.0.113.5')).toBe('203.0.113.5');
    setTrustedProxyHops(DEFAULT_TRUSTED_PROXY_HOPS);
  });

  it('prefers the forwarded hop, then the socket, then unknown', () => {
    const make = (forwarded?: string, ip?: string, remote?: string) => ({
      header: (name: string) =>
        name === FORWARDED_FOR_TOKEN_HEADER ? forwarded : undefined,
      ip,
      socket: { remoteAddress: remote },
    });
    expect(resolveClientIp(make('1.2.3.4'))).toBe('1.2.3.4');
    expect(resolveClientIp(make(undefined, '5.6.7.8'))).toBe('5.6.7.8');
    expect(resolveClientIp(make(undefined, undefined, '9.9.9.9'))).toBe(
      '9.9.9.9',
    );
    expect(resolveClientIp(make())).toBe(UNKNOWN_CLIENT_IP);
  });

  it('keeps three octets of IPv4 and three hextets of IPv6', () => {
    expect(clientIpPrefix('203.0.113.5')).toBe('203.0.113.0/24');
    expect(clientIpPrefix('::ffff:203.0.113.5')).toBe('203.0.113.0/24');
    expect(clientIpPrefix('2001:db8:abcd:12::1')).toBe('2001:db8:abcd::/48');
    // compressed :: collapses, so the hextets are still taken in order
    expect(clientIpPrefix('fe80::1%eth0')).toBe('fe80:1::/48');
  });

  it('leaves an unidentified client unidentified', () => {
    expect(clientIpPrefix(UNKNOWN_CLIENT_IP)).toBe(UNKNOWN_CLIENT_IP);
  });
});