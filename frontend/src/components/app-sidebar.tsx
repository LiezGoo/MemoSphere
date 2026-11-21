'use client';

import {
  BookOpen, FolderOpen, HeartHandshake, LayoutDashboard, Orbit,
  PenLine, ShieldCheck, UsersRound,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentType, type FocusEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';

type AppSidebarProps = {
  collapsed: boolean;
  open: boolean;
  onClose: () => void;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

const sections: { label: string; items: NavigationItem[] }[] = [
  { label: 'Main menu', items: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Diary', href: '/my-diary', icon: BookOpen },
    { label: 'Memory Timeline', href: '/memory-timeline', icon: Orbit },
    { label: 'Writing Modes', href: '/writing-modes', icon: PenLine },
  ] },
  { label: 'Personal management', items: [
    { label: 'Files', href: '/files', icon: FolderOpen },
    { label: 'Beneficiaries', href: '/beneficiaries', icon: UsersRound },
    { label: 'Access Policies', href: '/legacy-policy', icon: ShieldCheck },
    { label: 'Letter of Wishes', href: '/letter-of-wishes', icon: HeartHandshake },
  ] },
];

export default function AppSidebar({ collapsed, open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideTooltip = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = null;
    setTooltip(null);
  };

  const showTooltip = (label: string, target: HTMLElement) => {
    hideTooltip();
    if (!collapsed) return;
    tooltipTimer.current = setTimeout(() => {
      const bounds = target.getBoundingClientRect();
      setTooltip({ label, left: bounds.right + 10, top: Math.max(10, Math.min(bounds.top + bounds.height / 2, window.innerHeight - 24)) });
    }, 350);
  };

  useEffect(() => hideTooltip, [collapsed, open]);
  useEffect(() => () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); }, []);

  const tooltipHandlers = (label: string) => ({
    onPointerEnter: (event: PointerEvent<HTMLElement>) => showTooltip(label, event.currentTarget),
    onPointerLeave: hideTooltip,
    onFocus: (event: FocusEvent<HTMLElement>) => showTooltip(label, event.currentTarget),
    onBlur: hideTooltip,
  });

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav id="app-sidebar" className={`app-sidebar ${collapsed ? 'is-collapsed' : ''} ${open ? 'is-open' : ''}`} aria-label="Main">
      <div className="app-sidebar-scroll">
        {sections.map((section) => (
          <section className="app-sidebar-section" key={section.label} aria-label={section.label}>
            <h2 className="app-sidebar-section-heading">{section.label}</h2>
            <div className="app-sidebar-links">
              {section.items.map(({ label, href, icon: Icon }) => {
                const isActive = active(href);
                return <Link key={href} className={`app-sidebar-link ${isActive ? 'is-active' : ''}`} href={href} aria-current={isActive ? 'page' : undefined} aria-label={collapsed ? label : undefined} aria-describedby={collapsed && tooltip?.label === label ? 'app-sidebar-tooltip' : undefined} onClick={onClose} {...tooltipHandlers(label)}><Icon size={21} strokeWidth={1.9} /><span>{label}</span></Link>;
              })}
            </div>
          </section>
        ))}
      </div>
      {tooltip && collapsed && typeof document !== 'undefined' && createPortal(
        <div id="app-sidebar-tooltip" className="app-sidebar-tooltip" role="tooltip" style={{ left: tooltip.left, top: tooltip.top }}>{tooltip.label}</div>,
        document.body,
      )}
    </nav>
  );
}
