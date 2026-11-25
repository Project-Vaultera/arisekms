export default (): any => ({
  env: process.env.APP_ENV,
  port: process.env.APP_PORT,
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    // RDS enforces TLS; the CA is the RDS-managed one, so verification is
    // relaxed rather than bundling a certificate.
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    publicKey: Buffer.from(
      process.env.JWT_PUBLIC_KEY_BASE64!,
      'base64',
    ).toString('utf8'),
    privateKey: Buffer.from(
      process.env.JWT_PRIVATE_KEY_BASE64!,
      'base64',
    ).toString('utf8'),
    accessTokenExpiresInSec: parseInt(
      process.env.JWT_ACCESS_TOKEN_EXP_IN_SEC!,
      10,
    ),
    refreshTokenExpiresInSec: parseInt(
      process.env.JWT_REFRESH_TOKEN_EXP_IN_SEC!,
      10,
    ),
  },
  defaultAdminUserPassword: process.env.DEFAULT_ADMIN_USER_PASSWORD,
  throttle: {
    // On: the proxy in front appends the real peer to X-Forwarded-For and we
    // key on it. Off: the header is ignored (direct connections only).
    trustProxyHeaders: process.env.APP_TRUST_PROXY_HEADERS !== '0',
    // How many proxies we sit behind. 1 for Caddy or a bare ALB; 2 when a CDN
    // in front of the load balancer also appends. See client-ip.ts.
    trustedProxyHops: process.env.APP_TRUSTED_PROXY_HOPS
      ? parseInt(process.env.APP_TRUSTED_PROXY_HOPS, 10)
      : 1,
    enabled: process.env.APP_THROTTLE_ENABLED !== '0',
  },
});
