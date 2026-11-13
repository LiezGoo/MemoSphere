'use client';

import { Bell, CircleUserRound, Search, X } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

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
  const [query, setQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(pathname === '/saved-information' ? params.get('q') ?? '' : '');
  }, [pathname]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if ((event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !typing)) {
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
            alt="Alaala Logo"
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
      <div className="app-header-actions">
        <button className="app-header-search-mobile-button app-header-button" type="button" aria-label="Open memory search" onClick={() => { setMobileSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}><Search size={24} strokeWidth={2} /></button>
        <button className="app-header-button" type="button" aria-label="Notifications">
          <Bell size={24} strokeWidth={2} />
        </button>
        <button className="app-header-button" type="button" aria-label="Account">
          <CircleUserRound size={24} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
