'use client';

import {
  Archive, ArrowUp, ArrowUpRight, BookHeart, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, CloudRain, Flame, Grid2X2, Heart, Image as ImageIcon, KeyRound, Leaf,
  ImagePlus, List as ListIcon, Mic, MoreHorizontal, Music2, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Sun, Target, Trash2, UsersRound, X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from 'react';
import {
  activityService, beneficiaryService, dashboardService,
  diaryService, legacyPolicyService, settingsService, uploadDiaryPhoto, writingModeService, ApiError,
} from '@/services/api';
import type { ApiDiaryEntry, DashboardData } from '@/types';
import type { LegacyBeneficiary, LegacyPolicy, LegacyResourceCatalogItem } from '@/services/api';
import AuroraAtmosphere from '@/components/aurora-atmosphere';
import VoiceJournal from '@/components/voice-journal';
import LifeCountdownMonitor from '@/components/life-countdown-monitor';
import ProfileSettings from '@/components/profile-settings';
import Select from '@/components/ui/select';
import WishesEditor from '@/components/wishes-editor';
import FilesPage from '@/components/files-page';
import Modal from '@/components/modal';

function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; className?: string }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'slate' }) {
  return <span className={`badge badge-${tone}`}><span className="badge-dot" />{children}</span>;
}
function SectionHeading({ title, eyebrow, description, action }: { title: string; eyebrow: string; description: string; action?: ReactNode }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="section-description">{description}</p></div>{action}</div>;
}
function StateMessage({ title, message, retry }: { title: string; message: string; retry?: () => void }) {
  return <div className="panel error-state"><h2>{title}</h2><p>{message}</p>{retry && <Button variant="secondary" onClick={retry}>Try again</Button>}</div>;
}
function Empty({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><BookOpen size={22} /></div><h3>{title}</h3><p>{message}</p>{action}</div>;
}
function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
function formatRelativeTime(value?: string) {
  if (!value) return 'Updated recently';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Updated just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}
async function preparePhoto(file: File) {
  const image = new Image();
  image.src = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('This image could not be read.')); });
  const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(image.src);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('This image could not be prepared.')), file.type, .86));
}
function LiveEntryRow({ entry, onDelete }: { entry: ApiDiaryEntry; onDelete?: (entry: ApiDiaryEntry) => void }) {
  return <div className="entry-row"><div className="entry-date"><strong>{new Date(entry.entryDate).getDate()}</strong><span>{new Date(entry.entryDate).toLocaleString(undefined, { month: 'short' })}</span></div>{entry.photos?.[0] && <div className="entry-thumb-wrap"><img className="entry-thumb" src={entry.photos[0].thumbnailUrl} alt={entry.photos[0].altText ?? `Photo from ${formatDate(entry.entryDate)}`} loading="lazy" />{entry.photoCount && entry.photoCount > 1 ? <span className="entry-photo-badge">+{entry.photoCount - 1}</span> : null}</div>}<div className="entry-row-content"><div className="entry-title-line"><Link href={`/my-diary?entry=${entry.id}`}>{entry.title}</Link></div><p>{entry.preview || (entry.photoCount ? 'Photo entry' : '')}</p><div className="entry-meta"><span>{formatDate(entry.entryDate)}</span></div></div>{onDelete ? <button className="icon-button" aria-label={`Delete ${entry.title}`} onClick={() => onDelete(entry)}><MoreHorizontal size={18} /></button> : <ArrowUpRight size={17} className="row-arrow" />}</div>;
}
function DashboardView({ onWrite }: { onWrite: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null); const [error, setError] = useState<string | null>(null);
  const load = () => { dashboardService.get().then(setData).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to load dashboard.')); };
  useEffect(() => { load(); }, []);
  if (error) return <div className="dashboard-experience"><StateMessage title="Dashboard unavailable" message={error} retry={() => { setError(null); load(); }} /></div>;
  if (!data) return <div className="dashboard-experience"><div className="panel loading-state">Loading your private dashboard...</div></div>;
  const { stats, recentEntries } = data;
  return <div className="dashboard-experience"><AuroraAtmosphere /><section className="welcome-panel"><div className="welcome-copy"><p className="eyebrow light">Your private workspace</p><h1>A quiet place for<br /><em>what</em> matters.</h1><p>Keep the moments, lessons, and words you want to carry forward.</p><div className="welcome-actions"><Button onClick={onWrite}><Plus size={17} /> Write a diary entry</Button><a className="text-action" href="/ai-diary">Ask your assistant <ArrowUpRight size={16} /></a></div></div><div className="welcome-art" aria-hidden="true"><div className="planet-orbit orbit-back orbit-a"/><div className="planet-orbit orbit-back orbit-b"/><div className="hero-planet"><span/></div><div className="planet-orbit orbit-front orbit-a"/><div className="planet-orbit orbit-front orbit-b"/><i className="satellite satellite-one"/><i className="satellite satellite-two"/><i className="satellite satellite-three"/><span className="mood-orb mood-sun"><Sun/></span><span className="mood-orb mood-cloud"><CloudRain/></span><span className="mood-orb mood-leaf"><Leaf/></span><span className="mood-orb mood-flame"><Flame/></span><span className="mood-orb mood-target"><Target/></span></div></section><LifeCountdownMonitor /><div className="privacy-strip"><ShieldCheck size={19} /><div><strong>Your memories are private</strong></div><a href="/settings">Review profile <ArrowUpRight size={15} /></a></div><div className="stats-grid"><Stat icon={BookOpen} label="Diary entries" value={stats.entryCount} tone="blue" /><Stat icon={UsersRound} label="Beneficiaries" value={stats.beneficiaryCount} tone="lavender" /><Stat icon={KeyRound} label="Active policies" value={stats.activePolicyCount} tone="mint" /><Stat icon={Clock3} label="Recent activity" value={stats.recentActivityCount} tone="warm" /></div><div className="dashboard-grid"><div className="panel"><div className="panel-heading"><div><p className="eyebrow">Your memories</p><h2>Recent entries</h2></div><a className="subtle-link" href="/my-diary">View all <ArrowUpRight size={15} /></a></div><div className="entry-list">{recentEntries.length ? recentEntries.map((entry) => <LiveEntryRow key={entry.id} entry={entry} />) : <Empty title="Your diary is empty" message="Create your first entry to begin." action={<Button onClick={onWrite}><Plus size={16} /> New entry</Button>} />}</div></div><div className="panel release-panel"><div className="panel-heading"><div><p className="eyebrow">Legacy planning</p></div></div><div className="release-status"><div className="release-shield"><ShieldCheck size={23} /></div><div><strong>Authorization is server-side</strong><p>Policies and Prolog decide access.</p></div><Badge tone="blue">Verified</Badge></div><a className="subtle-link" href="/legacy-policy">Review policies <ArrowUpRight size={15} /></a></div></div></div>;
}
function Stat({ icon: Icon, label, value, tone }: { icon: typeof BookOpen; label: string; value: number; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><p>{label}</p><strong>{value}</strong></div>; }
function DiaryPhotoLightbox({ photos, index, entryDate, onClose, onIndex }: { photos: NonNullable<ApiDiaryEntry['photos']>; index: number; entryDate: string; onClose: () => void; onIndex: (index: number) => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onIndex((index + 1) % photos.length);
      if (event.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length);
      if (event.key === 'Tab') {
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [index, onClose, onIndex, photos.length]);
  const photo = photos[index];
  return <Modal onClose={onClose} className="diary-lightbox" size="fluid" ariaLabel="Photo viewer" contentRef={dialog}><button type="button" className="icon-button lightbox-close" aria-label="Close photo" onClick={onClose}><X size={20} /></button><img src={photo.fullUrl ?? photo.thumbnailUrl} alt={photo.altText ?? `Photo from ${formatDate(entryDate)}`} /><div className="lightbox-actions"><button type="button" aria-label="Previous photo" onClick={() => onIndex((index - 1 + photos.length) % photos.length)}>‹</button><span>{index + 1} / {photos.length}</span><button type="button" aria-label="Next photo" onClick={() => onIndex((index + 1) % photos.length)}>›</button></div></Modal>;
}
function DiaryPhoto({ photo, entryId, entryDate, onOpen }: { photo: NonNullable<ApiDiaryEntry['photos']>[number]; entryId: string; entryDate: string; onOpen: () => void }) {
  const [src, setSrc] = useState(photo.fullUrl ?? photo.thumbnailUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retried, setRetried] = useState(false);
  const refresh = async () => {
    setError(false);
    setLoading(true);
    try {
      const fresh = await diaryService.get(entryId);
      const match = fresh.photos?.find((item) => item.id === photo.id);
      if (match?.fullUrl) setSrc(`${match.fullUrl}${match.fullUrl.includes('?') ? '&' : '?'}retry=${Date.now()}`);
    } catch {
      setError(true);
      setLoading(false);
    }
  };
  const handleError = () => {
    if (!retried) { setRetried(true); void refresh(); }
    else { setLoading(false); setError(true); }
  };
  if (error) return <div className="diary-photo-error"><span>Couldn't load this photo</span><button type="button" onClick={() => void refresh()}>Retry</button></div>;
  return <button type="button" className="diary-photo-button" onClick={onOpen} aria-label={`Open photo: ${photo.altText ?? `Photo from ${formatDate(entryDate)}`}`}><span className={loading ? 'diary-photo-shimmer' : 'diary-photo-loaded'} /><img src={src} alt={photo.altText ?? `Photo from ${formatDate(entryDate)}`} width={photo.width} height={photo.height} loading="lazy" onLoad={() => setLoading(false)} onError={handleError} /></button>;
}
function DiaryEntryDialog({ entry, onClose, onSaved }: { entry: ApiDiaryEntry; onClose: () => void; onSaved: (entry: ApiDiaryEntry) => void }) {
  const [form, setForm] = useState({ content: entry.content });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await diaryService.update(entry.id, form);
      onSaved(updated);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to update entry.');
      setSaving(false);
    }
  };
  return <Modal onClose={onClose} className="dialog form-dialog" ariaLabel="Edit diary entry"><form onSubmit={save}><button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">Saved memory</p><h2>Edit diary entry</h2><label className="form-field"><span>Entry</span><textarea required rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></label><p className="field-help">Your original submitted content remains preserved in database history.</p>{error && <p className="field-error" role="alert">{error}</p>}<div className="dialog-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button></div></form></Modal>;
}
function DiaryReadingDialog({ entry, onClose, onEdit }: { entry: ApiDiaryEntry; onClose: () => void; onEdit: () => void }) {
  const dialog = useRef<HTMLElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (lightboxIndex !== null) return;
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea, input') ?? []);
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [lightboxIndex, onClose]);
  const date = new Date(entry.entryDate);
  const dateHeading = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return <>
    <Modal onClose={onClose} size="wide" labelledBy="diary-reader-title">
      <article ref={dialog} className="dialog diary-reader">
        <button type="button" className="icon-button dialog-close" aria-label="Close entry" onClick={onClose}><X size={18} /></button>
        <h1 id="diary-reader-title">{dateHeading}</h1>
        <p className="diary-reader-time">{time}</p>
        <div className="diary-reader-content">{entry.content}</div>
        {entry.photos?.length ? <div className="diary-photo-grid">{entry.photos.map((photo, index) => <DiaryPhoto key={photo.id} photo={photo} entryId={entry.id} entryDate={entry.entryDate} onOpen={() => setLightboxIndex(index)} />)}</div> : null}
        <div className="dialog-actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={onEdit}>Edit entry</Button></div>
      </article>
    </Modal>
    {lightboxIndex !== null && entry.photos?.length ? <DiaryPhotoLightbox photos={entry.photos} index={lightboxIndex} entryDate={entry.entryDate} onClose={() => setLightboxIndex(null)} onIndex={setLightboxIndex} /> : null}
  </>;
}
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function diaryDate(entry: ApiDiaryEntry) {
  const parsed = new Date(entry.entryDate);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = entry.createdAt ? new Date(entry.createdAt) : null;
  return fallback && !Number.isNaN(fallback.getTime()) ? fallback : null;
}
function entryDateLabel(entry: ApiDiaryEntry) { const date = diaryDate(entry); return date ? formatDate(date.toISOString()) : 'Date unavailable'; }
function groupDiaryByDay(entries: ApiDiaryEntry[]) {
  const groups = new Map<string, { label: string; entries: ApiDiaryEntry[] }>();
  for (const entry of entries) {
    const date = diaryDate(entry);
    const key = date ? dateKey(date) : 'unknown';
    const group = groups.get(key) ?? { label: date ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Date unavailable', entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
}

function DiaryView({ searchQuery = '', showSearch = false }: { searchQuery?: string; showSearch?: boolean }) {
  const [entries, setEntries] = useState<ApiDiaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({ favorites: false, withPhotos: false, withAudio: false, archived: false });
  const [sort, setSort] = useState<'newest' | 'oldest' | 'updated-newest'>('newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [target, setTarget] = useState<ApiDiaryEntry | null>(null);
  const [selected, setSelected] = useState<ApiDiaryEntry | null>(null);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true); else { setLoading(true); setError(null); }
    const params = new URLSearchParams({ page: String(nextPage), pageSize: viewMode === 'calendar' ? '100' : '20', sort });
    if (searchQuery) params.set('search', searchQuery);
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, 'true');
    if (viewMode === 'calendar') {
      const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
      const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0, 23, 59, 59, 999);
      params.set('from', start.toISOString());
      params.set('to', end.toISOString());
    }
    try {
      const result = await diaryService.list(`?${params}`);
      setEntries((current) => {
        if (!append) return result.entries;
        const loadedIds = new Set(current.map((entry) => entry.id));
        return [...current, ...result.entries.filter((entry) => !loadedIds.has(entry.id))];
      });
      setTotal(result.pagination.total);
      setPage(result.pagination.page);
      setHasMore(result.pagination.page < result.pagination.totalPages);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to load entries.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [calendarMonth, filters, searchQuery, sort, viewMode]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('entry'); if (!id) return; diaryService.get(id).then(setSelected).catch((reason) => setSelectedError(reason instanceof ApiError ? reason.message : 'Unable to load this entry.')); }, []);
  const remove = async () => { if (!target) return; try { await diaryService.remove(target.id); setTarget(null); if (selected?.id === target.id) setSelected(null); void load(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to delete entry.'); setTarget(null); } };
  const setFavorite = async (entry: ApiDiaryEntry) => { if (busyEntryId) return; setBusyEntryId(entry.id); setError(null); try { await diaryService.setFavorite(entry.id, !entry.isFavorite); await load(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to update favorite.'); } finally { setBusyEntryId(null); } };
  const setArchived = async (entry: ApiDiaryEntry, archived: boolean) => { if (busyEntryId) return; setBusyEntryId(entry.id); setError(null); try { if (archived) await diaryService.archive(entry.id); else await diaryService.restore(entry.id); await load(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : archived ? 'Unable to archive entry.' : 'Unable to restore entry.'); } finally { setBusyEntryId(null); } };
  const [draft, setDraft] = useState({ originalContent: '' }); const [editing, setEditing] = useState(false);
  const [photos, setPhotos] = useState<Array<{ id: string; name: string; preview: string; progress: number; error?: string }>>([]);
  const [voice, setVoice] = useState(false); const [voiceEntry, setVoiceEntry] = useState(false); const [transcript, setTranscript] = useState(''); const [sourceTranscript, setSourceTranscript] = useState(''); const [recording, setRecording] = useState(false); const [saving, setSaving] = useState(false); const [createError, setCreateError] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (entries.length === 0 && !searchQuery) editor.current?.focus(); }, [entries.length, searchQuery]);
  const setContent = (value: string) => { setDraft((current) => ({ ...current, originalContent: value })); if (editor.current) { editor.current.style.height = 'auto'; editor.current.style.height = `${Math.min(editor.current.scrollHeight, 192)}px`; } };
  const selectPhotos = async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (photos.length + selected.length > 5) { setCreateError('You can attach up to 5 photos.'); return; }
    const valid = selected.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (valid.length !== selected.length) { setCreateError('Photos must be JPG, PNG, or WebP and no larger than 5 MB each.'); }
    for (const file of valid) {
      const id = `${file.name}-${file.lastModified}`;
      let prepared: Blob;
      try { prepared = await preparePhoto(file); } catch (reason) { setCreateError(reason instanceof Error ? reason.message : 'This image could not be prepared.'); continue; }
      const preview = URL.createObjectURL(prepared);
      setPhotos((current) => [...current, { id, name: file.name, preview, progress: 0 }]);
      try {
        const uploaded = await uploadDiaryPhoto(prepared, file.name, (progress) => setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, progress } : photo)));
        setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, id: uploaded.public_id, progress: 100 } : photo));
      } catch (reason) {
        setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, error: reason instanceof Error ? reason.message : 'Upload failed.' } : photo));
      }
    }
  };
  const createEntry = async () => {
    const originalContent = draft.originalContent.trim();
    if (!originalContent && photos.length === 0) { setCreateError('Add text or at least one photo.'); return; }
    if (photos.some((photo) => photo.progress < 100 || photo.error)) { setCreateError('Wait for photos to finish uploading or remove failed photos.'); return; }
    if (voiceEntry && !sourceTranscript.trim()) { setCreateError('Transcribe your recording before saving the voice entry.'); return; }
    setSaving(true); setCreateError('');
    try { await diaryService.create({ originalContent, photoPublicIds: photos.map((photo) => photo.id), inputMethod: voiceEntry ? 'VOICE' : 'TEXT', ...(voiceEntry ? { transcript: sourceTranscript.trim() } : {}) }); photos.forEach((photo) => URL.revokeObjectURL(photo.preview)); setPhotos([]); setDraft({ originalContent: '' }); setTranscript(''); setSourceTranscript(''); setVoice(false); setVoiceEntry(false); setRecording(false); load(); }
    catch (reason) { setCreateError(reason instanceof ApiError ? reason.message : 'Unable to save entry.'); } finally { setSaving(false); }
  };
  const groups = useMemo(() => {
    const years = new Map<number | null, Map<number | null, ApiDiaryEntry[]>>();
    for (const entry of entries) {
      const date = diaryDate(entry);
      const year = date?.getFullYear() ?? null;
      const month = date?.getMonth() ?? null;
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year)!;
      if (!months.has(month)) months.set(month, []);
      months.get(month)!.push(entry);
    }
    return [...years.entries()].map(([year, months]) => ({ year, months: [...months.entries()].map(([month, monthEntries]) => ({ month, entries: monthEntries })) }));
  }, [entries]);
  const entriesByDate = useMemo(() => {
    const dates = new Map<string, ApiDiaryEntry[]>();
    for (const entry of entries) { const date = diaryDate(entry); if (!date) continue; const key = dateKey(date); const group = dates.get(key) ?? []; group.push(entry); dates.set(key, group); }
    return dates;
  }, [entries]);
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const calendarCells: Array<Date | null> = [...Array(monthStart.getDay()).fill(null), ...Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }, (_, index) => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1))];
  while (calendarCells.length % 7) calendarCells.push(null);
  const clearFilters = () => setFilters({ favorites: false, withPhotos: false, withAudio: false, archived: false });
  const activeFilters = Object.values(filters).some(Boolean);
  const renderEntry = (entry: ApiDiaryEntry, mode: 'list' | 'grid') => {
    const hasAudio = entry.inputMethod === 'VOICE' || entry.media?.some((media) => media.mediaType === 'AUDIO' || media.mediaType === 'VOICE_MESSAGE');
    return <article className={`diary-library-entry ${mode === 'grid' ? 'is-grid' : 'is-list'}`} key={entry.id}>
      {mode === 'grid' && entry.photos?.[0] ? <a className="diary-library-cover" href={`/my-diary?entry=${entry.id}`}><img src={entry.photos[0].thumbnailUrl} alt={entry.photos[0].altText ?? `Photo from ${entryDateLabel(entry)}`} loading="lazy" /></a> : mode === 'list' && entry.photos?.[0] ? <div className="diary-row-thumb"><img src={entry.photos[0].thumbnailUrl} alt={entry.photos[0].altText ?? `Photo from ${entryDateLabel(entry)}`} loading="lazy" />{entry.photoCount && entry.photoCount > 1 ? <span>+{entry.photoCount - 1}</span> : null}</div> : null}
      <a className="diary-library-copy" href={`/my-diary?entry=${entry.id}`}><strong>{entry.title || 'Untitled memory'}</strong><span>{entry.preview || (entry.photoCount ? 'Photo entry' : 'No preview available')}</span><small>{entryDateLabel(entry)}{entry.status === 'ARCHIVED' ? ' · Archived' : ''}</small></a>
      <div className="diary-library-indicators">{entry.photoCount ? <span title={`${entry.photoCount} photo${entry.photoCount === 1 ? '' : 's'}`}><ImageIcon size={14} />{entry.photoCount}</span> : null}{hasAudio ? <span title="Voice or audio entry"><Music2 size={14} />Audio</span> : null}</div>
      <div className="diary-library-actions">
        <button type="button" className={`diary-favorite-button${entry.isFavorite ? ' is-favorite' : ''}`} aria-label={entry.isFavorite ? `Remove ${entry.title} from favorites` : `Add ${entry.title} to favorites`} aria-pressed={Boolean(entry.isFavorite)} disabled={busyEntryId === entry.id} onClick={() => void setFavorite(entry)}><Heart size={17} fill={entry.isFavorite ? 'currentColor' : 'none'} /></button>
        {entry.status === 'ARCHIVED' ? <button type="button" className="icon-button" aria-label={`Restore ${entry.title}`} title="Restore from archive" disabled={busyEntryId === entry.id} onClick={() => void setArchived(entry, false)}><RotateCcw size={16} /></button> : <button type="button" className="icon-button" aria-label={`Archive ${entry.title}`} title="Archive entry" disabled={busyEntryId === entry.id} onClick={() => void setArchived(entry, true)}><Archive size={16} /></button>}
        <button type="button" className="icon-button diary-delete-button" aria-label={`Delete ${entry.title}`} title="Delete entry" onClick={() => setTarget(entry)}><Trash2 size={16} /></button>
      </div>
    </article>;
  };
  return <section className="diary-page"><h1 className="diary-access-title">My diary</h1><header className="diary-greeting"><p>What's on your mind today?</p><span>A quiet place for what matters.</span></header>
    <div className="diary-composer" onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void createEntry(); } }}>
      <div className="diary-compose-line" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void selectPhotos(event.dataTransfer.files); }} onPaste={(event) => { const pasted = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/')); if (pasted.length) void selectPhotos(pasted); }}>
        <button type="button" className="diary-round-button" aria-label="Add photo" onClick={() => photoInput.current?.click()}><ImagePlus size={18} /></button>
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { if (event.target.files) void selectPhotos(event.target.files); event.currentTarget.value = ''; }} />
        {photos.length > 0 && <div className="diary-photo-strip" aria-label={`${photos.length} of 5 photos selected`}><span className="diary-photo-count">{photos.length}/5</span>{photos.map((photo) => <div className="diary-photo-item" key={photo.id}><img src={photo.preview} alt={photo.name} /><button type="button" aria-label={`Remove ${photo.name}`} onClick={() => { URL.revokeObjectURL(photo.preview); if (photo.progress === 100 && !photo.error) void diaryService.discardPhoto(photo.id).catch(() => undefined); setPhotos((current) => current.filter((item) => item.id !== photo.id)); }}><X size={13} /></button>{photo.progress < 100 && !photo.error && <progress max="100" value={photo.progress} aria-label={`Uploading ${photo.name}`} />}{photo.error && <span className="field-error" role="alert">{photo.error}</span>}</div>)}</div>}
        {voice ? <div className="diary-voice-wrap"><VoiceJournal transcript={transcript} onTranscriptChange={setTranscript} onTranscribed={setSourceTranscript} onRecordingChange={setRecording} disabled={saving} /></div> : <textarea ref={editor} className="diary-textarea" aria-label="Diary entry" rows={1} maxLength={100000} placeholder="Write about your day, or add photos..." value={draft.originalContent} onChange={(event) => { if (voiceEntry) setSourceTranscript(''); setContent(event.target.value); }} />}
        {!voice && <button type="button" className={`diary-round-button diary-submit ${draft.originalContent.trim() ? 'has-text' : ''}`} aria-label={draft.originalContent.trim() ? 'Save diary entry' : 'Speak instead'} title={draft.originalContent.trim() ? 'Save diary entry' : 'Speak instead'} disabled={saving} onClick={() => { if (draft.originalContent.trim()) void createEntry(); else { setVoiceEntry(true); setVoice(true); } }}>{draft.originalContent.trim() ? <ArrowUp size={19} /> : <Mic size={18} />}</button>}
      </div>{voice && <div className="diary-voice-actions"><span className={recording ? 'recording-indicator' : ''}>{recording ? 'Recording…' : 'Voice entry'}</span><button type="button" aria-label="Cancel voice entry" onClick={() => { setVoice(false); setVoiceEntry(false); setTranscript(''); setSourceTranscript(''); setRecording(false); }}>×</button><button type="button" aria-label="Use transcription" disabled={!sourceTranscript} onClick={() => { setContent(transcript); setVoice(false); }}><Check size={17} /></button></div>}
      {createError && <p className="field-error" role="alert">{createError}</p>}<div className="diary-composer-foot"><span>Enter for a new line · Ctrl/Cmd + Enter to save</span>{(draft.originalContent.trim() || photos.length > 0) && <button type="button" onClick={() => void createEntry()} disabled={saving || photos.some((photo) => photo.progress < 100 && !photo.error)}>{saving ? 'Saving…' : 'Save diary entry'}</button>}</div>
    </div>
    {showSearch && <div className="diary-library-search-summary"><Search size={15} /><span>Results for <strong>{searchQuery}</strong></span>{!error && <span className="diary-entry-count">{total} {total === 1 ? 'entry' : 'entries'}</span>}</div>}
    <section className="diary-library-toolbar" aria-label="Diary organization">
      <div className="diary-library-toolbar-top"><strong>{filters.archived ? 'Archived entries' : 'Your entries'} {!error && <span>{total}</span>}</strong>
        <div className="diary-library-options">
          <label className="diary-sort-control"><span>Sort</span><Select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'updated-newest', label: 'Recently updated' }]} aria-label="Sort diary entries" /></label>
          <div className="diary-view-switch" role="group" aria-label="Diary view">
            <button type="button" aria-pressed={viewMode === 'list'} className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')}><ListIcon size={16} /><span>List</span></button>
            <button type="button" aria-pressed={viewMode === 'grid'} className={viewMode === 'grid' ? 'is-active' : ''} onClick={() => setViewMode('grid')}><Grid2X2 size={16} /><span>Grid</span></button>
            <button type="button" aria-pressed={viewMode === 'calendar'} className={viewMode === 'calendar' ? 'is-active' : ''} onClick={() => { setSelectedCalendarDate(''); setViewMode('calendar'); }}><CalendarDays size={16} /><span>Calendar</span></button>
          </div>
        </div>
      </div>
      <div className="diary-filter-controls" role="group" aria-label="Filter diary entries">
        <button type="button" className={!activeFilters ? 'is-active' : ''} aria-pressed={!activeFilters} onClick={clearFilters}>All entries</button>
        <button type="button" className={filters.favorites ? 'is-active' : ''} aria-pressed={filters.favorites} onClick={() => setFilters((current) => ({ ...current, favorites: !current.favorites }))}><Heart size={14} />Favorites</button>
        <button type="button" className={filters.withPhotos ? 'is-active' : ''} aria-pressed={filters.withPhotos} onClick={() => setFilters((current) => ({ ...current, withPhotos: !current.withPhotos }))}><ImageIcon size={14} />With photos</button>
        <button type="button" className={filters.withAudio ? 'is-active' : ''} aria-pressed={filters.withAudio} onClick={() => setFilters((current) => ({ ...current, withAudio: !current.withAudio }))}><Music2 size={14} />With audio</button>
        <button type="button" className={filters.archived ? 'is-active' : ''} aria-pressed={filters.archived} onClick={() => setFilters((current) => ({ ...current, archived: !current.archived }))}><Archive size={14} />Archived</button>
        {activeFilters && <button type="button" className="diary-clear-filters" onClick={clearFilters}>Clear filters</button>}
      </div>
    </section>
    {error ? <StateMessage title="Diary unavailable" message={error} retry={() => void load()} /> : loading ? <div className="diary-skeleton" role="status" aria-label="Loading diary entries"><i /><i /><i /></div> : !entries.length ? <div className="diary-empty-library"><BookHeart size={24} /><h2>{activeFilters || searchQuery ? 'No entries match these filters' : 'Your saved moments will find a home here.'}</h2><p>{activeFilters ? 'Try clearing one or more filters.' : searchQuery ? 'Try another search in the header.' : 'Write your first entry to begin.'}</p>{activeFilters && <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}</div> : viewMode === 'calendar' ? <section className="diary-calendar" aria-label="Diary calendar">
      <header className="diary-calendar-heading"><button type="button" className="icon-button" aria-label="Previous month" onClick={() => { setSelectedCalendarDate(''); setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1)); }}><ChevronLeft size={18} /></button><h2>{calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><button type="button" className="icon-button" aria-label="Next month" onClick={() => { setSelectedCalendarDate(''); setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1)); }}><ChevronRight size={18} /></button></header>
      <div className="diary-calendar-grid" role="grid" aria-label={calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="diary-calendar-weekday" role="columnheader" key={day}>{day}</span>)}{calendarCells.map((date, index) => { if (!date) return <span className="diary-calendar-blank" role="gridcell" key={'blank-' + index} />; const key = dateKey(date); const dayEntries = entriesByDate.get(key) ?? []; return <button type="button" role="gridcell" key={key} className={'diary-calendar-day' + (selectedCalendarDate === key ? ' is-selected' : '') + (dayEntries.length ? ' has-entries' : '')} aria-label={date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + (dayEntries.length ? ', ' + dayEntries.length + ' entries' : ', no entries')} aria-pressed={selectedCalendarDate === key} onClick={() => setSelectedCalendarDate(key)}><span>{date.getDate()}</span>{dayEntries.length > 0 && <small>{dayEntries.length}</small>}</button>; })}</div>
      {selectedCalendarDate && <div className="diary-calendar-selected"><h3>{new Date(selectedCalendarDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} <span>{entriesByDate.get(selectedCalendarDate)?.length ?? 0}</span></h3>{entriesByDate.get(selectedCalendarDate)?.length ? entriesByDate.get(selectedCalendarDate)!.map((entry) => renderEntry(entry, 'list')) : <p>No entries on this date.</p>}</div>}
    </section> : <div className={'diary-library-results is-' + viewMode}>
      {groups.map(({ year, months }) => <section className="diary-year-group" key={year ?? 'unknown-year'}><h2>{year ?? 'Date unavailable'}</h2>{months.map(({ month, entries: monthEntries }) => { const monthKey = (year ?? 'unknown') + '-' + (month ?? 'unknown'); const monthLabel = year === null || month === null ? 'Date unavailable' : new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long' }); const collapsed = Boolean(collapsedMonths[monthKey]); const days = groupDiaryByDay(monthEntries); return <section className="diary-month-group" key={monthKey}><button type="button" className="diary-month-toggle" aria-expanded={!collapsed} onClick={() => setCollapsedMonths((current) => ({ ...current, [monthKey]: !current[monthKey] }))}><span>{monthLabel}</span><small>{monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'}</small><ChevronRight size={16} /></button>{!collapsed && (viewMode === 'grid' ? <div className="diary-library-grid">{monthEntries.map((entry) => renderEntry(entry, 'grid'))}</div> : <div className="diary-month-days">{days.map((day) => <section className="diary-day-group" key={day.key}><h3>{day.label}<span>{day.entries.length}</span></h3><div>{day.entries.map((entry) => renderEntry(entry, 'list'))}</div></section>)}</div>)}</section>; })}</section>)}
    </div>}
    {hasMore && <div className="diary-load-more"><Button variant="secondary" disabled={loadingMore} onClick={() => void load(page + 1, true)}>{loadingMore ? 'Loading entries…' : 'Load more entries'}</Button><span>Showing {entries.length} of {total}</span></div>}    {target && <Modal onClose={() => setTarget(null)} ariaLabel="Delete diary entry"><div className="dialog"><div className="dialog-icon"><Trash2 size={20} /></div><h2>Delete this entry?</h2><p>This removes the entry from your diary. You can archive it instead to keep it recoverable.</p><div className="dialog-actions"><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete entry</Button></div></div></Modal>}{selectedError && <StateMessage title="Entry unavailable" message={selectedError} />}{selected && (editing ? <DiaryEntryDialog entry={selected} onClose={() => setEditing(false)} onSaved={(updated) => { setSelected(updated); setEditing(false); setEntries((current) => current.map((item) => item.id === updated.id ? updated : item)); }} /> : <DiaryReadingDialog entry={selected} onClose={() => setSelected(null)} onEdit={() => setEditing(true)} />)}</section>;
}
function BeneficiaryView() {
  const [records, setRecords] = useState<Array<{ id: string; fullName: string; email: string; relationship: string; status: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await beneficiaryService.list();
      setRecords(result.beneficiaries);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to load beneficiaries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  const [toast, setToast] = useState('');
  const [resendingId, setResendingId] = useState('');
  const resend = async (person: { id: string }) => {
    setResendingId(person.id); setToast('');
    try { await legacyPolicyService.resendInvitation(person.id); setToast('Invitation email sent.'); }
    catch (reason) { setToast(reason instanceof ApiError ? reason.message : 'Unable to resend invitation.'); }
    finally { setResendingId(''); }
  };

  return <><SectionHeading eyebrow="People you trust" title="Beneficiaries" description="" action={<Button onClick={() => setShowForm(true)}><Plus size={17} /> Add beneficiary</Button>} />{error ? <StateMessage title="Beneficiaries unavailable" message={error} retry={() => { void load(); }} /> : loading ? <div className="panel loading-state" role="status">Loading beneficiaries...</div> : <div className="beneficiary-grid">{records.length ? records.map((person) => <div className="panel beneficiary-card" key={person.id}><div className="person-avatar">{person.fullName.split(' ').map((part) => part[0]).join('')}</div><h2>{person.fullName}</h2><p>{person.relationship} · {person.email}</p><Badge tone={(person.status === 'ACCEPTED' || person.status === 'VERIFIED') ? 'green' : person.status === 'DECLINED' ? 'slate' : 'amber'}>{person.status.charAt(0) + person.status.slice(1).toLowerCase()}</Badge>{!(person.status === 'ACCEPTED' || person.status === 'VERIFIED') && <Button variant="secondary" disabled={resendingId === person.id} onClick={() => void resend(person)}>{resendingId === person.id ? 'Sending…' : 'Resend invitation'}</Button>}</div>) : <div className="panel"><Empty title="No beneficiaries" message="Add a beneficiary." /></div>}</div>}{toast && <p className="field-help" role="status">{toast}</p>}{showForm && <BeneficiaryForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setToast('Invitation email sent.'); void load(); }} />}</>;
}
function BeneficiaryForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', relationship: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true); setError('');
    try { await beneficiaryService.create(form); onSaved(); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to send invitation.'); }
    finally { setSubmitting(false); }
  };
  return <Modal onClose={onClose} className="dialog form-dialog" ariaLabel="Add someone you trust"><button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">New beneficiary</p><h2>Add someone you trust</h2>{(['fullName', 'email', 'relationship'] as const).map((field) => <label className="form-field" key={field}><span>{field === 'fullName' ? 'Full name' : field === 'email' ? 'Email address' : 'Relationship'}</span><input required type={field === 'email' ? 'email' : 'text'} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}{error && <p className="field-error" role="alert">{error}</p>}<div className="dialog-actions"><Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button><Button onClick={submit} disabled={submitting}>{submitting ? 'Sending…' : 'Send invitation'}</Button></div></Modal>;
}
function PolicyView() {
  const [policies, setPolicies] = useState<LegacyPolicy[]>([]); const [beneficiaries, setBeneficiaries] = useState<LegacyBeneficiary[]>([]);
  const [resourceCatalog, setResourceCatalog] = useState<LegacyResourceCatalogItem[]>([]); const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [partialWarning, setPartialWarning] = useState(''); const [dialog, setDialog] = useState(false); const [editing, setEditing] = useState<LegacyPolicy | null>(null); const [menu, setMenu] = useState<string | null>(null); const [logs, setLogs] = useState<Awaited<ReturnType<typeof legacyPolicyService.audit>> | null>(null); const [formError, setFormError] = useState(''); const [saveNotice, setSaveNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', beneficiaryId: '', scopeType: 'all_entries', scopeCategories: 'Reflections', entryIds: '', scopeDateFrom: '', scopeDateTo: '', excludedEntryIds: '', releaseMethod: 'owner_manual', releaseAt: '', verifierBeneficiaryId: '', coolingOffDays: '7', expiresAt: '' });
  const [newBeneficiary, setNewBeneficiary] = useState(false); const [beneficiaryForm, setBeneficiaryForm] = useState({ fullName: '', email: '', relationship: '' });
  const load = async () => { setLoading(true); setError(''); setPartialWarning(''); const [policyResult, beneficiaryResult, resourceResult] = await Promise.allSettled([legacyPolicyService.list(), legacyPolicyService.listBeneficiaries(), legacyPolicyService.resourceCatalog()]); if (policyResult.status === 'rejected') { setError('Unable to load access policies. Please try again.'); } else { setPolicies(policyResult.value); } if (beneficiaryResult.status === 'fulfilled') setBeneficiaries(beneficiaryResult.value); if (resourceResult.status === 'fulfilled') { setResourceCatalog(resourceResult.value.resources); if (resourceResult.value.partial) setPartialWarning(resourceResult.value.warning ?? 'Some optional resources could not be loaded.'); } const degraded = beneficiaryResult.status === 'rejected' || resourceResult.status === 'rejected' || (resourceResult.status === 'fulfilled' && resourceResult.value.partial); if (degraded) setPartialWarning('Policies are available, but some optional lists could not be loaded.'); setLoading(false); };
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (!dialog && !logs) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setDialog(false); setLogs(null); setMenu(null); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [dialog, logs]);
  const startCreate = () => { setSaveNotice(''); setEditing(null); setSelectedResources([]); setForm({ name: '', description: '', beneficiaryId: beneficiaries.find((b) => b.status !== 'REVOKED')?.id ?? '', scopeType: 'all_entries', scopeCategories: 'Reflections', entryIds: '', scopeDateFrom: '', scopeDateTo: '', excludedEntryIds: '', releaseMethod: 'owner_manual', releaseAt: '', verifierBeneficiaryId: '', coolingOffDays: '7', expiresAt: '' }); setFormError(''); setDialog(true); };
  const startEdit = (policy: LegacyPolicy) => { setSaveNotice(''); setEditing(policy); setSelectedResources((policy.resources ?? []).map((item) => `${item.resourceType}:${item.resourceId}`)); setForm({ name: policy.name, description: policy.description ?? '', beneficiaryId: policy.beneficiaryId, scopeType: policy.scopeType, scopeCategories: policy.scopeCategories?.join(', ') ?? '', entryIds: policy.entryLinks.map((l) => l.entryId).join(', '), scopeDateFrom: policy.scopeDateFrom?.slice(0, 10) ?? '', scopeDateTo: policy.scopeDateTo?.slice(0, 10) ?? '', excludedEntryIds: policy.excludedEntryIds.join(', '), releaseMethod: policy.releaseMethod, releaseAt: policy.releaseAt?.slice(0, 10) ?? '', verifierBeneficiaryId: '', coolingOffDays: String(policy.coolingOffDays), expiresAt: policy.expiresAt?.slice(0, 10) ?? '' }); setFormError(''); setDialog(true); };
  const save = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setBusy(true); setFormError(''); const payload = { name: form.name, description: form.description || null, beneficiaryId: form.beneficiaryId, scopeType: form.scopeType, scopeCategories: form.scopeType === 'categories' ? form.scopeCategories.split(',').map((x) => x.trim()).filter(Boolean) : undefined, entryIds: form.scopeType === 'selected_entries' ? form.entryIds.split(',').map((x) => x.trim()).filter(Boolean) : undefined, resources: resourceCatalog.filter((item) => selectedResources.includes(`${item.resourceType}:${item.resourceId}`)).map(({ resourceType, resourceId }) => ({ resourceType, resourceId })), scopeDateFrom: form.scopeDateFrom || null, scopeDateTo: form.scopeDateTo || null, excludedEntryIds: form.excludedEntryIds.split(',').map((x) => x.trim()).filter(Boolean), releaseMethod: form.releaseMethod, releaseAt: form.releaseAt ? `${form.releaseAt}T00:00:00.000Z` : null, verifierBeneficiaryId: form.releaseMethod === 'trusted_verifier' ? form.verifierBeneficiaryId : null, coolingOffDays: Number(form.coolingOffDays), expiresAt: form.expiresAt || null }; try { if (editing) await legacyPolicyService.update(editing.id, payload); else await legacyPolicyService.create(payload); setDialog(false); setSaveNotice(editing ? 'Policy updated.' : 'Policy saved as a draft.'); await load(); } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to save the policy.'); } finally { setBusy(false); } };
  const activate = async (policy: LegacyPolicy) => { const password = window.prompt(`Re-enter your password to activate “${policy.name}”.`); if (!password) return; try { await legacyPolicyService.activate(policy.id, password); await load(); } catch (reason) { window.alert(reason instanceof ApiError ? reason.message : 'Unable to activate policy.'); } };
  const revoke = async (policy: LegacyPolicy) => { if (!window.confirm(`Revoke “${policy.name}” immediately? This cannot be undone.`)) return; const password = window.prompt(`Re-enter your password to revoke “${policy.name}”.`); if (!password) return; try { await legacyPolicyService.revoke(policy.id, password); await load(); } catch (reason) { window.alert(reason instanceof ApiError ? reason.message : 'Unable to revoke policy.'); } };
  const requestRelease = async (policy: LegacyPolicy) => { const password = policy.releaseMethod === 'owner_manual' ? window.prompt(`Re-enter your password to request release of “${policy.name}”.`) : undefined; if (policy.releaseMethod === 'owner_manual' && !password) return; try { await legacyPolicyService.requestRelease(policy.id, password || undefined); await load(); } catch (reason) { window.alert(reason instanceof ApiError ? reason.message : 'Unable to request release.'); } };
  const addBeneficiary = async () => { try { const result = await legacyPolicyService.createBeneficiary(beneficiaryForm); const record = result.beneficiary; setBeneficiaries((all) => [record, ...all]); setForm((current) => ({ ...current, beneficiaryId: record.id })); setNewBeneficiary(false); setBeneficiaryForm({ fullName: '', email: '', relationship: '' }); } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to add beneficiary.'); } };
  const scopeSummary = (policy: LegacyPolicy) => { const base = policy.scopeType === 'categories' ? `Categories: ${policy.scopeCategories?.join(', ') ?? 'None'}` : policy.scopeType === 'selected_entries' ? `${policy.entryLinks.length} selected entries` : 'All shareable entries'; const dates = policy.scopeDateFrom || policy.scopeDateTo ? ` · ${policy.scopeDateFrom ? new Date(policy.scopeDateFrom).toLocaleDateString() : 'Any date'} to ${policy.scopeDateTo ? new Date(policy.scopeDateTo).toLocaleDateString() : 'present'}` : ''; return `${base}${dates}${policy.excludedEntryIds.length ? ` · ${policy.excludedEntryIds.length} excluded` : ''}`; };
  const postpone = async (policy: LegacyPolicy) => {
    const next = window.prompt('New release date (YYYY-MM-DD)', policy.releaseAt?.slice(0, 10) ?? '');
    if (!next) return;
    try { await legacyPolicyService.postpone(policy.id, `${next}T00:00:00.000Z`); await load(); }
    catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to postpone this policy.'); }
  };
  return <><SectionHeading eyebrow="Legacy Policy Language" title="Access policies" description="Choose what a beneficiary may read and when access can be released." action={<Button onClick={startCreate}><Plus size={16} /> Create policy</Button>} />{saveNotice && <p className="policy-success" role="status">{saveNotice}</p>}<div className="policy-banner"><ShieldCheck size={21} /><div><strong>The browser never grants access or decides beneficiary permissions.</strong></div></div>
    {partialWarning && <p role="status" className="muted">{partialWarning}</p>}{loading ? <div className="panel policy-list" role="status" aria-label="Loading policies"><div className="diary-skeleton"><i /><i /><i /></div></div> : error ? <StateMessage title="Policies unavailable" message={error} retry={() => void load()} /> : policies.length === 0 ? <div className="panel policy-list"><Empty title="No policies yet" message="Create a policy to define what a verified beneficiary may access." action={<Button onClick={startCreate}><Plus size={16} /> Create policy</Button>} /></div> : <div className="policy-grid">{policies.map((policy) => <article className="panel policy-card" key={policy.id}><div className="policy-card-heading"><div><h2>{policy.name}</h2><span className={`badge badge-${policy.status === 'ACTIVE' || policy.status === 'RELEASED' ? 'green' : 'slate'}`}>{policy.status.toLowerCase()}</span></div><div className="policy-menu-wrap"><button className="icon-button" aria-label={`Actions for ${policy.name}`} aria-expanded={menu === policy.id} onClick={() => setMenu(menu === policy.id ? null : policy.id)}><MoreHorizontal size={18} /></button>{menu === policy.id && <div className="policy-menu">{['DRAFT', 'PAUSED'].includes(policy.status) && <button onClick={() => { setMenu(null); startEdit(policy); }}>Edit</button>}{policy.status === 'ACTIVE' ? <button onClick={async () => { setMenu(null); await legacyPolicyService.pause(policy.id); await load(); }}>Pause</button> : ['DRAFT', 'PAUSED'].includes(policy.status) ? <button onClick={() => { setMenu(null); void activate(policy); }} disabled={policy.beneficiary.status !== 'VERIFIED'}>Activate</button> : null}{policy.status !== 'REVOKED' && <button onClick={() => { setMenu(null); void revoke(policy); }}>Revoke</button>}<button onClick={async () => { setMenu(null); setLogs(await legacyPolicyService.audit(policy.id)); }}>View audit log</button></div>}</div></div><p className="policy-beneficiary">{policy.beneficiary.fullName} · {policy.beneficiary.email}</p>    <dl><div><dt>Scope</dt><dd>{scopeSummary(policy)}</dd></div><div><dt>Release</dt><dd>{policy.releaseMethod.replaceAll('_', ' ')} · {policy.coolingOffDays}-day wait</dd></div>{policy.releaseReadyAt && <div><dt>Cooling off until</dt><dd>{new Date(policy.releaseReadyAt).toLocaleString()}</dd></div>}{policy.releaseMethod === 'scheduled_date' && policy.releaseAt && <div><dt>Next release</dt><dd>{new Date(policy.releaseAt).toLocaleString()}</dd></div>}</dl>{['ACTIVE','PAUSED','DRAFT'].includes(policy.status) && policy.releaseMethod === 'scheduled_date' && policy.releaseAt && <div className="policy-inline-beneficiary"><Button variant="secondary" onClick={() => void postpone(policy)}>Postpone</Button>{policy.status !== 'DRAFT' && <Button variant="secondary" onClick={() => void revoke(policy)}>Cancel</Button>}</div>}{policy.status === 'ACTIVE' && policy.releaseReadyAt && <Button variant="secondary" onClick={async () => { await legacyPolicyService.cancelRelease(policy.id); await load(); }}>Cancel pending release</Button>}{policy.status === 'ACTIVE' && !policy.releaseReadyAt && policy.releaseMethod !== 'scheduled_date' && <Button variant="secondary" onClick={() => void requestRelease(policy)}>Request release</Button>}</article>)}</div>}
    {dialog && <Modal onClose={() => setDialog(false)} size="wide" overlayClassName="policy-editor-backdrop" labelledBy="policy-editor-title"><form className="dialog form-dialog policy-editor-dialog" aria-busy={busy} onSubmit={save}><header className="policy-editor-header"><div><p className="eyebrow">Access policy</p><h2 id="policy-editor-title">Access Policy Details</h2><p>Configure which personal content becomes accessible under this policy and when it can be released.</p></div><button type="button" className="icon-button" onClick={() => setDialog(false)} aria-label="Close policy editor" disabled={busy}><X size={18} /></button></header><div className="policy-editor-content">
      <label className="form-field"><span>Policy name</span><input required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="form-field"><span>Beneficiary</span><Select required value={form.beneficiaryId} onChange={(e) => setForm({ ...form, beneficiaryId: e.target.value })} options={[{ value: '', label: 'Choose a beneficiary', placeholder: true }, ...beneficiaries.filter((b) => b.status !== 'REVOKED' && b.status !== 'REMOVED').map((b) => ({ value: b.id, label: `${b.fullName} · ${b.status.toLowerCase()}` }))]} /></label><button type="button" className="subtle-link" onClick={() => setNewBeneficiary(!newBeneficiary)}>+ Add beneficiary</button>{newBeneficiary && <div className="policy-inline-beneficiary"><label className="form-field"><span>Name</span><input value={beneficiaryForm.fullName} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, fullName: e.target.value })} /></label><label className="form-field"><span>Email</span><input type="email" value={beneficiaryForm.email} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, email: e.target.value })} /></label><label className="form-field"><span>Relationship</span><input value={beneficiaryForm.relationship} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, relationship: e.target.value })} /></label><Button type="button" variant="secondary" onClick={() => void addBeneficiary()}>Save beneficiary</Button><small>Invite delivery is not configured. This beneficiary must be verified before activation.</small></div>}
      <section className="policy-editor-section"><h3>What can they see?</h3><label className="form-field"><span>Scope</span><Select value={form.scopeType} onChange={(e) => setForm({ ...form, scopeType: e.target.value })} options={[{ value: 'all_entries', label: 'All shareable entries' }, { value: 'categories', label: 'Selected categories' }, { value: 'selected_entries', label: 'Selected entries (IDs)' }]} /></label>{form.scopeType === 'categories' && <label className="form-field"><span>Categories (comma separated)</span><input value={form.scopeCategories} onChange={(e) => setForm({ ...form, scopeCategories: e.target.value })} /></label>}{form.scopeType === 'selected_entries' && <label className="form-field"><span>Entry IDs (comma separated)</span><input value={form.entryIds} onChange={(e) => setForm({ ...form, entryIds: e.target.value })} /></label>}<label className="form-field"><span>Excluded entry IDs (optional)</span><input placeholder="Enter IDs separated by commas" value={form.excludedEntryIds} onChange={(e) => setForm({ ...form, excludedEntryIds: e.target.value })} /></label><div className="policy-inline-beneficiary policy-date-range"><label className="form-field"><span>From date (optional)</span><input type="date" value={form.scopeDateFrom} onChange={(e) => setForm({ ...form, scopeDateFrom: e.target.value })} /></label><label className="form-field"><span>Through date (optional)</span><input type="date" value={form.scopeDateTo} onChange={(e) => setForm({ ...form, scopeDateTo: e.target.value })} /></label></div></section>
      <fieldset className="legacy-resource-picker"><legend>Other content to release</legend>{resourceCatalog.length ? resourceCatalog.map((resource) => { const key = `${resource.resourceType}:${resource.resourceId}`; return <label key={key} className={`legacy-resource-card${selectedResources.includes(key) ? ' is-selected' : ''}`}><input type="checkbox" checked={selectedResources.includes(key)} onChange={(event) => setSelectedResources((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key))} /><span className="legacy-resource-copy"><strong>{resource.title}</strong><em>{resource.resourceType === 'WISHES' ? 'Letter of Wishes' : resource.resourceType === 'PLAYLIST' ? 'Playlist' : 'File'}</em><small>{resource.detail}</small></span></label>; }) : <p>No files, playlists, or letters are available to add.</p>}</fieldset>
      <section className="policy-editor-section policy-release-section"><h3>When can it be released?</h3><label className="form-field"><span>Release method</span><Select value={form.releaseMethod} onChange={(e) => setForm({ ...form, releaseMethod: e.target.value })} options={[{ value: 'owner_manual', label: 'Owner confirms release' }, { value: 'scheduled_date', label: 'Scheduled date' }, { value: 'trusted_verifier', label: 'Trusted verifier' }]} /></label>{form.releaseMethod === 'scheduled_date' && <label className="form-field"><span>Release date</span><input type="date" value={form.releaseAt} onChange={(e) => setForm({ ...form, releaseAt: e.target.value })} required /></label>}{form.releaseMethod === 'trusted_verifier' && <label className="form-field"><span>Verified trusted beneficiary</span><Select value={form.verifierBeneficiaryId} onChange={(e) => setForm({ ...form, verifierBeneficiaryId: e.target.value })} options={[{ value: '', label: 'Choose verifier', placeholder: true }, ...beneficiaries.filter((b) => b.status === 'ACCEPTED' || (b.status === 'ACCEPTED' || b.status === 'VERIFIED')).map((b) => ({ value: b.id, label: b.fullName }))]} /></label>}<label className="form-field"><span>Cooling-off days (minimum 3)</span><input type="number" min={3} max={365} value={form.coolingOffDays} onChange={(e) => setForm({ ...form, coolingOffDays: e.target.value })} /></label><label className="form-field"><span>Access expires (optional)</span><input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label></section>
      </div><footer className="policy-editor-footer"><p className="policy-summary">{form.releaseMethod === 'scheduled_date' && form.releaseAt ? `On ${new Date(`${form.releaseAt}T00:00:00`).toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone}), ${beneficiaries.find((b) => b.id === form.beneficiaryId)?.fullName || 'the beneficiary'} will be emailed a link. You'll get reminders ${form.coolingOffDays} days before and 1 day before, and you can postpone or cancel any time.` : `${form.name || 'This policy'} will let ${beneficiaries.find((b) => b.id === form.beneficiaryId)?.fullName || 'the beneficiary'} read ${form.scopeType === 'categories' ? `${form.scopeCategories} entries` : form.scopeType === 'selected_entries' ? 'the selected entries' : 'shareable entries'} after ${form.releaseMethod.replaceAll('_', ' ')} and a ${form.coolingOffDays}-day waiting period. You can cancel release during the waiting period.`}</p>{formError && <p className="field-error" role="alert">{formError}</p>}<div className="dialog-actions"><Button type="button" variant="secondary" onClick={() => setDialog(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save draft'}</Button></div></footer></form></Modal>}
    {logs && <Modal onClose={() => setLogs(null)} className="dialog policy-audit-dialog" labelledBy="policy-audit-title"><button type="button" className="icon-button dialog-close" onClick={() => setLogs(null)} aria-label="Close audit log"><X size={18} /></button><p className="eyebrow">Security history</p><h2 id="policy-audit-title">Audit log</h2>{logs.length ? <ol>{logs.map((log) => <li key={log.id}><strong>{log.action.replaceAll('_', ' ').toLowerCase()}</strong><span>{new Date(log.createdAt).toLocaleString()}</span></li>)}</ol> : <p>No audit events recorded.</p>}</Modal>}
  </>;
}
function ActivityView() { const [items, setItems] = useState<Array<{ id: string; action: string; resourceType: string; result: string; createdAt: string }>>([]); const [error, setError] = useState(''); useEffect(() => { activityService.list().then((result) => setItems(result.activities)).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to load activity.')); }, []); return <><SectionHeading eyebrow="A clear record" title="Activity logs" description="Security events retrieved from your owner-scoped audit log." />{error ? <StateMessage title="Activity unavailable" message={error} /> : <div className="panel activity-panel"><div className="activity-table"><div className="table-head"><span>Activity</span><span>Resource</span><span>Result</span><span>Date</span></div>{items.length ? items.map((item) => <div className="table-row" key={item.id}><div className="activity-action"><span className="activity-icon"><Check size={14} /></span><strong>{item.action}</strong></div><span>{item.resourceType}</span><Badge tone={item.result === 'ALLOWED' ? 'green' : 'amber'}>{item.result}</Badge><span>{formatDate(item.createdAt)}</span></div>) : <Empty title="No activity yet" message="Important account actions will appear here." />}</div></div>}</>; }
function AssistantView() { return <><SectionHeading eyebrow="Your diary companion" title="Chat with Memo" description="Memo is available anywhere in your private workspace." /><div className="panel assistant-page-card"><span className="assistant-page-icon"><Sparkles size={21} /></span><h2>Continue with Memo</h2><p>Choose AI Buddy for everyday conversation or Diary Assistant to explore your own saved memories. Your active conversation stays with you as you move around MemoSphere.</p><Button onClick={() => window.dispatchEvent(new Event('alaala:assistant-open'))}><Sparkles size={16} /> Ask Memo</Button></div></>; }
function WritingView() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'VERBATIM' | 'LIGHT_FIX' | 'REVIEW'>('LIGHT_FIX');
  const [instruction, setInstruction] = useState('');
  const [consent, setConsent] = useState(false);
  const [output, setOutput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(false);
  const [entries, setEntries] = useState<ApiDiaryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [sourceEntry, setSourceEntry] = useState<ApiDiaryEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectingEntryId, setSelectingEntryId] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const grow = () => { if (editor.current) { editor.current.style.height = 'auto'; editor.current.style.height = `${Math.min(editor.current.scrollHeight, 420)}px`; } };
    grow();
  }, [text]);
  useEffect(() => {
    if (!text) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [text]);
  const openPicker = async () => {
    setPicker(true);
    setPickerLoading(true);
    setEntries([]);
    try {
      const result = await diaryService.list('?page=1&pageSize=100&sort=updated-newest');
      setEntries(result.entries);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to load saved entries.'); }
    finally { setPickerLoading(false); }
  };
  const chooseSavedEntry = async (id: string) => {
    setSelectingEntryId(id);
    setError('');
    try {
      const latest = await diaryService.get(id);
      setText(latest.content || latest.normalizedContent || latest.originalContent);
      setSourceEntry(latest);
      setPicker(false);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to load the latest entry text.');
    } finally {
      setSelectingEntryId('');
    }
  };
  const friendlyError = (reason: unknown) => {
    if (reason instanceof ApiError) {
      if (reason.status === 429) return 'Try again in a minute';
      if (/no suggested|empty response|returned no/i.test(reason.message)) return 'Gemini returned an empty response. Please retry.';
      if (/blocked|safety/i.test(reason.message)) return 'The model blocked this text. Please revise it and retry.';
      if (reason.status === 502) return 'The model could not process this text. Please retry.';
      if (reason.status === 503) return 'Gemini is unavailable. Please retry.';
      return reason.message;
    }
    return 'Network failure. Check your connection and retry.';
  };
  const process = async () => {
    if (!text.trim() || (mode !== 'VERBATIM' && !consent)) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setProcessing(true); setError('');
    try {
      const result = await writingModeService.process({
        mode,
        text,
        instruction: instruction.trim() || undefined,
        consent: mode !== 'VERBATIM' ? consent : undefined,
        consentToGemini: mode !== 'VERBATIM' ? consent : undefined,
      }, controller.signal);
      const next = result.text ?? result.version.processedContent;
      if (!next?.trim()) { setError('Gemini returned an empty response. Please retry.'); return; }
      setOutput(next);
      setHistory((current) => [next, ...current.filter((item) => item !== next)].slice(0, 3));
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') setError('Processing cancelled.');
      else setError(friendlyError(reason));
    } finally { setProcessing(false); abortRef.current = null; }
  };
  const saveNew = async () => {
    if (!output.trim()) return;
    setSaving(true); setError('');
    try { await diaryService.create({ originalContent: output, inputMethod: 'TEXT' }); setOutput(''); setHistory([]); setSourceEntry(null); setText(''); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to save as a new entry.'); }
    finally { setSaving(false); }
  };
  const saveRevision = async () => {
    if (!sourceEntry || !output.trim()) return;
    setSaving(true); setError('');
    try {
      await writingModeService.saveRevision(sourceEntry.id, {
        writingMode: mode,
        sourceContent: text,
        processedContent: output,
        processingNotes: mode === 'VERBATIM' ? null : `Gemini ${mode === 'LIGHT_FIX' ? 'light-fix' : 'review'} revision.`,
      });
      setOutput('');
      setHistory([]);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to save this revision.'); }
    finally { setSaving(false); }
  };
  const appendInstruction = (chip: string) => setInstruction((current) => current ? `${current}${current.endsWith('.') ? ' ' : ', '}${chip}` : chip);
  const visibleEntries = entries.filter((entry) => `${entry.title} ${entry.preview}`.toLowerCase().includes(search.toLowerCase()));
  const description = mode === 'VERBATIM'
    ? 'Preserves the text exactly.'
    : mode === 'LIGHT_FIX'
      ? 'Fixes spelling, grammar, punctuation, and minor sentence structure while preserving your tone.'
      : 'Improves flow and clarity, organizes paragraphs, and suggests clearer construction while preserving meaning.';
  const changedWords = highlight ? output.split(/(\s+)/).map((word, index) => text.includes(word) ? word : <mark key={index}>{word}</mark>) : output;
  return <>
    <SectionHeading eyebrow="Preserve your voice" title="Writing modes" description="Type freely, choose guidance, and decide what to do with the result." />
    <div className="writing-layout">
      <section className="panel writing-input-panel" aria-labelledby="writing-text-heading">
        <div className="editor-top"><strong id="writing-text-heading">Your text</strong><span className="character-count">{text.length.toLocaleString()} / 10,000</span></div>
        <textarea ref={editor} className="writing-textarea writing-input" maxLength={10000} value={text} onChange={(event) => setText(event.target.value)} placeholder="Type or paste what you want to improve…" aria-label="Your text" />
        <div className="writing-input-actions"><Button variant="secondary" onClick={() => { setText(''); setSourceEntry(null); }}>Clear</Button><Button variant="secondary" onClick={() => void openPicker()}>Start from a saved entry</Button></div>
        {sourceEntry && <p className="field-help">Copy from: {sourceEntry.title}. Editing this copy will not change the saved entry.</p>}
        <label className="form-field writing-instruction"><span>Tell Memo what to change <em>(optional)</em></span><input maxLength={200} value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Describe the change you want" /><small>{instruction.length}/200</small></label>
        <div className="writing-chips" aria-label="Suggested instructions">{['Fix structure', 'Improve wording', 'Make it shorter', 'Keep my tone'].map((chip) => <button type="button" key={chip} onClick={() => appendInstruction(chip)}>{chip}</button>)}</div>
        <div className="writing-mode-row"><label><span className="field-label">Mode</span><Select aria-label="Writing mode" value={mode} onChange={(event) => { setMode(event.target.value as typeof mode); setError(''); }} disabled={processing} options={[{ value: 'VERBATIM', label: 'Verbatim' }, { value: 'LIGHT_FIX', label: 'Light Fix' }, { value: 'REVIEW', label: 'Review' }]} /></label><p className="writing-mode-description" aria-live="polite">{description}</p></div>
        {mode !== 'VERBATIM' && <label className="voice-gemini-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={processing} /> <span>I consent to sending this diary text to Google Gemini. <a href="#what-is-sent" onClick={(event) => event.preventDefault()}>What is sent?</a></span></label>}
        {mode !== 'VERBATIM' && <p id="what-is-sent" className="field-help"></p>}
        <Button className="writing-process" onClick={() => void process()} disabled={!text.trim() || processing || (mode !== 'VERBATIM' && !consent)}>{processing ? 'Processing…' : 'Process'}</Button>
        {processing && <div className="writing-processing" role="status" aria-live="polite"><span>Memo is working…</span><Button variant="secondary" onClick={() => abortRef.current?.abort()}>Cancel</Button></div>}
      </section>
      <section className="panel writing-result-panel" aria-labelledby="writing-result-heading" aria-live="polite">
        <div className="editor-top"><strong id="writing-result-heading">Result</strong>{output && <label className="writing-highlight"><input type="checkbox" checked={highlight} onChange={(event) => setHighlight(event.target.checked)} /> Highlight changes</label>}</div>
        {output ? <><textarea className="writing-textarea writing-output" value={output} onChange={(event) => setOutput(event.target.value)} aria-label="Editable result" />{highlight && <div className="writing-highlight-preview" aria-label="Change highlights">{changedWords}</div>}<div className="writing-result-actions"><Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(output); } catch { setError('Unable to copy. Select the result and copy it manually.'); } }}>Copy</Button><Button variant="secondary" onClick={() => void process()} disabled={!text.trim() || processing || (mode !== 'VERBATIM' && !consent)}>Process again</Button></div><div className="writing-save-actions"><Button onClick={() => void saveNew()} disabled={saving}>Save as new entry</Button>{sourceEntry && <Button variant="secondary" onClick={() => void saveRevision()} disabled={saving}>Save as revision of this entry</Button>}<Button variant="secondary" onClick={() => { setOutput(''); setHistory([]); }}>Discard</Button></div></> : <p className="writing-empty">Your result will appear here.</p>}
        {history.length > 0 && <div className="writing-history"><span>Recent results</span>{history.map((item, index) => <button type="button" key={`${item.slice(0,20)}-${index}`} onClick={() => setOutput(item)}>{item.slice(0, 42)}{item.length > 42 ? '…' : ''}</button>)}</div>}
      </section>
    </div>
    {error && <p className="field-error writing-error" role="alert">{error}{error.includes('retry') || error.includes('Retry') || error.includes('minute') || error.includes('network') || error.includes('unavailable') ? <button type="button" onClick={() => void process()} disabled={processing}>Retry</button> : null}</p>}
    {picker && <Modal onClose={() => setPicker(false)} className="dialog writing-entry-picker" labelledBy="entry-picker-title"><button type="button" className="icon-button dialog-close" aria-label="Close saved entry picker" onClick={() => setPicker(false)}><X size={18} /></button><h2 id="entry-picker-title">Choose a saved entry</h2><label className="form-field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search entries" /></label><div className="writing-entry-list" aria-live="polite">{pickerLoading ? <p className="field-help">Loading saved entries…</p> : visibleEntries.map((entry) => <button type="button" key={entry.id} disabled={Boolean(selectingEntryId)} onClick={() => void chooseSavedEntry(entry.id)}><strong>{entry.title}</strong><span>{entry.preview || 'Photo entry'}</span><small>{selectingEntryId === entry.id ? 'Loading latest text…' : formatRelativeTime(entry.updatedAt)} · {formatDate(entry.entryDate)}</small></button>)}</div></Modal>}
  </>;
}
function SettingsView() { const [fullName, setFullName] = useState(''); const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); useEffect(() => { settingsService.getProfile().then((result) => { const data = result as { user: { fullName: string; email: string } }; setFullName(data.user.fullName); setEmail(data.user.email); }).catch(() => setMessage('Unable to load profile.')); }, []); const save = async () => { try { await settingsService.updateProfile({ fullName }); setMessage('Profile saved.'); } catch (reason) { setMessage(reason instanceof ApiError ? reason.message : 'Unable to save profile.'); } }; return <><SectionHeading eyebrow="Make MemoSphere yours" title="Settings" description="" action={<Button onClick={save}><Check size={16} /> Save changes</Button>} /><div className="panel settings-section"><div className="form-grid"><label className="form-field"><span>Full name</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label className="form-field"><span>Email address</span><input value={email} readOnly /></label></div>{message && <p className="field-help">{message}</p>}</div></>; }
function CreateEntryDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ originalContent: '' });
  const [inputMode, setInputMode] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [transcript, setTranscript] = useState('');
  const [sourceTranscript, setSourceTranscript] = useState('');
  const [voiceHasRecording, setVoiceHasRecording] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    const hasUnsavedContent = Boolean(form.originalContent.trim() || transcript.trim() || voiceHasRecording);
    if (hasUnsavedContent && !window.confirm('Discard this unsaved diary entry and recording?')) return;
    onClose();
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const originalContent = (inputMode === 'VOICE' ? transcript : form.originalContent).trim();
    if (!originalContent) {
      setError('Diary content is required.');
      return;
    }
    if (inputMode === 'VOICE' && !sourceTranscript.trim()) {
      setError('Transcribe your recording before saving the voice entry.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      await diaryService.create({ originalContent, inputMethod: inputMode, ...(inputMode === 'VOICE' ? { transcript: sourceTranscript.trim() } : {}) });
      onSaved();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to save entry.');
      setIsSaving(false);
    }
  };
  return <Modal onClose={close} size="wide" className="dialog form-dialog category-dialog voice-entry-dialog" ariaLabel="Create a diary entry"><form onSubmit={save}>
    <button type="button" className="icon-button dialog-close" onClick={close} aria-label="Close" disabled={isSaving}><X size={18} /></button>
    <p className="eyebrow">New memory</p><h2>Create a diary entry</h2>
    <div className="entry-input-tabs" role="group" aria-label="Diary entry input method">
      <button type="button" aria-pressed={inputMode === 'TEXT'} className={inputMode === 'TEXT' ? 'is-active' : ''} onClick={() => setInputMode('TEXT')} disabled={isSaving}>Write manually</button>
      <button type="button" aria-pressed={inputMode === 'VOICE'} className={inputMode === 'VOICE' ? 'is-active' : ''} onClick={() => setInputMode('VOICE')} disabled={isSaving}>Speak instead</button>
    </div>
    {inputMode === 'TEXT' ? <label className="form-field"><span>Entry</span><textarea required rows={6} value={form.originalContent} maxLength={100000} onChange={(event) => setForm({ ...form, originalContent: event.target.value })} /></label> : <VoiceJournal transcript={transcript} onTranscriptChange={setTranscript} onTranscribed={(value) => setSourceTranscript(value)} onRecordingChange={setVoiceHasRecording} disabled={isSaving} />}
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="dialog-actions"><Button type="button" variant="secondary" onClick={close} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving || (inputMode === 'VOICE' && !transcript.trim())}>{isSaving ? 'Saving...' : 'Save diary entry'}</Button></div>
  </form></Modal>;
}
export default function LiveAppShell() { const pathname = usePathname(); const router = useRouter(); const [create, setCreate] = useState(false); const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') ?? '' : ''; const page = pathname === '/my-diary' || pathname === '/saved-information' ? <DiaryView searchQuery={pathname === '/saved-information' ? query : ''} showSearch={pathname === '/saved-information'} /> : pathname === '/files' ? <FilesPage /> : pathname === '/beneficiaries' ? <BeneficiaryView /> : pathname === '/legacy-policy' ? <PolicyView /> : pathname === '/letter-of-wishes' ? <WishesEditor /> : pathname === '/activity-logs' ? <ActivityView /> : pathname === '/ai-diary' ? <AssistantView /> : pathname === '/writing-modes' ? <WritingView /> : pathname === '/settings' ? <SettingsView /> : pathname === '/profile' ? <ProfileSettings /> : <DashboardView onWrite={() => setCreate(true)} />; return <><div className="page-content"><div className="page-content-inner">{page}</div></div>{create && <CreateEntryDialog onClose={() => setCreate(false)} onSaved={() => { setCreate(false); router.refresh(); }} />}</>; }
