'use client';

import {
  BookOpen, Clock3, HeartHandshake, LayoutDashboard, MessageCircleHeart,
  LogOut, Settings, ShieldCheck,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType, type FocusEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';

type AppSidebarProps = {
  collapsed: boolean;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

const navigation: NavigationItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Diary', href: '/my-diary', icon: BookOpen },
  { label: 'Memory Timeline', href: '/activity-logs', icon: Clock3 },
  { label: 'Ask My Memories', href: '/ai-diary', icon: MessageCircleHeart },
  { label: 'Letters to my Future Self', href: '/letter-of-wishes', icon: HeartHandshake },
  { label: 'Legacy and Inheritance', href: '/legacy-policy', icon: ShieldCheck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function AppSidebar({ collapsed, open, onClose, onLogout }: AppSidebarProps) {
  const pathname = usePathname();
  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primaryNavigation = navigation.slice(0, 5);
  const secondaryNavigation = navigation.slice(5, 6);
  const settings = navigation[6];

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
      setTooltip({
        label,
        left: bounds.right + 10,
        top: Math.max(10, Math.min(bounds.top + bounds.height / 2, window.innerHeight - 24)),
      });
    }, 350);
  };

  useEffect(() => hideTooltip, [collapsed, open]);
  useEffect(() => () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }, []);

  const tooltipHandlers = (label: string) => ({
    onPointerEnter: (event: PointerEvent<HTMLElement>) => showTooltip(label, event.currentTarget),
    onPointerLeave: hideTooltip,
    onFocus: (event: FocusEvent<HTMLElement>) => showTooltip(label, event.currentTarget),
    onBlur: hideTooltip,
  });

  return (
    <nav
      id="app-sidebar"
      className={`app-sidebar ${collapsed ? 'is-collapsed' : ''} ${open ? 'is-open' : ''}`}
      aria-label="Main"
    >
      <div className="app-sidebar-scroll">
        <div className="app-sidebar-links">
          {[...primaryNavigation, ...secondaryNavigation].map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return <a key={href} className={`app-sidebar-link ${active ? 'is-active' : ''}`} href={href} aria-current={active ? 'page' : undefined} aria-describedby={collapsed && tooltip?.label === label ? 'app-sidebar-tooltip' : undefined} onClick={onClose} {...tooltipHandlers(label)}><Icon size={21} strokeWidth={1.9} /><span>{label}</span></a>;
          })}
        </div>
      </div>
      <div className="app-sidebar-footer">
        <a className={`app-sidebar-link ${pathname === settings.href ? 'is-active' : ''}`} href={settings.href} aria-current={pathname === settings.href ? 'page' : undefined} aria-describedby={collapsed && tooltip?.label === settings.label ? 'app-sidebar-tooltip' : undefined} onClick={onClose} {...tooltipHandlers(settings.label)}><Settings size={21} strokeWidth={1.9} /><span>{settings.label}</span></a>
        <button className="app-sidebar-logout" type="button" aria-describedby={collapsed && tooltip?.label === 'Sign out' ? 'app-sidebar-tooltip' : undefined} onClick={onLogout} {...tooltipHandlers('Sign out')}>
          <LogOut size={21} strokeWidth={1.9} />
          <span>Sign out</span>
        </button>
      </div>
      {tooltip && collapsed && typeof document !== 'undefined' && createPortal(
        <div id="app-sidebar-tooltip" className="app-sidebar-tooltip" role="tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
          {tooltip.label}
        </div>,
        document.body,
      )}
    </nav>
  );
}
