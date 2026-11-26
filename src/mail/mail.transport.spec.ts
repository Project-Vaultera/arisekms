import { LogMailTransport } from './mail.transport';

const message = {
  to: 'user@example.com',
  subject: 'Reset your password',
  text: 'Open http://localhost:5176/reset-password?token=abc123 to continue.',
  html: '<p>html</p>',
};

describe('LogMailTransport', () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  it('prints the link so it can be opened in dev', async () => {
    await new LogMailTransport().send(message);

    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toContain(
      'http://localhost:5176/reset-password?token=abc123',
    );
  });

  it('still logs when a message carries no link', async () => {
    await new LogMailTransport().send({ ...message, text: 'no link here' });

    // Trailing separator must not appear when there is nothing to append.
    expect(String(log.mock.calls[0][0])).toContain('to=user@example.com');
    expect(String(log.mock.calls[0][0])).not.toContain('link=');
  });
});