'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { ApiError, authService, beneficiaryPortalService, legacyPolicyService } from '@/services/api';

type VerifierInvitation = Awaited<ReturnType<typeof beneficiaryPortalService.verifier>>;

export default function VerifierInvitationPage() {
  const [token, setToken] = useState('');
  const [invitation, setInvitation] = useState<VerifierInvitation | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token') ?? '';
    setToken(value);
    if (!value) { setError('This verifier link is invalid or expired.'); setLoading(false); return; }
    beneficiaryPortalService.verifier(value).then(setInvitation).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'This verifier link is invalid or expired.')).finally(() => setLoading(false));
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!invitation) return;
    setBusy(true); setError('');
    try { await authService.login({ email: invitation.email, password }); await legacyPolicyService.confirmVerifier(token); window.location.assign('/beneficiary-portal'); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'We could not verify this release request. Check your account and try again.'); }
    finally { setBusy(false); }
  };
  return <AuthShell eyebrow="Trusted verifier" title={loading ? 'Checking verification link…' : invitation ? 'Confirm a release request' : 'Verifier link unavailable'} description={invitation ? `${invitation.ownerName} selected you to verify the release request for “${invitation.policyName}”. This confirmation starts the policy’s cooling-off period; it does not immediately reveal diary content.` : 'Use the secure link from the verifier email.'} footer={<span>Need an account? <Link href="/register">Create a MemoSphere account</Link></span>}>
    {loading ? <p role="status">Checking the verifier link…</p> : invitation ? <form className="auth-form" onSubmit={(event) => void submit(event)}><p className="portal-invite-email">Sign in as <strong>{invitation.email}</strong></p><label className="form-field"><span>Password</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="field-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Confirming…' : 'Sign in and confirm'}</button></form> : <div className="auth-error" role="alert">{error || 'This verifier link is invalid or expired.'}</div>}
  </AuthShell>;
}
