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
};

export interface LegacyMailer {
  send(input: LegacyMailInput): Promise<LegacyMailResult>;
  sendBeneficiaryInvite(input: { email: string; beneficiaryName: string; ownerName: string; verifyUrl: string; declineUrl: string }): Promise<LegacyMailResult>;
  sendVerifierLink(input: { email: string; policyName: string; token: string; expiresAt: Date }): Promise<LegacyMailResult>;
  sendOwnerWarning(input: { email: string; ownerName: string; beneficiaryName: string; releaseDate: Date }): Promise<LegacyMailResult>;
  sendRelease(input: { email: string; ownerName: string; accessUrl: string }): Promise<LegacyMailResult>;
  sendOwnerConfirmation(input: { email: string; ownerName: string; beneficiaryName: string }): Promise<LegacyMailResult>;
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
      const rendered = render(input);
      const safeText = rendered.text.replace(/https?:\/\/[^\s]+/g, '[LINK]');
      console.log(JSON.stringify({ mail: 'log-mode', template: input.template, subject: input.subject, text: safeText }));
      return { sent: true };
    }
    if (!environment.BREVO_API_KEY || !environment.MAIL_FROM_EMAIL) throw new Error('Brevo mail is not configured.');
    const rendered = render(input);
    let response: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': environment.BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { email: environment.MAIL_FROM_EMAIL, name: environment.MAIL_FROM_NAME },
            to: [{ email: input.email }],
            subject: input.subject,
            htmlContent: rendered.html,
            textContent: rendered.text,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('Brevo request timed out.');
      throw new Error('Brevo network request failed.');
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('Brevo rejected the API credentials or sender.');
      if (response.status === 429) throw new Error('Brevo is temporarily rate-limited.');
      throw new Error(`Brevo request failed with status ${response.status}.`);
    }
    return { sent: true };
  },
  async sendBeneficiaryInvite(input) {
    return this.send({
      template: 'invitation',
      email: input.email,
      subject: `${input.ownerName} invited you to MemoSphere`,
      preheader: 'You were named as a trusted beneficiary.',
      heading: 'A trusted invitation',
      body: `${input.ownerName} invited you to MemoSphere and named you as a beneficiary. Verify your email to continue. This link is single-use and expires in 7 days.`,
      actionUrl: input.verifyUrl,
      actionLabel: 'Verify my email',
      declineUrl: input.declineUrl,
    });
  },
  async sendVerifierLink(input) {
    const url = appUrl(`/verify-email?token=${encodeURIComponent(input.token)}&purpose=verifier`);
    return this.send({ template: 'owner_warning', email: input.email, subject: 'A MemoSphere release needs verification', preheader: 'A trusted release step was requested.', heading: 'Verify this release step', body: `You were asked to verify release confirmation for a MemoSphere policy. This link expires ${input.expiresAt.toISOString()} and can only be used once.`, actionUrl: url, actionLabel: 'Verify release request' });
  },
  async sendOwnerWarning(input) {
    return this.send({ template: 'owner_warning', email: input.email, subject: 'Scheduled MemoSphere release reminder', preheader: 'A beneficiary will be notified on the scheduled date.', heading: 'A scheduled release is approaching', body: `${input.beneficiaryName} will be emailed on ${input.releaseDate.toLocaleString()} unless you pause, postpone, or cancel the policy.`, actionUrl: appUrl('/legacy-policy'), actionLabel: 'Review policy' });
  },
  async sendRelease(input) {
    return this.send({ template: 'release', email: input.email, subject: 'The date chosen in MemoSphere has arrived', preheader: 'A scheduled date has arrived.', heading: 'A scheduled date has arrived', body: 'The date the owner chose has arrived. They asked us to let you know that something has been shared with you.', actionUrl: input.accessUrl, actionLabel: 'Open secure access' });
  },
  async sendOwnerConfirmation(input) {
    return this.send({ template: 'owner_confirmation', email: input.email, subject: 'The beneficiary email was sent', preheader: 'Your scheduled release email was delivered.', heading: 'Beneficiary notification sent', body: `${input.beneficiaryName} was sent the scheduled MemoSphere notification.`, actionUrl: appUrl('/legacy-policy'), actionLabel: 'Review policy' });
  },
};
