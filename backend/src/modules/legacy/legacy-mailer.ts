import { environment } from '../../config/environment.js';

export type LegacyMailResult = { sent: boolean };
export type LegacyMailTemplate = 'invitation' | 'owner_warning' | 'release' | 'owner_confirmation';
export type LegacyMailInput = {
  template: LegacyMailTemplate;
  email: string;
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  declineUrl?: string;
  requestId?: string;
  idempotencyKey?: string;
  replyTo?: string;
};

export class MailDeliveryError extends Error {
  constructor(message: string, readonly kind: 'permanent' | 'rate_limit' | 'quota' | 'transient', readonly retryAfterMs?: number, readonly status?: number) {
    super(message);
    this.name = 'MailDeliveryError';
  }
}

export function validateMailConfiguration(config = environment) {
  if (config.MAIL_PROVIDER === 'resend') {
    const missing = [!config.RESEND_API_KEY?.trim() ? 'RESEND_API_KEY' : '', !config.MAIL_FROM?.trim() ? 'MAIL_FROM' : ''].filter(Boolean);
    if (missing.length) throw new Error(`MAIL_PROVIDER=resend requires ${missing.join(' and ')} to be configured.`);
    const sender = config.MAIL_FROM!.trim();
    if (/[\r\n]/.test(sender)) throw new Error('MAIL_FROM must be a valid email address or display-name sender.');
    const match = /^(?:[^<>]*<([^<>]+)>|([^<>]+))$/.exec(sender);
    const address = (match?.[1] ?? match?.[2] ?? '').trim();
    if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address)) throw new Error('MAIL_FROM must be a valid email address or display-name sender.');
  }
  if (config.MAIL_PROVIDER === 'brevo' && (!config.BREVO_API_KEY || !config.MAIL_FROM_EMAIL)) throw new Error('MAIL_PROVIDER=brevo requires BREVO_API_KEY and MAIL_FROM_EMAIL to be configured.');
}

function retryAfterMilliseconds(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

export interface LegacyMailer {
  send(input: LegacyMailInput): Promise<LegacyMailResult>;
  sendBeneficiaryInvite(input: { email: string; beneficiaryName: string; ownerName: string; verifyUrl: string; declineUrl: string; requestId?: string; idempotencyKey?: string }): Promise<LegacyMailResult>;
  sendVerifierLink(input: { email: string; policyName: string; token: string; expiresAt: Date; idempotencyKey?: string }): Promise<LegacyMailResult>;
  sendOwnerWarning(input: { email: string; ownerName: string; beneficiaryName: string; releaseDate: Date; idempotencyKey?: string }): Promise<LegacyMailResult>;
  sendRelease(input: { email: string; ownerName: string; accessUrl: string; idempotencyKey?: string }): Promise<LegacyMailResult>;
  sendOwnerConfirmation(input: { email: string; ownerName: string; beneficiaryName: string; idempotencyKey?: string }): Promise<LegacyMailResult>;
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function appUrl(path: string) {
  return new URL(path, environment.APP_BASE_URL ?? environment.FRONTEND_URL).toString();
}

function render(input: LegacyMailInput) {
  const safeBody = escapeHtml(input.body);
  const action = input.actionUrl
    ? `<tr><td style="padding:24px 32px 8px"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:13px 20px;background:#5b6cff;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700">${escapeHtml(input.actionLabel ?? 'Open MemoSphere')}</a></td></tr>`
    : '';
  const decline = input.template === 'invitation' && input.declineUrl ? `<p style="margin:12px 32px"><a href="${escapeHtml(input.declineUrl)}" style="color:#6b7280">Decline this invitation</a></p>` : '';
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6ff;font-family:Arial,sans-serif;color:#101638"><div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:14px;overflow:hidden"><div style="height:6px;background:#5b6cff"></div><table role="presentation" width="100%" cellspacing="0"><tr><td style="padding:28px 32px 8px"><h1 style="margin:0;font-size:24px">${escapeHtml(input.heading)}</h1></td></tr><tr><td style="padding:12px 32px;color:#4b5563;font-size:16px;line-height:1.6">${safeBody}</td></tr>${action}<tr><td>${decline}</td></tr><tr><td style="padding:24px 32px;color:#6b7280;font-size:13px">You received this email because an owner in MemoSphere named you as a beneficiary or chose to notify you. <a href="${escapeHtml(appUrl('/report-email'))}" style="color:#5b6cff">I don't know this person / report this</a></td></tr></table></div></body></html>`;
  const text = `${input.heading}\n\n${input.body}${input.actionUrl ? `\n\n${input.actionLabel ?? 'Open MemoSphere'}: ${input.actionUrl}` : ''}\n\nWhy: an owner in MemoSphere named you as a beneficiary or chose to notify you.\nReport: ${appUrl('/report-email')}`;
  return { html, text };
}

export const legacyMailer: LegacyMailer = {
  async send(input) {
    if (environment.MAIL_MODE === 'log') {
      console.info(JSON.stringify({ level: 'info', event: 'mail_request_skipped', provider: environment.MAIL_PROVIDER, requestId: input.requestId ?? 'unassigned', reason: 'MAIL_MODE_LOG' }));
      const rendered = render(input);
      const safeText = rendered.text.replace(/https?:\/\/[^\s]+/g, '[LINK]');
      console.log(JSON.stringify({ mail: 'log-mode', template: input.template, subject: input.subject, text: safeText }));
      return { sent: true };
    }
    if (environment.MAIL_PROVIDER === 'log') {
      const rendered = render(input);
      console.log(JSON.stringify({ mail: 'log-mode', template: input.template, subject: input.subject, text: rendered.text.replace(/https?:\/\/[^\s]+/g, '[LINK]') }));
      return { sent: true };
    }
    validateMailConfiguration();
    const rendered = render(input);
    let response: Response;
    console.info(JSON.stringify({ level: 'info', event: 'mail_request_initiated', provider: environment.MAIL_PROVIDER, requestId: input.requestId ?? 'unassigned', template: input.template }));
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const resend = environment.MAIL_PROVIDER === 'resend';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (resend) {
          headers.Authorization = `Bearer ${environment.RESEND_API_KEY}`;
          if (input.idempotencyKey) headers['Idempotency-Key'] = input.idempotencyKey;
        } else headers['api-key'] = environment.BREVO_API_KEY!;
        const body = resend
          ? { from: environment.MAIL_FROM, to: [input.email], subject: input.subject, html: rendered.html, text: rendered.text, ...(input.replyTo ? { reply_to: input.replyTo } : {}) }
          : { sender: { email: environment.MAIL_FROM_EMAIL, name: environment.MAIL_FROM_NAME }, to: [{ email: input.email }], subject: input.subject, htmlContent: rendered.html, textContent: rendered.text };
        response = await fetch(resend ? 'https://api.resend.com/emails' : 'https://api.brevo.com/v3/smtp/email', { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(JSON.stringify({ level: 'error', event: 'mail_request_failed', provider: environment.MAIL_PROVIDER, requestId: input.requestId ?? 'unassigned', reason: 'timeout' }));
        throw new MailDeliveryError(`${environment.MAIL_PROVIDER} request timed out.`, 'transient');
      }
      console.error(JSON.stringify({ level: 'error', event: 'mail_request_failed', provider: environment.MAIL_PROVIDER, requestId: input.requestId ?? 'unassigned', reason: 'network_error' }));
      throw new MailDeliveryError(`${environment.MAIL_PROVIDER} network request failed.`, 'transient');
    }
    console.info(JSON.stringify({ level: 'info', event: 'mail_response_received', provider: environment.MAIL_PROVIDER, requestId: input.requestId ?? 'unassigned', status: response.status, ok: response.ok }));
    if (!response.ok) {
      if (environment.MAIL_PROVIDER === 'resend') {
        if (response.status === 401 || response.status === 403) throw new MailDeliveryError('Resend rejected the API key, sender domain, or test-mode recipient; check provider configuration.', 'permanent', undefined, response.status);
        if (response.status === 422) throw new MailDeliveryError('Resend rejected the recipient address.', 'permanent', undefined, response.status);
        if (response.status === 429) {
          let quota = false;
          try { const result = await response.clone().json() as { name?: unknown; message?: unknown }; const diagnostic = `${String(result.name ?? '')} ${String(result.message ?? '')}`.toLowerCase(); quota = /daily[_\s-]*(?:quota|limit)|quota[_\s-]*(?:exceeded|reached)|email[_\s-]*limit/.test(diagnostic) || (diagnostic.includes('daily') && diagnostic.includes('sending limit')); } catch { /* Do not log provider response content. */ }
          if (quota) throw new MailDeliveryError('Resend daily sending quota reached.', 'quota', retryAfterMilliseconds(response.headers.get('retry-after')), response.status);
          throw new MailDeliveryError('Resend is temporarily rate-limited.', 'rate_limit', retryAfterMilliseconds(response.headers.get('retry-after')), response.status);
        }
        if (response.status >= 500) throw new MailDeliveryError(`Resend request failed with status ${response.status}.`, 'transient', undefined, response.status);
      } else {
        if (response.status === 401 || response.status === 403 || response.status === 422) throw new MailDeliveryError(`Brevo rejected the request with status ${response.status}.`, 'permanent', undefined, response.status);
        if (response.status === 429) throw new MailDeliveryError('Brevo is temporarily rate-limited.', 'rate_limit', retryAfterMilliseconds(response.headers.get('retry-after')), response.status);
        if (response.status >= 500) throw new MailDeliveryError(`Brevo request failed with status ${response.status}.`, 'transient', undefined, response.status);
      }
      throw new MailDeliveryError(`${environment.MAIL_PROVIDER} request failed with status ${response.status}.`, 'transient', undefined, response.status);
    }
    return { sent: true };
  },
  async sendBeneficiaryInvite(input) {
    const result = await this.send({
      template: 'invitation',
      email: input.email,
      subject: `${input.ownerName} invited you to MemoSphere`,
      preheader: 'You were named as a trusted beneficiary.',
      heading: 'A trusted invitation',
      body: `${input.ownerName} invited you to MemoSphere and named you as a beneficiary. Verify your email to continue. This link is single-use and expires in 7 days.`,
      actionUrl: input.verifyUrl,
      actionLabel: 'Verify my email',
      declineUrl: input.declineUrl,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
    });
    return environment.MAIL_MODE === 'log' || environment.MAIL_PROVIDER === 'log' ? { sent: false } : result;
  },
  async sendVerifierLink(input) {
    const url = appUrl(`/verify-email?token=${encodeURIComponent(input.token)}&purpose=verifier`);
    return this.send({ template: 'owner_warning', email: input.email, subject: 'A MemoSphere release needs verification', preheader: 'A trusted release step was requested.', heading: 'Verify this release step', body: `You were asked to verify release confirmation for a MemoSphere policy. This link expires ${input.expiresAt.toISOString()} and can only be used once.`, actionUrl: url, actionLabel: 'Verify release request', idempotencyKey: input.idempotencyKey });
  },
  async sendOwnerWarning(input) {
    return this.send({ template: 'owner_warning', email: input.email, subject: 'Scheduled MemoSphere release reminder', preheader: 'A beneficiary will be notified on the scheduled date.', heading: 'A scheduled release is approaching', body: `${input.beneficiaryName} will be emailed on ${input.releaseDate.toLocaleString()} unless you pause, postpone, or cancel the policy.`, actionUrl: appUrl('/legacy-policy'), actionLabel: 'Review policy', idempotencyKey: input.idempotencyKey });
  },
  async sendRelease(input) {
    return this.send({ template: 'release', email: input.email, subject: 'The date chosen in MemoSphere has arrived', preheader: 'A scheduled date has arrived.', heading: 'A scheduled date has arrived', body: 'The date the owner chose has arrived. They asked us to let you know that something has been shared with you.', actionUrl: input.accessUrl, actionLabel: 'Open secure access', idempotencyKey: input.idempotencyKey });
  },
  async sendOwnerConfirmation(input) {
    return this.send({ template: 'owner_confirmation', email: input.email, subject: 'The beneficiary email was sent', preheader: 'Your scheduled release email was delivered.', heading: 'Beneficiary notification sent', body: `${input.beneficiaryName} was sent the scheduled MemoSphere notification.`, actionUrl: appUrl('/legacy-policy'), actionLabel: 'Review policy', idempotencyKey: input.idempotencyKey });
  },
};
