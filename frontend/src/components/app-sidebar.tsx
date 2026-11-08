'use client';

import {
  BookOpen, Clock3, HeartHandshake, LayoutDashboard, MessageCircleHeart,
  LogOut, Settings, ShieldCheck,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';

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
  const primaryNavigation = navigation.slice(0, 5);
  const secondaryNavigation = navigation.slice(5, 6);
  const settings = navigation[6];

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
            return <a key={href} className={`app-sidebar-link ${active ? 'is-active' : ''}`} href={href} aria-current={active ? 'page' : undefined} title={label} data-tooltip={label} onClick={onClose}><Icon size={21} strokeWidth={1.9} /><span>{label}</span></a>;
          })}
        </div>
      </div>
      <div className="app-sidebar-footer">
        <a className={`app-sidebar-link ${pathname === settings.href ? 'is-active' : ''}`} href={settings.href} aria-current={pathname === settings.href ? 'page' : undefined} title={settings.label} data-tooltip={settings.label} onClick={onClose}><Settings size={21} strokeWidth={1.9} /><span>{settings.label}</span></a>
        <button className="app-sidebar-logout" type="button" title="Sign out" data-tooltip="Sign out" onClick={onLogout}>
          <LogOut size={21} strokeWidth={1.9} />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  );
}
