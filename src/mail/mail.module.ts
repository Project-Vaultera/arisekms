import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { MailService } from './mail.service';
import { LogMailTransport, MAIL_TRANSPORT, MailTransport } from './mail.transport';
import { ResendMailTransport } from './resend.transport';
import { SmtpMailTransport } from './smtp.transport';

// `log` is the default on purpose: no provider is needed in dev, CI or demo,
// and a deployment opts in explicitly with MAIL_TRANSPORT=resend.
@Module({
  // ConfigService is not global (SharedModule calls forRoot), so the injecting
  // factory must have ConfigModule in scope or DI fails at boot.
  imports: [ConfigModule],
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailTransport => {
        const kind = config.get<string>('mail.transport') ?? 'log';
        if (kind === 'smtp') {
          return new SmtpMailTransport({
            host: config.get<string>('mail.smtpHost') ?? 'localhost',
            port: Number(config.get<string>('mail.smtpPort') ?? 1025),
            user: config.get<string>('mail.smtpUser'),
            pass: config.get<string>('mail.smtpPass'),
            from: config.get<string>('mail.from') ?? 'Arise KMS <no-reply@localhost>',
          });
        }
        if (kind !== 'resend') {
          return new LogMailTransport();
        }
        return new ResendMailTransport({
          apiKey: config.get<string>('mail.resendApiKey') ?? '',
          from: config.get<string>('mail.from') ?? '',
          publicUrl: config.get<string>('appPublicUrl') ?? '',
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}