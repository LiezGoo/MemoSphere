'use client';

import { Check, HeartHandshake, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { wishesService } from '@/services/api';

type WishDocument = { title: string; content: string };

export default function WishesEditor() {
  const contentInput = useRef<HTMLTextAreaElement>(null);
  const savedValues = useRef<WishDocument | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);
  const [toast, setToast] = useState<'success' | 'error' | null>(null);
  const [isNew, setIsNew] = useState(false);
  const dirty = loaded && (title !== savedValues.current?.title || content !== savedValues.current?.content);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await wishesService.get();
      const wishes = result.wishes;
      const initial = { title: wishes?.title ?? '', content: wishes?.content ?? '' };
      setTitle(initial.title);
      setContent(initial.content);
      savedValues.current = initial;
      setIsNew(!wishes);
      setLoaded(true);
      setSaveError(false);
    } catch {
      setLoadError('Unable to load this document.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const textarea = contentInput.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content, loading]);

  useEffect(() => {
    if (loaded && isNew && !title && !content) contentInput.current?.focus();
  }, [content, isNew, loaded, title]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const confirmRouteChange = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor) return;
      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin || next.pathname === window.location.pathname) return;
      if (!window.confirm('You have unsaved changes. Leave this page?')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', confirmRouteChange, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', confirmRouteChange, true);
    };
  }, [dirty]);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    const submitted = { title, content };
    setSaving(true);
    setSaveError(false);
    setToast(null);
    try {
      await wishesService.save(submitted);
      savedValues.current = submitted;
      setIsNew(false);
      setSavedPulse(true);
      setToast('success');
      window.setTimeout(() => { setSavedPulse(false); setToast(null); }, 1800);
    } catch {
      setSaveError(true);
      setToast('error');
    } finally {
      setSaving(false);
    }
  }, [content, dirty, saving, title]);

  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', saveShortcut);
    return () => window.removeEventListener('keydown', saveShortcut);
  }, [save]);

  const status = saving ? 'Saving...' : saveError ? "Couldn't save, try again" : dirty ? 'Unsaved changes' : 'All changes saved';
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characterCount = content.length;

  return (
    <section className="wishes-page" aria-labelledby="wishes-title">
      <header className="wishes-sticky-header">
        <div className="wishes-page-heading">
          <p className="eyebrow">Your voice, carried forward</p>
          <h1 id="wishes-title">Letter of Wishes</h1>
        </div>
        <div className="wishes-save-controls">
          <span className="wishes-save-status" aria-live="polite">{status}</span>
          {saveError && <button type="button" className="wishes-retry" onClick={() => void save()} aria-label="Retry saving your letter"><RotateCcw size={14} /> Retry</button>}
          <button className="button button-primary wishes-save-button" type="button" disabled={!dirty || saving} onClick={() => void save()} title="Save changes (Ctrl/Cmd+S)">
            {saving ? <LoaderCircle className="wishes-spinner" size={16} /> : savedPulse ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : savedPulse ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </header>

      <div className="notice notice-warm wishes-notice">
        <HeartHandshake size={17} aria-hidden="true" />
        <p><strong>Personal guidance only.</strong> This document does not replace formal legal documents.</p>
      </div>

      {toast && <p className={`profile-toast${toast === 'error' ? ' profile-toast-error' : ''}`} role={toast === 'error' ? 'alert' : 'status'}>{toast === 'success' ? 'Your letter was saved.' : "Couldn't save your letter. Try again."}</p>}

      {loading ? (
        <div className="wishes-loading" role="status" aria-label="Loading your letter">
          <span className="wishes-skeleton-title" />
          <span className="wishes-skeleton-editor" />
        </div>
      ) : loadError ? (
        <div className="wishes-load-error" role="alert">
          <p>{loadError}</p>
          <button className="button button-secondary" type="button" onClick={() => void load()}><RotateCcw size={15} /> Try again</button>
        </div>
      ) : (
        <div className="wishes-editor-surface">
          <label className="wishes-title-field" htmlFor="wishes-document-title">
            <span>Document title</span>
            <input id="wishes-document-title" type="text" value={title} placeholder="Give this letter a title" onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="wishes-content-field" htmlFor="wishes-document-content">Your letter</label>
          <textarea
            ref={contentInput}
            id="wishes-document-content"
            className="wishes-content-input"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write your wishes..."
          />
          {isNew && !content && <p className="wishes-guidance">Take your time. You can return to this letter and update it whenever you need.</p>}
          <footer className="wishes-editor-footer">
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'} · {characterCount} {characterCount === 1 ? 'character' : 'characters'}</span>
            <span aria-hidden="true">{status}</span>
          </footer>
        </div>
      )}
    </section>
  );
}
