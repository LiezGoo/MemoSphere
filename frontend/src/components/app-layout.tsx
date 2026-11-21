'use client';

import { useEffect, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/app-header';
import AppSidebar from '@/components/app-sidebar';

type AppLayoutProps = {
  children: ReactNode;
};

const SIDEBAR_STORAGE_KEY = 'alaala-sidebar-collapsed';

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const narrow = window.matchMedia('(max-width: 1023px)').matches;
    setCollapsed(stored === null ? narrow : stored === 'true');

    const handleResize = () => {
      const isMobile = window.matchMedia('(max-width: 1023px)').matches;
      if (!isMobile) setMobileOpen(false);
      setMobile(isMobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const sidebar = document.getElementById('app-sidebar');
    const focusable = sidebar?.querySelectorAll<HTMLElement>('a, button');
    focusable?.[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const toggleMenu = () => {
    if (mobile) {
      setMobileOpen((current) => !current);
      return;
    }
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  const preservePlayerNavigation = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname && destination.search === window.location.search) return;
    event.preventDefault();
    router.push(`${destination.pathname}${destination.search}${destination.hash}`);
  };

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-open' : ''}`} onClick={preservePlayerNavigation}>
      <AppHeader sidebarCollapsed={collapsed} mobileOpen={mobileOpen} onMenuToggle={toggleMenu} />
      <div className="app-layout-body">
        <AppSidebar collapsed={mobile ? false : collapsed} open={mobileOpen || !mobile} onClose={() => setMobileOpen(false)} />
        {mobileOpen && <button className="app-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
        <main className="app-layout-content">{children}</main>
      </div>
    </div>
  );
}
