import { Logger } from '@nestjs/common';

import { MailService } from './mail.service';
import { MailMessage, MailTransport } from './mail.transport';

function build(send: jest.Mock) {
  const transport = { send } as unknown as MailTransport;
  const config = {
    get: jest.fn((key: string) =>
      key === 'appPublicUrl' ? 'http://localhost:5176' : undefined,
    ),
  };
  return new MailService(transport, config as never);
}

describe('MailService', () => {
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => errorLog.mockRestore());

  it('builds an encoded reset link from the configured origin', async () => {
    const send = jest.fn(async (m: MailMessage) => { void m; });
    await build(send).sendPasswordReset('Ann', 'ann@example.com', 'a+b/c');

    const message = send.mock.calls[0][0]!;
    expect(message.to).toBe('ann@example.com');
    expect(message.text).toContain(
      'http://localhost:5176/reset-password?token=a%2Bb%2Fc',
    );
  });

  it('builds an accept link for invites', async () => {
    const send = jest.fn(async (m: MailMessage) => { void m; });
    await build(send).sendInvite('Ann', 'ann@example.com', 'tok');

    expect(send.mock.calls[0][0]!.text).toContain(
      'http://localhost:5176/accept-invite?token=tok',
    );
  });

  it('swallows a transport failure, because the token is already committed', async () => {
    const send = jest.fn(async (m: MailMessage) => {
    void m;
      throw new Error('provider down');
    });

    await expect(
      build(send).sendPasswordReset('Ann', 'ann@example.com', 'tok'),
    ).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  it('does not leak the token into the failure log', async () => {
    const send = jest.fn(async (m: MailMessage) => {
    void m;
      throw new Error('provider down');
    });

    await build(send).sendPasswordReset('Ann', 'ann@example.com', 'secret-token');

    expect(String(errorLog.mock.calls[0][0])).not.toContain('secret-token');
  });
});