import { ResendMailTransport } from './resend.transport';

const message = {
  to: 'user@example.com',
  subject: 'Reset your password',
  text: 'text',
  html: '<p>html</p>',
};

function build() {
  return new ResendMailTransport({
    apiKey: 're-readme',
    from: 'Arise KMS <no-reply@example.com>',
    publicUrl: 'http://localhost:5176',
  });
}

describe('ResendMailTransport', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('posts the message with a bearer token', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, text: async () => '' }));
    global.fetch = fetchMock as never;

    await build().send(message);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as never as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re-readme');
    expect(JSON.parse(init.body)).toMatchObject({
      to: ['user@example.com'],
      subject: 'Reset your password',
    });
  });

  it('throws with the provider reason on a non-2xx response', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 422,
      text: async () => 'domain not verified',
    })) as never;

    await expect(build().send(message)).rejects.toThrow(
      'Resend responded 422: domain not verified',
    );
  });

  it('bounds the request with a timeout', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, text: async () => '' }));
    global.fetch = fetchMock as never;

    await build().send(message);

    const init = (fetchMock.mock.calls[0] as never as [string, { signal: unknown }])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});