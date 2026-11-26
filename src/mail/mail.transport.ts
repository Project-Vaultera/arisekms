// Outbound mail, selected at boot by MAIL_TRANSPORT.
//
// Deliberately NOT keyed off APP_ENV. Staging and production differ in exactly
// one place (the seeding gate), so anything branching on APP_ENV would send or
// suppress live mail wrongly. `log` is the default so dev, CI and demo need no
// provider at all.
//
// Sends are fire-and-forget after the DB commit: a provider outage must not
// lose a token, and must not fail the request that created it.
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

// Never interpolate the token or the full link into a log line: it is a
// credential until it is used.
export class LogMailTransport implements MailTransport {
  async send(message: MailMessage): Promise<void> {
    const link = message.text.match(/https?:\/\/\S+/)?.[0] ?? '';
    console.log(
      `[mail] to=${message.to} subject="${message.subject}"${
        link ? ` link=${link}` : ''
      }`,
    );
  }
}