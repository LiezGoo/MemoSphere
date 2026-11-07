import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export function GlassCard({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`glass-card ${className}`} {...props}>{children}</div>;
}

export function GlassInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`glass-input ${className}`} {...props} />;
}

export function PillButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return <button className={`pill-button ${className}`} {...props}>{children}</button>;
}

export function IconBadge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`icon-badge ${className}`}>{children}</span>;
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="section-description">{description}</p>}</div>{action}</div>;
}
