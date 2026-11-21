import { afterEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../config/environment.js';
import { legacyMailer, MailDeliveryError, validateMailConfiguration } from './legacy-mailer.js';

const original = {
  mailMode: environment.MAIL_MODE,
  mailProvider: environment.MAIL_PROVIDER,
  resendApiKey: environment.RESEND_API_KEY,
  mailFrom: environment.MAIL_FROM,
};
const delivered = 'delivered@resend.dev';
const bounced = 'bounced@resend.dev';
const response = (status: number, body: unknown = { id: 'email-test' }, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, headers });

function useResend() {
  environment.MAIL_MODE = 'send';
  environment.MAIL_PROVIDER = 'resend';
  environment.RESEND_API_KEY = 'test-resend-key';
  environment.MAIL_FROM = 'MemoSphere <no-reply@example.test>';
}

afterEach(() => {
  environment.MAIL_MODE = original.mailMode;
  environment.MAIL_PROVIDER = original.mailProvider;
  environment.RESEND_API_KEY = original.resendApiKey;
  environment.MAIL_FROM = original.mailFrom;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Resend mail provider', () => {
  it('sends HTTPS API payload with authorization, recipient array, reply-to and outbox idempotency key', async () => {
    useResend();
    const fetchMock = vi.fn().mockResolvedValue(response(200));
    vi.stubGlobal('fetch', fetchMock);
    const result = await legacyMailer.send({ template: 'invitation', email: delivered, subject: 'A MemoSphere invitation', preheader: 'Preview', heading: 'Invitation', body: 'No diary content.', replyTo: 'help@example.test', idempotencyKey: 'outbox-test-key' });
    expect(result).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST' }));
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toMatchObject({ Authorization: 'Bearer test-resend-key', 'Idempotency-Key': 'outbox-test-key' });
    expect(JSON.parse(String(request.body))).toMatchObject({ from: 'MemoSphere <no-reply@example.test>', to: [delivered], subject: 'A MemoSphere invitation', reply_to: 'help@example.test' });
  });

  it.each([
    [401, 'invalid key'],
    [403, 'unverified domain or test recipient'],
    [422, 'invalid address'],
  ])('classifies %s as a permanent provider failure (%s)', async (status) => {
    useResend();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(status)));
    await expect(legacyMailer.send({ template: 'invitation', email: bounced, subject: 'Test', preheader: '', heading: 'Test', body: 'Test' })).rejects.toMatchObject({ name: 'MailDeliveryError', kind: 'permanent', status });
  });

  it('honors Retry-After for 429 and then succeeds on retry', async () => {
    useResend();
    const fetchMock = vi.fn().mockResolvedValueOnce(response(429, { name: 'rate_limit_exceeded' }, { 'retry-after': '3' })).mockResolvedValueOnce(response(200));
    vi.stubGlobal('fetch', fetchMock);
    const input = { template: 'invitation' as const, email: delivered, subject: 'Test', preheader: '', heading: 'Test', body: 'Test', idempotencyKey: 'retry-key' };
    await expect(legacyMailer.send(input)).rejects.toMatchObject({ kind: 'rate_limit', retryAfterMs: 3000 });
    await expect(legacyMailer.send(input)).resolves.toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reuses the exact idempotency key after a transient retry', async () => {
    useResend();
    const fetchMock = vi.fn().mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200));
    vi.stubGlobal('fetch', fetchMock);
    const input = { template: 'release' as const, email: delivered, subject: 'Test', preheader: '', heading: 'Test', body: 'Test', idempotencyKey: 'release/outbox-123' };
    await expect(legacyMailer.send(input)).rejects.toMatchObject({ kind: 'transient' });
    await legacyMailer.send(input);
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).toMatchObject({ 'Idempotency-Key': 'release/outbox-123' });
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject({ 'Idempotency-Key': 'release/outbox-123' });
  });

  it('classifies the daily quota as a pause signal', async () => {
    useResend();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(429, { name: 'daily_quota_exceeded', message: 'Daily sending limit reached.' })));
    await expect(legacyMailer.send({ template: 'release', email: delivered, subject: 'Test', preheader: '', heading: 'Test', body: 'Test' })).rejects.toMatchObject({ kind: 'quota', status: 429 });
  });

  it('validates required Resend settings without exposing values', () => {
    expect(() => validateMailConfiguration({ ...environment, MAIL_PROVIDER: 'resend', RESEND_API_KEY: '', MAIL_FROM: '' })).toThrow('RESEND_API_KEY and MAIL_FROM');
  });

  it('log mode skips the network and masks links in output', async () => {
    useResend();
    environment.MAIL_MODE = 'log';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = await legacyMailer.sendBeneficiaryInvite({ email: delivered, beneficiaryName: 'Test User', ownerName: 'Test Owner', verifyUrl: 'https://example.test/verify?token=secret', declineUrl: 'https://example.test/decline?token=secret' });
    expect(result).toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(log.mock.calls[0]?.[0])).not.toContain('token=secret');
  });
});
