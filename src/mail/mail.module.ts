import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MailService } from './mail.service';
import { LogMailTransport, MAIL_TRANSPORT, MailTransport } from './mail.transport';
import { ResendMailTransport } from './resend.transport';

// `log` is the default on purpose: no provider is needed in dev, CI or demo,
// and a deployment opts in explicitly with MAIL_TRANSPORT=resend.
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailTransport => {
        const kind = config.get<string>('mail.transport') ?? 'log';
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