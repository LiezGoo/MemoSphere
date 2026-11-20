'use client';

import { useEffect, useState } from 'react';
import { legacyVerificationService, ApiError } from '@/services/api';

export default function VerifyEmailPage() {
  const [message, setMessage] = useState('Verifying…');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const purpose = params.get('purpose');
    if (!token) { setMessage('This link is invalid or expired.'); return; }
    const verify = purpose === 'release'
      ? legacyVerificationService.verifyRelease(token)
      : legacyVerificationService.verifyInvitation(token, purpose === 'decline' ? 'decline' : 'verify');
    verify.then(() => setMessage(purpose === 'decline' ? 'Invitation declined.' : 'Verified successfully.'))
      .catch((reason) => setMessage(reason instanceof ApiError ? reason.message : 'This link is invalid or expired.'));
  }, []);
  return <main className="verify-email-page"><section className="panel"><h1>MemoSphere</h1><p role="status">{message}</p></section></main>;
}
