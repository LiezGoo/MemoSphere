'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { ApiError, authService, beneficiaryPortalService } from '@/services/api';

type Invitation = Awaited<ReturnType<typeof beneficiaryPortalService.invitation>>;

export default function BeneficiaryInvitationPage() {
  const [token, setToken] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const invitationToken = new URLSearchParams(window.location.search).get('token') ?? '';
    setToken(invitationToken);
    if (!invitationToken) { setError('This invitation link is invalid or expired.'); setLoading(false); return; }
    beneficiaryPortalService.invitation(invitationToken)
      .then(setInvitation)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'This invitation link is invalid or expired.'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitation) return;
    setBusy(true); setError('');
    try {
      if (mode === 'register') {
        await beneficiaryPortalService.registerAndAccept(token, password, confirmPassword);
      } else {
        await authService.login({ email: invitation.email, password });
        await beneficiaryPortalService.accept(token);
      }
      window.location.assign('/beneficiary-portal');
    } catch (reason) {
      const message = reason instanceof ApiError ? reason.message : 'We could not accept this invitation. Check the link and try again.';
      setError(message);
      if (mode === 'register' && /already exists/i.test(message)) setMode('login');
    } finally { setBusy(false); }
  };

  return <AuthShell eyebrow="A trusted invitation" title={loading ? 'Checking your invitation…' : invitation ? `Welcome, ${invitation.fullName}.` : 'Invitation unavailable'} description={invitation ? `${invitation.ownerName} invited you as ${invitation.relationship || 'a trusted beneficiary'}. Accepting connects your account; access to memories remains pending until the owner’s legacy policy is released.` : 'Use the secure link from the invitation email.'} footer={<span>Already have MemoSphere? <button type="button" className="inline-link" onClick={() => setMode('login')}>Sign in</button></span>}>
    {loading ? <p role="status">Checking the invitation link…</p> : invitation ? <>
      <div className="portal-auth-switch" role="tablist" aria-label="Account options">
        <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
        <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
      </div>
      <p className="portal-invite-email">Invitation for <strong>{invitation.email}</strong></p>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label className="form-field"><span>Password</span><input required type="password" minLength={8} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {mode === 'register' && <label className="form-field"><span>Confirm password</span><input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Accepting invitation…' : mode === 'register' ? 'Create account and accept' : 'Sign in and accept'}</button>
      </form>
      <p className="portal-privacy-note">Your invitation link verifies the invited email address. It does not unlock diary content by itself.</p>
    </> : <div className="auth-error" role="alert">{error || 'This invitation is invalid or expired.'}<p><Link href="/login">Sign in</Link></p></div>}
  </AuthShell>;
}
