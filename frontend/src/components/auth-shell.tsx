'use client';

import { Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import BrandLogo from '@/components/brand-logo';

export default function AuthShell({ children, eyebrow, title, description, footer }: { children: ReactNode; eyebrow: string; title: string; description: string; footer: ReactNode }) {
  return <main className="auth-page"><div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" /><section className="auth-aside"><a className="auth-brand" href="/"><span className="brand-mark"><BrandLogo /></span><span>alaala</span></a><div className="auth-aside-copy"><p className="eyebrow light">A private place for what matters</p><h1>Your story deserves<br /><em>a safe home.</em></h1><p>Keep the moments, lessons, and words you want to carry forward. With care, clarity, and your permission at the center.</p></div><div className="auth-aside-footer"><span><ShieldCheck size={15} /> Privacy-first by design</span><span><LockKeyhole size={15} /> Your memories stay yours</span></div></section><section className="auth-content"><div className="auth-form-wrap"><div className="auth-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>{children}<div className="auth-footer">{footer}</div><div className="auth-security"><Check size={13} /> Account verification and sessions are secured by the backend.</div></div></section></main>;
}