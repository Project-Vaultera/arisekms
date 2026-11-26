import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { inviteMail, passwordResetMail, RenderedMail } from './mail.templates';
import { MAIL_TRANSPORT, MailTransport } from './mail.transport';

export const RESET_TOKEN_TTL_MINUTES = 60;
export const INVITE_TOKEN_TTL_HOURS = 48;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly publicUrl: string;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    config: ConfigService,
  ) {
    this.publicUrl = (config.get<string>('appPublicUrl') ?? '').replace(
      /\/+$/,
      '',
    );
  }

  resetUrl(token: string): string {
    return `${this.publicUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  inviteUrl(token: string): string {
    return `${this.publicUrl}/accept-invite?token=${encodeURIComponent(token)}`;
  }

  async sendPasswordReset(
    name: string,
    to: string,
    token: string,
  ): Promise<void> {
    await this.deliver(
      to,
      passwordResetMail(name, this.resetUrl(token), RESET_TOKEN_TTL_MINUTES),
    );
  }

  async sendInvite(name: string, to: string, token: string): Promise<void> {
    await this.deliver(
      to,
      inviteMail(name, this.inviteUrl(token), INVITE_TOKEN_TTL_HOURS),
    );
  }

  // Never throws: the token is already committed when this runs, so a provider
  // failure must not turn a successful request into an error.
  private async deliver(to: string, rendered: RenderedMail): Promise<void> {
    try {
      await this.transport.send({ to, ...rendered });
    } catch (error) {
      // Neither the token nor the link: it is a credential until used.
      this.logger.error(
        `mail delivery failed to ${to} for "${rendered.subject}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}