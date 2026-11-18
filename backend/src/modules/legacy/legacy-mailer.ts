export type LegacyMailResult = { sent: boolean };

export interface LegacyMailer {
  sendBeneficiaryInvite(input: { email: string; beneficiaryName: string; ownerName: string }): Promise<LegacyMailResult>;
  sendVerifierLink(input: { email: string; policyName: string; token: string; expiresAt: Date }): Promise<LegacyMailResult>;
}

// Deliberately does not log or expose codes and tokens. Replace with the approved
// mail provider when one is configured.
export const legacyMailer: LegacyMailer = {
  async sendBeneficiaryInvite() { return { sent: false }; },
  async sendVerifierLink() { return { sent: false }; },
};
