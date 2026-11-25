import { FORWARDED_FOR_TOKEN_HEADER } from '../../constants';
import {
  clientIpFromHeader,
  clientIpPrefix,
  resolveClientIp,
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