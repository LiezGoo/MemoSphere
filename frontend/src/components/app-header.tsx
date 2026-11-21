'use client';

import { Bell, BookHeart, Clock3, CircleUserRound, LogOut, Search, Settings, ShieldCheck, Sparkles, X, BellRing } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { authService, notificationsService, profileService, type NotificationItem, type Profile } from '@/services/api';
import { useAuth } from '@/components/auth-provider';

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4, 'week'], [12, 'month']];
  let amount = seconds;
  for (const [limit, unit] of units) {
    if (Math.abs(amount) < limit) return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(amount, unit);
    amount = Math.round(amount / limit);
  }
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(amount, 'year');
}

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
  if (type === 'COUNTDOWN' || type === 'REMINDER') return <Clock3 size={17} />;
  if (type === 'REVISION_READY') return <Sparkles size={17} />;
  if (type === 'SECURITY') return <ShieldCheck size={17} />;
  return <BookHeart size={17} />;
}

type AppHeaderProps = {
  sidebarCollapsed: boolean;
  mobileOpen: boolean;
  onMenuToggle: () => void;
};

export default function AppHeader({ sidebarCollapsed, mobileOpen, onMenuToggle }: AppHeaderProps) {
  const expanded = mobileOpen || !sidebarCollapsed;
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [menuError, setMenuError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(pathname === '/saved-information' ? params.get('q') ?? '' : '');
  }, [pathname]);

  useEffect(() => {
    const refresh = () => { void notificationsService.unreadCount().then(setUnreadCount).catch(() => undefined); };
    const refreshProfile = () => { void profileService.get().then(setProfile).catch(() => undefined); };
    refresh();
    refreshProfile();
    const interval = window.setInterval(refresh, 45000);
    window.addEventListener('focus', refresh);
    window.addEventListener('memosphere:profile-updated', refreshProfile);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); window.removeEventListener('memosphere:profile-updated', refreshProfile); };
  }, []);

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) { setNotificationsOpen(false); setProfileOpen(false); }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    setNotificationLoading(true); setNotificationError('');
    void notificationsService.list().then((result) => setNotifications(result.notifications)).catch((reason) => setNotificationError(reason instanceof Error ? reason.message : 'Unable to load notifications.')).finally(() => setNotificationLoading(false));
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen || notificationLoading) return;
    window.setTimeout(() => notificationPanelRef.current?.querySelector<HTMLElement>('[data-menu-item]:not(:disabled)')?.focus(), 0);
  }, [notificationLoading, notifications.length, notificationsOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    window.setTimeout(() => profilePanelRef.current?.querySelector<HTMLElement>('[data-menu-item]')?.focus(), 0);
  }, [profileOpen]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (!(event instanceof KeyboardEvent) || typeof event.key !== 'string') return;
      const target = event.target;
      const typing = target instanceof HTMLElement && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      );
      const key = event.key.toLowerCase();
      if ((key === 'k' && (event.ctrlKey || event.metaKey)) || (key === '/' && !typing)) {
        event.preventDefault();
        setMobileSearchOpen(window.matchMedia('(max-width: 767px)').matches);
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setQuery('');
        setMobileSearchOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setMobileSearchOpen(false);
    router.push(`/saved-information?q=${encodeURIComponent(value)}`);
  };

  const toggleNotifications = () => { setProfileOpen(false); setNotificationsOpen((open) => !open); setMenuError(''); };
  const toggleProfile = () => { setNotificationsOpen(false); setProfileOpen((open) => !open); setMenuError(''); };
  const closeWithFocus = (kind: 'notifications' | 'profile') => {
    setNotificationsOpen(false); setProfileOpen(false);
    (kind === 'notifications' ? notificationButtonRef : profileButtonRef).current?.focus();
  };
  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, kind: 'notifications' | 'profile') => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeWithFocus(kind); return; }
    if (kind === 'profile' && event.key === 'Tab') { setProfileOpen(false); return; }
    if (kind === 'profile' && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault();
      const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-menu-item]:not(:disabled)')];
      (event.key === 'Home' ? items[0] : items[items.length - 1])?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = [...(event.currentTarget.querySelectorAll<HTMLElement>('[data-menu-item]:not(:disabled)'))];
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    items[(current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };
  const markNotificationRead = async (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((items) => items.map((notification) => notification.id === item.id ? { ...notification, isRead: true, readAt: new Date().toISOString() } : notification));
      setUnreadCount((count) => Math.max(0, count - 1));
      try { await notificationsService.markRead(item.id); }
      catch (reason) { setNotificationError(reason instanceof Error ? reason.message : 'Unable to update notification.'); void notificationsService.unreadCount().then(setUnreadCount).catch(() => undefined); }
    }
    if (item.link?.startsWith('/') && !item.link.startsWith('//')) { setNotificationsOpen(false); router.push(item.link); }
  };
  const markAllRead = async () => {
    const old = notifications;
    setNotifications(old.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try { await notificationsService.markAllRead(); }
    catch (reason) { setNotifications(old); setMenuError(reason instanceof Error ? reason.message : 'Unable to mark all read.'); void notificationsService.unreadCount().then(setUnreadCount).catch(() => undefined); }
  };
  const signOut = async () => { setSigningOut(true); try { await authService.logout(); } finally { window.location.assign('/login'); } };

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

  return (
    <header className="app-header">
      <div className="app-header-leading">
        <button
          className="app-header-button"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={expanded}
          aria-controls="app-sidebar"
          onClick={onMenuToggle}
        >
          <Image
            src="/images/logoo.png"
            alt="MemoSphere Logo"
            width={36}
            height={36}
            className="app-header-logo-image"
          />
        </button>
        <strong className="app-header-title">MemoSphere</strong>
      </div>
      <form className={`app-header-search ${mobileSearchOpen ? 'is-mobile-open' : ''}`} role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="memory-search">Search your memories</label>
        <button className="app-header-search-submit" type="submit" aria-label="Search your memories"><Search size={19} /></button>
        <input ref={inputRef} id="memory-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your memories..." autoComplete="off" />
        {query && <button className="app-header-search-clear" type="button" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><X size={17} /></button>}
        <span className="app-header-search-hint" aria-hidden="true">Ctrl K</span>
      </form>
      <div className="app-header-actions" ref={actionsRef}>
        <button className="app-header-search-mobile-button app-header-button" type="button" aria-label="Open memory search" onClick={() => { setMobileSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}><Search size={24} strokeWidth={2} /></button>
        <div className="header-menu-anchor">
        <button ref={notificationButtonRef} className="app-header-button header-action-trigger" type="button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={notificationsOpen} aria-haspopup="true" onClick={toggleNotifications}>
          <Bell size={24} strokeWidth={2} />{unreadCount > 0 && <span className="header-unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        {notificationsOpen && <div className="header-dropdown notification-dropdown" ref={notificationPanelRef} role="menu" aria-label="Notifications" onKeyDown={(event) => handleMenuKeyDown(event, 'notifications')}>
          <div className="header-dropdown-heading"><div><strong>Notifications</strong><span>{unreadCount} unread</span></div><button type="button" role="menuitem" data-menu-item onClick={() => { void markAllRead(); }} disabled={!unreadCount}>Mark all as read</button></div>
          {menuError && <p className="header-dropdown-error" role="alert">{menuError}</p>}
          {notificationLoading ? <p className="header-dropdown-state">Loading notifications…</p> : notificationError ? <p className="header-dropdown-error" role="alert">{notificationError}</p> : notifications.length ? <div className="notification-list">{notifications.map((item) => <button key={item.id} className={`notification-item ${item.isRead ? 'is-read' : 'is-unread'}`} type="button" role="menuitem" data-menu-item onClick={() => { void markNotificationRead(item); }}><span className="notification-item-icon"><NotificationIcon type={item.type} /></span><span className="notification-item-copy"><strong>{item.title}</strong><span>{item.body}</span><small>{relativeTime(item.createdAt)}</small></span>{!item.isRead && <i className="notification-unread-dot" aria-label="Unread" />}</button>)}</div> : <p className="header-dropdown-state"><BellRing size={20} /><strong>You’re all caught up</strong></p>}
        </div>}
        </div>
        <div className="header-menu-anchor">
        <button ref={profileButtonRef} className={`app-header-button header-action-trigger ${pathname.startsWith('/settings') ? 'is-active' : ''}`} type="button" aria-label="Account menu" aria-expanded={profileOpen} aria-haspopup="menu" onClick={toggleProfile}>
          {profile?.avatarUrl ? <img className="header-avatar-image" src={`${apiBaseUrl}${profile.avatarUrl}`} alt="" /> : <CircleUserRound size={24} strokeWidth={2} />}
        </button>
        {profileOpen && <div className="header-dropdown profile-dropdown" ref={profilePanelRef} role="menu" aria-label="Account menu" onKeyDown={(event) => handleMenuKeyDown(event, 'profile')}>
          {(profile || user) && <div className="profile-menu-identity"><span className="profile-menu-avatar">{profile?.avatarUrl ? <img src={`${apiBaseUrl}${profile.avatarUrl}`} alt="" /> : <CircleUserRound size={22} />}</span><span><strong>{profile?.fullName ?? user?.fullName ?? 'Your profile'}</strong>{(profile?.email ?? user?.email) && <small>{profile?.email ?? user?.email}</small>}</span></div>}
          <a role="menuitem" data-menu-item href="/profile"><CircleUserRound size={16} /> Profile</a>
          <a role="menuitem" data-menu-item href="/profile#notifications"><Bell size={16} /> Notification preferences</a>
          <a role="menuitem" data-menu-item href="/settings" aria-current={pathname.startsWith('/settings') ? 'page' : undefined}><Settings size={16} /> Settings</a>
          <div className="profile-menu-divider" role="separator" />
          <button role="menuitem" data-menu-item type="button" disabled={signingOut} onClick={() => { void signOut(); }}><LogOut size={16} /> {signingOut ? 'Signing out...' : 'Sign out'}</button>
          {menuError && <p className="header-dropdown-error" role="alert">{menuError}</p>}
        </div>}
        </div>
      </div>
    </header>
  );
}
