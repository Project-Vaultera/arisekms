import { createTransport, Transporter } from 'nodemailer';

import { MailMessage, MailTransport } from './mail.transport';

interface SmtpOptions {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

// Plain SMTP. Used for a local catcher (Mailpit) in development and for any
// relay whose only interface is SMTP. Production against Resend uses the HTTP
// transport instead, because port 25 is unreliable from the VPS.
export class SmtpMailTransport implements MailTransport {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(options: SmtpOptions) {
    this.from = options.from;
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      // Mailpit speaks plain SMTP; a relay on 587 needs STARTTLS.
      secure: options.port === 465,
      auth: options.user
        ? { user: options.user, pass: options.pass ?? '' }
        : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}