'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, CircleHelp, CloudRain, Flame, Leaf, Search, Sparkles, Sun, Target, Waves, X } from 'lucide-react';
import { ApiError, diaryService } from '@/services/api';
import type { ApiDiaryEntry } from '@/types';
import AuroraAtmosphere from '@/components/aurora-atmosphere';
import Modal from '@/components/modal';

type Emotion = 'JOY' | 'SADNESS' | 'ANGER' | 'FEAR' | 'DISGUST' | 'ANXIETY';

const emotionIcons: Record<Emotion, typeof Sparkles> = {
  JOY: Sun,
  SADNESS: CloudRain,
  ANGER: Flame,
  FEAR: Target,
  DISGUST: Leaf,
  ANXIETY: Waves,
};

function EmotionIcon({ emotion, size = 14 }: { emotion: Emotion | null; size?: number }) {
  const Icon = emotion ? emotionIcons[emotion] : CircleHelp;
  return <Icon size={size} aria-hidden="true" />;
}

const emotions: Array<{ value: Emotion; label: string; color: string }> = [
  { value: 'JOY', label: 'Joy', color: 'var(--timeline-joy)' },
  { value: 'SADNESS', label: 'Sadness', color: 'var(--timeline-sadness)' },
  { value: 'ANGER', label: 'Anger', color: 'var(--timeline-anger)' },
  { value: 'FEAR', label: 'Fear', color: 'var(--timeline-fear)' },
  { value: 'DISGUST', label: 'Disgust', color: 'var(--timeline-disgust)' },
  { value: 'ANXIETY', label: 'Anxiety', color: 'var(--timeline-anxiety)' },
];

const emotionInfo = (emotion: Emotion | null | undefined) =>
  emotions.find((item) => item.value === emotion) ?? { value: null, label: 'Unlabeled', color: 'var(--timeline-unlabeled)', icon: '?' };

function firstLine(entry: ApiDiaryEntry) {
  return (entry.content || entry.preview || '').split(/\r?\n/, 1)[0].trim() || entry.title || 'Saved memory';
}

function activateRadioOnArrow(event: ReactKeyboardEvent<HTMLButtonElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const radios = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []);
  const currentIndex = radios.indexOf(event.currentTarget);
  if (!radios.length || currentIndex < 0) return;
  event.preventDefault();
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
  const next = radios[(currentIndex + direction + radios.length) % radios.length];
  next.focus();
  next.click();
}

function wavePath(count: number, width: number) {
  const segments = Math.max(count * 2, 5);
  const step = width / segments;
  let path = 'M 0 134';
  for (let index = 0; index < segments; index += 1) {
    const x = (index + 1) * step;
    const fromY = index % 2 === 0 ? 134 : 110;
    const toY = index % 2 === 0 ? 110 : 134;
    path += ` C ${x - step * .62} ${fromY}, ${x - step * .38} ${toY}, ${x} ${toY}`;
  }
  return path;
}

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
  const [emotionDraft, setEmotionDraft] = useState<Emotion | null>(null);
  const [toast, setToast] = useState('');
  const [detailError, setDetailError] = useState('');
  const [detailNotice, setDetailNotice] = useState('');
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startScrollLeft: number; dragged: boolean } | null>(null);
  const initialScrollDone = useRef(false);
  const selectedNodeRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement | null>(null);
  const photoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  const detailBodyRef = useRef<HTMLDivElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const emotionSavingRef = useRef(false);
  emotionSavingRef.current = emotionSaving;

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
    if (normalized && !`${entry.title} ${firstLine(entry)}`.toLowerCase().includes(normalized)) return false;
      if (selectedEmotion !== 'ALL' && entry.emotion !== selectedEmotion) return false;
      return true;
    });
  }, [dateFiltered, query, selectedEmotion]);
  const selectedVisibleIndex = selected ? visible.findIndex((entry) => entry.id === selected.id) : -1;

  const counts = useMemo(() => Object.fromEntries(emotions.map((emotion) => [
    emotion.value,
    dateFiltered.filter((entry) => entry.emotion === emotion.value).length,
  ])) as Record<Emotion, number>, [dateFiltered]);
  const mostFrequent = useMemo(() => {
    const maximum = Math.max(...emotions.map((emotion) => counts[emotion.value]));
    return maximum > 0 ? emotions.filter((emotion) => counts[emotion.value] === maximum) : [];
  }, [counts]);
  const monthCounts = useMemo(() => visible.reduce<Record<string, number>>((result, entry) => {
    const date = new Date(entry.entryDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {}), [visible]);
  const monthMarkers = useMemo(() => visible.reduce<Array<{ label: string; xIndex: number }>>((result, entry, index) => {
    const date = new Date(entry.entryDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!result.some((marker) => marker.label === key)) result.push({ label: key, xIndex: index });
    return result;
  }, []), [visible]);
  const timelineWidth = Math.max(180, visible.length * 180);

  useEffect(() => {
    if (loading || initialScrollDone.current || !timelineRef.current || !visible.length) return;
    initialScrollDone.current = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timelineRef.current.scrollTo({ left: timelineRef.current.scrollWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [loading, visible.length]);

  const beginTimelineDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !timelineRef.current) return;
    dragRef.current = { startX: event.clientX, startScrollLeft: timelineRef.current.scrollLeft, dragged: false };
  };
  const moveTimelineDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !timelineRef.current) return;
    const distance = event.clientX - dragRef.current.startX;
    if (Math.abs(distance) > 5) dragRef.current.dragged = true;
    if (dragRef.current.dragged) timelineRef.current.scrollLeft = dragRef.current.startScrollLeft - distance;
  };
  const stopTimelineDrag = () => { if (timelineRef.current) timelineRef.current.style.cursor = ''; };
  const suppressDragClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    if (dragRef.current.dragged) { event.preventDefault(); event.stopPropagation(); }
    dragRef.current = null;
  };

  const closeMemory = () => {
    if (emotionSavingRef.current) return;
    setSelected(null);
    setLightbox(null);
    requestAnimationFrame(() => selectedNodeRef.current?.focus());
  };

  useEffect(() => {
    if (!selected) return;
    selectedIdRef.current = selected.id;
    setEmotionDraft(selected.emotion ?? null);
    setDetailLoading(true);
    setDetailError('');
    setDetailNotice('');
    detailBodyRef.current?.scrollTo({ top: 0 });
    let active = true;
    void diaryService.get(selected.id).then((entry) => {
      if (!active || selectedIdRef.current !== entry.id) return;
      setSelected(entry);
      setEntries((current) => current.map((item) => item.id === entry.id ? entry : item));
    }).catch((reason) => {
      if (active) setDetailError(reason instanceof ApiError ? reason.message : 'Unable to refresh this memory. Showing the saved timeline copy.');
    }).finally(() => { if (active) setDetailLoading(false); });
    return () => {
      active = false;
    };
  }, [selected?.id]);

  const setManualEmotion = async () => {
    if (!selected || emotionSaving || emotionDraft === null || emotionDraft === selected.emotion) return;
    setEmotionSaving(true);
    setDetailError('');
    setDetailNotice('');
    try {
      const updated = await diaryService.setEmotion(selected.id, emotionDraft);
      setEntries((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setSelected(updated);
      setEmotionDraft(updated.emotion ?? null);
      setToast('Emotion saved');
      window.setTimeout(() => setToast(''), 2400);
    } catch (reason) {
      setDetailError(reason instanceof ApiError ? reason.message : 'Unable to update the emotion. Please try again.');
    } finally { setEmotionSaving(false); }
  };

  const navigateMemory = (direction: -1 | 1) => {
    if (selectedVisibleIndex < 0) return;
    const next = visible[selectedVisibleIndex + direction];
    if (next) setSelected(next);
  };

  useEffect(() => {
    if (!selected || lightbox) return undefined;
    const onNavigateKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.getAttribute('role') === 'radio')) return;
      if (event.key === 'ArrowLeft' && selectedVisibleIndex > 0) { event.preventDefault(); navigateMemory(-1); }
      if (event.key === 'ArrowRight' && selectedVisibleIndex >= 0 && selectedVisibleIndex < visible.length - 1) { event.preventDefault(); navigateMemory(1); }
    };
    window.addEventListener('keydown', onNavigateKey);
    return () => window.removeEventListener('keydown', onNavigateKey);
  }, [selected?.id, selectedVisibleIndex, visible, lightbox]);

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

  const selectedDateLabel = selected ? new Date(selected.entryDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const generatedTitle = Boolean(selected && (selected.content || selected.preview)?.trim() && selected.title.trim() && selected.title.trim() === firstLine(selected));

  return (
      <section className={`memory-timeline-page${selected ? ' has-modal' : ''}`}>
        <AuroraAtmosphere />
        <header className="memory-timeline-heading">
          <div><p className="eyebrow">Emotional Memory Timeline</p><h1>Your <span>memory</span> universe</h1></div>
          <label className="memory-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search memories" /></label>
        </header>

        <div className="memory-toolbar">
          <div className="memory-periods" role="radiogroup" aria-label="Timeline period">
            {([['all', 'All memories'], ['month', 'This month'], ['year', 'This year']] as const).map(([value, label]) => (
              <button type="button" role="radio" aria-checked={period === value} tabIndex={period === value ? 0 : -1} key={value} className={period === value ? 'is-active' : ''} onKeyDown={activateRadioOnArrow} onClick={() => setPeriod(value)}>{label}</button>
            ))}
          </div>
          <div className="memory-emotion-filters" role="radiogroup" aria-label="Filter by emotion">
            <button type="button" role="radio" aria-checked={selectedEmotion === 'ALL'} tabIndex={selectedEmotion === 'ALL' ? 0 : -1} className={selectedEmotion === 'ALL' ? 'is-active' : ''} onKeyDown={activateRadioOnArrow} onClick={() => setSelectedEmotion('ALL')}>All</button>
            {emotions.map((emotion) => (
              <button type="button" role="radio" aria-checked={selectedEmotion === emotion.value} tabIndex={selectedEmotion === emotion.value ? 0 : -1} key={emotion.value} className={selectedEmotion === emotion.value ? 'is-active' : ''} style={{ '--emotion-color': emotion.color } as CSSProperties} onKeyDown={activateRadioOnArrow} onClick={() => setSelectedEmotion(emotion.value)}>
                <span><EmotionIcon emotion={emotion.value} /></span>{emotion.label}
              </button>
            ))}
          </div>
        </div>

        <aside className="memory-statistics" aria-label="Emotion summary">
          <div className="memory-stat-total"><span><Sparkles size={16} /> Total memories</span><strong>{dateFiltered.length}</strong></div>
          {emotions.map((emotion) => <div key={emotion.value} className={counts[emotion.value] ? '' : 'is-zero'} style={{ '--emotion-color': emotion.color } as CSSProperties}><span><EmotionIcon emotion={emotion.value} /> {emotion.label}</span><strong>{counts[emotion.value]}</strong></div>)}
          <div className="memory-stat-frequent"><span>Most frequent</span>{mostFrequent.length ? <strong>{mostFrequent.map((emotion) => <span key={emotion.value}><EmotionIcon emotion={emotion.value} size={16} />{emotion.label}</span>)}</strong> : <strong>—</strong>}</div>
        </aside>
        {classificationLoading && <p className="memory-classifying" role="status">Classifying unprocessed memories…</p>}

        {loading ? <div className="memory-loading" role="status"><span className="memory-skeleton-orbs"><i/><i/><i/><i/><i/></span><span>Gathering memories…</span></div> : error ? <div className="memory-error" role="alert"><CircleHelp size={22}/><p>{error}</p><button type="button" className="memory-retry" onClick={() => void load()}>Retry</button></div> : visible.length === 0 ? (
          entries.length === 0 ? <div className="memory-empty memory-empty-first"><span className="empty-universe-orb"><Sparkles size={24}/></span><h2>Your memory universe is waiting.</h2><p>Write your first entry to see it glow.</p><Link href="/my-diary" className="button button-primary">Write a diary entry <ChevronRight size={16}/></Link></div> : <div className="memory-empty"><Sparkles size={26} /><h2>No memories in this view</h2><p>Try another emotion, search, or time range.</p></div>
        ) : (
          <div ref={timelineRef} className="memory-canvas" style={{ '--memory-width': `${timelineWidth}px` } as CSSProperties} onPointerDown={(event) => { beginTimelineDrag(event); if (event.pointerType === 'mouse') event.currentTarget.style.cursor = 'grabbing'; }} onPointerMove={moveTimelineDrag} onPointerUp={stopTimelineDrag} onPointerCancel={stopTimelineDrag} onClickCapture={suppressDragClick}>
            <div className="memory-timeline-track" style={{ '--memory-width': `${timelineWidth}px`, '--memory-count': visible.length } as CSSProperties}>
              <svg className="timeline-wave-svg" width={timelineWidth} height="260" viewBox={`0 0 ${timelineWidth} 260`} preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="memoryWaveGradient" x1="0" x2="1">{visible.map((entry, index) => <stop key={`${entry.id}-gradient`} offset={`${visible.length < 2 ? 50 : (index / (visible.length - 1)) * 100}%`} stopColor={emotionInfo(entry.emotion).color} />)}</linearGradient></defs><path d={wavePath(visible.length, timelineWidth)} fill="none" stroke="url(#memoryWaveGradient)" strokeWidth="3" strokeLinecap="round"/></svg>
              <svg className="timeline-wave-mobile" viewBox="0 0 90 1000" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="memoryWaveMobileGradient" x1="0" y1="0" x2="0" y2="1">{visible.map((entry, index) => <stop key={`${entry.id}-mobile-gradient`} offset={`${visible.length < 2 ? 50 : (index / (visible.length - 1)) * 100}%`} stopColor={emotionInfo(entry.emotion).color} />)}</linearGradient></defs><path d="M45 0 C8 90 82 130 45 220 S8 350 45 440 82 570 45 660 8 790 45 880 82 960 45 1000" fill="none" stroke="url(#memoryWaveMobileGradient)" strokeWidth="3" strokeLinecap="round"/></svg>
              {monthMarkers.map(({ label, xIndex }) => { const [year, month] = label.split('-').map(Number); const date = new Date(year, month, 1); const x = ((xIndex + .5) / visible.length) * 100; return <span className="timeline-month-marker" key={label} style={{ left: `${x}%` }}>{date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>; })}
              <div className="timeline-nodes">{visible.map((entry, index) => {
              const info = emotionInfo(entry.emotion);
              const date = new Date(entry.entryDate);
              const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
              const shortDate = monthCounts[monthKey] > 1 ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
              const fullDate = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
              const label = `${info.label} memory, ${fullDate}: ${firstLine(entry)}`;
              const nodeX = ((index + .5) / visible.length) * 100;
              return (
                <button type="button" className={`memory-node ${selected?.id === entry.id ? 'is-selected' : ''}`} key={entry.id} style={{ '--emotion-color': info.color, '--node-index': index, '--node-x': `${nodeX}%`, '--node-y': index % 2 ? '100px' : '78px' } as CSSProperties} onClick={(event) => { selectedNodeRef.current = event.currentTarget; setSelected(entry); }} aria-label={label} title={selected ? undefined : label} aria-haspopup="dialog" aria-pressed={selected?.id === entry.id}>
                  <span className="memory-orb"><span><EmotionIcon emotion={info.value} size={22} /></span></span>
                  <span className="memory-node-copy"><small>{shortDate}</small><strong>{info.label}</strong><span className="memory-node-firstline">{firstLine(entry)}</span></span>
                  <span className="memory-node-tooltip"><strong>{firstLine(entry)}</strong><span><EmotionIcon emotion={info.value} size={13}/>{info.label} · {fullDate}</span></span>
                </button>
              );
            })}</div>
            </div>
          </div>
        )}

        {selected && (
          <Modal onClose={closeMemory} size="wide" overlayClassName="memory-preview-backdrop" className="memory-preview" contentRef={detailPanelRef} initialFocusRef={closeButtonRef} labelledBy="memory-preview-title" describedBy="memory-preview-date">
              <header className="memory-preview-header">
                <div className="memory-preview-heading-copy">
                  <p className="eyebrow" id="memory-preview-date"><CalendarDays size={13} /> Memory details</p>
                  <h2 id="memory-preview-title">{generatedTitle ? selectedDateLabel : selected.title || 'A saved memory'}</h2>
                  <span className="memory-current-emotion" style={{ '--emotion-color': emotionInfo(selected.emotion).color } as CSSProperties}><EmotionIcon emotion={emotionInfo(selected.emotion).value} />{emotionInfo(selected.emotion).label}</span>
                </div>
                <div className="memory-preview-navigation"><button type="button" aria-label="Previous memory" onClick={() => navigateMemory(-1)} disabled={selectedVisibleIndex <= 0}><ChevronLeft size={17}/></button><button type="button" aria-label="Next memory" onClick={() => navigateMemory(1)} disabled={selectedVisibleIndex < 0 || selectedVisibleIndex >= visible.length - 1}><ChevronRight size={17}/></button><button ref={closeButtonRef} type="button" className="memory-preview-close" aria-label="Close memory details" onClick={closeMemory} disabled={emotionSaving}><X size={18} /></button></div>
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
                  <div role="radiogroup" aria-label="Choose an emotion">{emotions.map((emotion) => <button type="button" role="radio" aria-checked={emotionDraft === emotion.value} tabIndex={emotionDraft === emotion.value ? 0 : -1} key={emotion.value} className={emotionDraft === emotion.value ? 'is-active' : ''} style={{ '--emotion-color': emotion.color } as CSSProperties} onKeyDown={activateRadioOnArrow} onClick={() => setEmotionDraft(emotion.value)} disabled={emotionSaving}><b aria-hidden="true"><EmotionIcon emotion={emotion.value} /></b>{emotion.label}</button>)}</div>
                  {!emotionDraft && <p className="memory-emotion-unlabeled"><EmotionIcon emotion={null}/> Unlabeled</p>}
                </section>
                {detailNotice && <p className="memory-detail-notice" role="status">{detailNotice}</p>}
                {toast && <p className="memory-detail-notice" role="status">{toast}</p>}
              </div>
              <footer className="memory-preview-actions">
                <button type="button" className="button button-secondary" onClick={() => void classify()} disabled={emotionSaving || detailLoading}><Sparkles size={15} /> {emotionSaving ? 'Updating…' : 'Classify again'}</button>
                <button type="button" className="button button-secondary" onClick={closeMemory} disabled={emotionSaving}>Cancel</button>
                <button type="button" className="button button-primary" onClick={() => void setManualEmotion()} disabled={emotionSaving || !emotionDraft || emotionDraft === selected.emotion}>Save</button>
                <Link className="memory-open-entry" href={`/my-diary?entry=${selected.id}`}>Open entry</Link>
              </footer>
          </Modal>
        )}
        {lightbox && <Modal onClose={() => setLightbox(null)} size="fluid" overlayClassName="memory-lightbox" className="memory-lightbox-content" ariaLabel="Attached photo" initialFocusRef={lightboxCloseRef}><button ref={lightboxCloseRef} type="button" className="memory-lightbox-close" aria-label="Close photo" onClick={() => setLightbox(null)}><X size={19} /></button><img src={lightbox.src} alt={lightbox.alt} /></Modal>}
      </section>
  );
}
