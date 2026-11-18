'use client';

import { LockKeyhole, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import BrandLogo from '@/components/brand-logo';

export default function AuthShell({ children, eyebrow, title, description, footer }: { children: ReactNode; eyebrow: string; title: string; description: string; footer: ReactNode }) {
  return <main className="auth-page"><div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" /><section className="auth-aside">  <a className="auth-brand" href="/" aria-label="MemoSphere home"><span className="brand-mark"><BrandLogo /></span><span>MemoSphere</span></a><div className="auth-aside-copy"><p className="eyebrow light">A private place for what matters</p><h1>Your memories deserve<br /><em>a place that lasts.</em></h1><p>Preserve your thoughts, experiences, and stories in a private space designed to keep what matters close.</p></div><div className="auth-aside-footer"><span><ShieldCheck size={15} /> Privacy-first by design</span><span><LockKeyhole size={15} /> Your memories stay yours</span></div></section><section className="auth-content"><div className="auth-form-wrap"><div className="auth-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>{children}<div className="auth-footer">{footer}</div><div className="auth-security"></div></div></section></main>;}
