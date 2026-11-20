'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CalendarDays, Search, Sparkles, X } from 'lucide-react';
import { ApiError, diaryService } from '@/services/api';
import type { ApiDiaryEntry } from '@/types';
import AppLayout from '@/components/app-layout';

type Emotion = 'JOY' | 'SADNESS' | 'ANGER' | 'FEAR' | 'DISGUST' | 'ANXIETY';

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

  const setManualEmotion = async (emotion: Emotion) => {
    if (!selected) return;
    const updated = await diaryService.setEmotion(selected.id, emotion);
    setEntries((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    setSelected(updated);
  };

  const classify = async () => {
    if (!selected) return;
    const updated = await diaryService.classifyEmotion(selected.id);
    setEntries((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    setSelected(updated);
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
                <span>{emotion.icon}</span>{emotion.label}
              </button>
            ))}
          </div>
        </div>

        <aside className="memory-statistics" aria-label="Emotion summary">
          <div><span>Total memories</span><strong>{dateFiltered.length}</strong></div>
          {emotions.map((emotion) => <div key={emotion.value} style={{ '--emotion-color': emotion.color } as CSSProperties}><span>{emotion.icon} {emotion.label}</span><strong>{counts[emotion.value]}</strong></div>)}
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
                <button type="button" className="memory-node" key={entry.id} style={{ '--emotion-color': info.color, '--node-index': index } as CSSProperties} onClick={() => setSelected(entry)} aria-label={`Open memory: ${entry.title}`}>
                  <span className="memory-orb"><span>{info.icon}</span></span>
                  <span className="memory-node-copy"><small>{new Date(entry.entryDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</small><strong>{entry.title}</strong><span>{entry.preview}</span></span>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="memory-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
            <article className="memory-preview" role="dialog" aria-modal="true" aria-labelledby="memory-preview-title">
              <button type="button" className="memory-preview-close" aria-label="Close memory" onClick={() => setSelected(null)}><X size={18} /></button>
              <p className="eyebrow"><CalendarDays size={13} /> {new Date(selected.entryDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <h2 id="memory-preview-title">{selected.title}</h2>
              <p className="memory-preview-content">{selected.content}</p>
              {selected.photos?.length ? <div className="memory-preview-photos">{selected.photos.map((photo) => <img key={photo.id} src={photo.fullUrl ?? photo.thumbnailUrl} alt={photo.altText ?? 'Attached memory'} />)}</div> : null}
              <div className="memory-emotion-editor">
                <span>Assigned emotion</span>
                <div>{emotions.map((emotion) => <button type="button" key={emotion.value} className={selected.emotion === emotion.value ? 'is-active' : ''} style={{ '--emotion-color': emotion.color } as CSSProperties} onClick={() => void setManualEmotion(emotion.value)}><b>{emotion.icon}</b>{emotion.label}</button>)}</div>
              </div>
              <div className="memory-preview-actions">
                <button type="button" className="button button-secondary" onClick={() => void classify()}><Sparkles size={15} /> Classify again</button>
                <a className="button button-primary" href={`/my-diary?entry=${selected.id}`}>Open original diary entry</a>
              </div>
            </article>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
