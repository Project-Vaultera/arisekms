export default (): any => ({
  env: process.env.APP_ENV,
  port: process.env.APP_PORT,
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
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
  // Public origin used to build mailed links. A wrong value means every link
  // 404s while the send still reports success, so Joi validates it as a URI.
  appPublicUrl: process.env.APP_PUBLIC_URL,
  mail: {
    transport: process.env.MAIL_TRANSPORT ?? 'log',
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM,
    smtpHost: process.env.MAIL_SMTP_HOST,
    smtpPort: process.env.MAIL_SMTP_PORT,
    smtpUser: process.env.MAIL_SMTP_USER,
    smtpPass: process.env.MAIL_SMTP_PASS,
  },
  throttle: {
    // On: Caddy appends the real peer to X-Forwarded-For and we key on it.
    // Off: the header is ignored for limiting (direct connections only).
    trustProxyHeaders: process.env.APP_TRUST_PROXY_HEADERS !== '0',
    enabled: process.env.APP_THROTTLE_ENABLED !== '0',
  },
});
