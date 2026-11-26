import { MailMessage, MailTransport } from './mail.transport';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;

interface ResendOptions {
  apiKey: string;
  from: string;
  publicUrl: string;
}

// Server-side call to Resend. HTTPS only, which is the reason this provider was
// chosen: port 25 is unreliable from the VPS, and a relay with an API key needs
// no outbound SMTP.
export class ResendMailTransport implements MailTransport {
  constructor(private readonly options: ResendOptions) {}

  async send(message: MailMessage): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.options.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        // Body carries the provider's reason (unverified domain, bad key). No
        // token in it.
        const body = await response.text().catch(() => '');
        throw new Error(
          `Resend responded ${response.status}: ${body.slice(0, 300)}`,
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }
}