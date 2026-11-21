'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { CalendarDays, CloudRain, Eye, Flame, Leaf, Search, Sparkles, Waves, X } from 'lucide-react';
import { ApiError, diaryService } from '@/services/api';
import type { ApiDiaryEntry } from '@/types';
import AppLayout from '@/components/app-layout';

type Emotion = 'JOY' | 'SADNESS' | 'ANGER' | 'FEAR' | 'DISGUST' | 'ANXIETY';

const emotionIcons: Record<Emotion, typeof Sparkles> = {
  JOY: Sparkles,
  SADNESS: CloudRain,
  ANGER: Flame,
  FEAR: Eye,
  DISGUST: Leaf,
  ANXIETY: Waves,
};

function EmotionIcon({ emotion, size = 14 }: { emotion: Emotion; size?: number }) {
  const Icon = emotionIcons[emotion];
  return <Icon size={size} aria-hidden="true" />;
}

const emotions: Array<{ value: Emotion; label: string; color: string; icon: string }> = [
  { value: 'JOY', label: 'Joy', color: '#f5cf55', icon: '✦' },
  { value: 'SADNESS', label: 'Sadness', color: '#61a8ff', icon: '●' },
  { value: 'ANGER', label: 'Anger', color: '#f05e67', icon: '▲' },
  { value: 'FEAR', label: 'Fear', color: '#a78bfa', icon: '◆' },
  { value: 'DISGUST', label: 'Disgust', color: '#62b99a', icon: '■' },
  { value: 'ANXIETY', label: 'Anxiety', color: '#45c8c2', icon: '~' },
];

const emotionInfo = (emotion: Emotion | null | undefined) =>
  emotions.find((item) => item.value === emotion) ?? { value: 'JOY' as Emotion, label: 'Unclassified', color: '#9aa7bd', icon: '◇' };

export default function MemoryTimeline() {
  const [entries, setEntries] = useState<ApiDiaryEntry[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('all');
  const [selected, setSelected] = useState<ApiDiaryEntry | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [classificationLoading, setClassificationLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [emotionSaving, setEmotionSaving] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailNotice, setDetailNotice] = useState('');
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());
  const selectedNodeRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement | null>(null);
  const photoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const detailBodyRef = useRef<HTMLDivElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const emotionSavingRef = useRef(false);
  const lightboxRef = useRef<typeof lightbox>(null);
  lightboxRef.current = lightbox;
  emotionSavingRef.current = emotionSaving;

  useEffect(() => {
    if (lightbox) lightboxCloseRef.current?.focus();
    else if (selected) photoTriggerRef.current?.focus();
  }, [Boolean(lightbox)]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await diaryService.list('?page=1&pageSize=100&sort=oldest');
      setEntries(result.entries);
      const needsClassification = result.entries.some((entry) => !entry.emotion);
      if (needsClassification) {
        setClassificationLoading(true);
        diaryService.classifyUnclassified()
          .then(() => diaryService.list('?page=1&pageSize=100&sort=oldest'))
          .then((refreshed) => setEntries(refreshed.entries))
          .catch(() => undefined)
          .finally(() => setClassificationLoading(false));
      }
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to load memories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const dateFiltered = useMemo(() => entries.filter((entry) => {
    if (period !== 'all') {
      const date = new Date(entry.entryDate);
      const now = new Date();
      if (period === 'month' && (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear())) return false;
      if (period === 'year' && date.getFullYear() !== now.getFullYear()) return false;
    }
    return true;
  }), [entries, period]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return dateFiltered.filter((entry) => {
      if (normalized && !`${entry.title} ${entry.content}`.toLowerCase().includes(normalized)) return false;
      if (selectedEmotion !== 'ALL' && entry.emotion !== selectedEmotion) return false;
      return true;
    });
  }, [dateFiltered, query, selectedEmotion]);

  const counts = useMemo(() => Object.fromEntries(emotions.map((emotion) => [
    emotion.value,
    dateFiltered.filter((entry) => entry.emotion === emotion.value).length,
  ])) as Record<Emotion, number>, [dateFiltered]);
  const mostFrequent = useMemo(() => {
    const ranked = emotions.map((emotion) => ({ ...emotion, count: counts[emotion.value] })).sort((a, b) => b.count - a.count);
    return ranked[0].count ? ranked[0] : null;
  }, [counts]);

  const closeMemory = () => {
    if (emotionSavingRef.current) return;
    setSelected(null);
    setLightbox(null);
    requestAnimationFrame(() => selectedNodeRef.current?.focus());
  };

  useEffect(() => {
    if (!selected) return;
    selectedIdRef.current = selected.id;
    setDetailLoading(true);
    setDetailError('');
    setDetailNotice('');
    detailBodyRef.current?.scrollTo({ top: 0 });
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let active = true;
    void diaryService.get(selected.id).then((entry) => {
      if (!active || selectedIdRef.current !== entry.id) return;
      setSelected(entry);
      setEntries((current) => current.map((item) => item.id === entry.id ? entry : item));
    }).catch((reason) => {
      if (active) setDetailError(reason instanceof ApiError ? reason.message : 'Unable to refresh this memory. Showing the saved timeline copy.');
    }).finally(() => { if (active) setDetailLoading(false); });
    const onKeyDown = (event: KeyboardEvent) => {
      if (lightboxRef.current && event.key === 'Tab') {
        event.preventDefault();
        lightboxCloseRef.current?.focus();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        if (lightboxRef.current) setLightbox(null);
        else closeMemory();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = detailPanelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      active = false;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selected?.id]);

  const setManualEmotion = async (emotion: Emotion) => {
    if (!selected || emotionSaving) return;
    setEmotionSaving(true);
    setDetailError('');
    setDetailNotice('');
    try {
      const updated = await diaryService.setEmotion(selected.id, emotion);
      setEntries((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setSelected(updated);
      setDetailNotice(`Emotion updated to ${emotionInfo(updated.emotion).label}.`);
    } catch (reason) {
      setDetailError(reason instanceof ApiError ? reason.message : 'Unable to update the emotion. Please try again.');
    } finally { setEmotionSaving(false); }
  };

  const classify = async () => {
    if (!selected || emotionSaving) return;
    setEmotionSaving(true);
    setDetailError('');
    setDetailNotice('');
    try {
      const updated = await diaryService.classifyEmotion(selected.id);
      setEntries((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setSelected(updated);
      setDetailNotice('Emotion classification refreshed.');
    } catch (reason) {
      setDetailError(reason instanceof ApiError ? reason.message : 'Unable to classify this memory. Please try again.');
    } finally { setEmotionSaving(false); }
  };

  return (
    <AppLayout>
      <section className="memory-timeline-page">
        <header className="memory-timeline-heading">
          <div><p className="eyebrow">Emotional Memory Timeline</p><h1>Your memory universe</h1></div>
          <label className="memory-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search memories" /></label>
        </header>

        <div className="memory-toolbar">
          <div className="memory-periods" aria-label="Timeline period">
            {[['all', 'All memories'], ['month', 'This month'], ['year', 'This year']            ].map(([value, label]) => (
              <button type="button" key={value} className={period === value ? 'is-active' : ''} onClick={() => setPeriod(value)}>{label}</button>
            ))}
          </div>
          <div className="memory-emotion-filters" aria-label="Filter by emotion">
            <button type="button" className={selectedEmotion === 'ALL' ? 'is-active' : ''} onClick={() => setSelectedEmotion('ALL')}>All</button>
            {emotions.map((emotion) => (
              <button type="button" key={emotion.value} className={selectedEmotion === emotion.value ? 'is-active' : ''} style={{ '--emotion-color': emotion.color } as CSSProperties} onClick={() => setSelectedEmotion(emotion.value)}>
                <span><EmotionIcon emotion={emotion.value} /></span>{emotion.label}
              </button>
            ))}
          </div>
        </div>

        <aside className="memory-statistics" aria-label="Emotion summary">
          <div><span>Total memories</span><strong>{dateFiltered.length}</strong></div>
          {emotions.map((emotion) => <div key={emotion.value} style={{ '--emotion-color': emotion.color } as CSSProperties}><span><EmotionIcon emotion={emotion.value} /> {emotion.label}</span><strong>{counts[emotion.value]}</strong></div>)}
          <div><span>Most frequent</span><strong>{mostFrequent?.label ?? 'None yet'}</strong></div>
        </aside>
        {classificationLoading && <p className="memory-classifying" role="status">Classifying unprocessed memories…</p>}

        {loading ? <div className="memory-loading">Gathering memories…</div> : error ? <div className="memory-error" role="alert">{error}</div> : visible.length === 0 ? (
          <div className="memory-empty"><Sparkles size={26} /><h2>No memories in this view</h2><p>Try another emotion or period.</p></div>
        ) : (
          <div className="memory-canvas">
            <div className="memory-flow" aria-hidden="true" />
            {visible.map((entry, index) => {
              const info = emotionInfo(entry.emotion);
              return (
                <button type="button" className={`memory-node ${selected?.id === entry.id ? 'is-selected' : ''}`} key={entry.id} style={{ '--emotion-color': info.color, '--node-index': index } as CSSProperties} onClick={(event) => { selectedNodeRef.current = event.currentTarget; setSelected(entry); }} aria-label={`Open memory: ${entry.title}`} aria-haspopup="dialog" aria-pressed={selected?.id === entry.id}>
                  <span className="memory-orb"><span><EmotionIcon emotion={info.value} size={20} /></span></span>
                  <span className="memory-node-copy"><small>{new Date(entry.entryDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</small><strong>{entry.title}</strong><span>{entry.preview}</span></span>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="memory-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMemory(); }}>
            <article className="memory-preview" ref={detailPanelRef} role="dialog" aria-modal="true" aria-labelledby="memory-preview-title" aria-describedby="memory-preview-date" onClick={(event) => event.stopPropagation()}>
              <header className="memory-preview-header">
                <div className="memory-preview-heading-copy">
                  <p className="eyebrow" id="memory-preview-date"><CalendarDays size={13} /> {new Date(selected.entryDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <h2 id="memory-preview-title">{selected.title || 'A saved memory'}</h2>
                  <span className="memory-current-emotion" style={{ '--emotion-color': emotionInfo(selected.emotion).color } as CSSProperties}><EmotionIcon emotion={emotionInfo(selected.emotion).value} />{emotionInfo(selected.emotion).label}</span>
                </div>
                <button ref={closeButtonRef} type="button" className="memory-preview-close" aria-label="Close memory details" onClick={closeMemory} disabled={emotionSaving}><X size={18} /></button>
              </header>
              <div className="memory-preview-body" ref={detailBodyRef}>
                {detailLoading && <p className="memory-detail-loading" role="status">Loading full memory…</p>}
                {detailError && <p className="memory-detail-error" role="alert">{detailError}</p>}
                <section className="memory-detail-section" aria-labelledby="memory-content-heading">
                  <h3 id="memory-content-heading">Memory</h3>
                  <p className="memory-preview-content">{selected.content || 'This memory has no written content.'}</p>
                </section>
                {selected.photos?.length ? <section className="memory-detail-section" aria-labelledby="memory-photos-heading">
                  <h3 id="memory-photos-heading">Attachments <span>{selected.photos.length}</span></h3>
                  <div className="memory-preview-photos">{selected.photos.map((photo) => failedPhotos.has(photo.id) ? <div key={photo.id} className="memory-photo-failed" role="img" aria-label={`Unable to load ${photo.altText ?? 'attached photo'}`}>Photo unavailable</div> : <button ref={(element) => { if (element && !photoTriggerRef.current) photoTriggerRef.current = element; }} key={photo.id} type="button" className="memory-photo-button" aria-label={`View larger: ${photo.altText ?? 'attached memory photo'}`} onClick={(event) => { photoTriggerRef.current = event.currentTarget; setLightbox({ src: photo.fullUrl ?? photo.thumbnailUrl, alt: photo.altText ?? 'Attached memory' }); }}><img src={photo.fullUrl ?? photo.thumbnailUrl} alt={photo.altText ?? 'Attached memory'} onError={() => setFailedPhotos((current) => new Set(current).add(photo.id))} /></button>)}</div>
                </section> : null}
                <section className="memory-emotion-editor" aria-labelledby="memory-emotion-heading">
                  <h3 id="memory-emotion-heading">Assigned emotion</h3>
                  <div role="group" aria-label="Choose an emotion">{emotions.map((emotion) => <button type="button" key={emotion.value} className={selected.emotion === emotion.value ? 'is-active' : ''} style={{ '--emotion-color': emotion.color } as CSSProperties} onClick={() => void setManualEmotion(emotion.value)} disabled={emotionSaving} aria-pressed={selected.emotion === emotion.value} aria-label={`${emotion.label}${selected.emotion === emotion.value ? ', currently assigned' : ''}`}><b aria-hidden="true"><EmotionIcon emotion={emotion.value} /></b>{emotion.label}</button>)}</div>
                </section>
                {detailNotice && <p className="memory-detail-notice" role="status">{detailNotice}</p>}
              </div>
              <footer className="memory-preview-actions">
                <button type="button" className="button button-secondary" onClick={() => void classify()} disabled={emotionSaving || detailLoading}><Sparkles size={15} /> {emotionSaving ? 'Updating…' : 'Classify again'}</button>
                <Link className="button button-primary" href={`/my-diary?entry=${selected.id}`}>Open original diary entry</Link>
              </footer>
            </article>
            {lightbox && <div className="memory-lightbox" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLightbox(null); }}><div className="memory-lightbox-content" role="dialog" aria-modal="true" aria-label="Attached photo"><button ref={lightboxCloseRef} type="button" className="memory-lightbox-close" aria-label="Close photo" onClick={() => setLightbox(null)}><X size={19} /></button><img src={lightbox.src} alt={lightbox.alt} /></div></div>}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
