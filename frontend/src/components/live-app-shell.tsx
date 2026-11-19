'use client';

import {
  ArrowUp, ArrowUpRight, BookHeart, BookOpen, Check, Clock3, KeyRound,
  ImagePlus, Mic, MoreHorizontal, Plus, Search, ShieldCheck, Sparkles, Trash2, UsersRound, X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from 'react';
import {
  activityService, beneficiaryService, dashboardService,
  diaryService, legacyPolicyService, settingsService, uploadDiaryPhoto, writingModeService, ApiError,
} from '@/services/api';
import type { ApiDiaryEntry, DashboardData } from '@/types';
import type { LegacyBeneficiary, LegacyPolicy } from '@/services/api';
import AppLayout from '@/components/app-layout';
import VoiceJournal from '@/components/voice-journal';
import LifeCountdownMonitor from '@/components/life-countdown-monitor';
import ProfileSettings from '@/components/profile-settings';
import Select from '@/components/ui/select';
import WishesEditor from '@/components/wishes-editor';
import AIChatPanel from '@/components/ai-chat-panel';

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
  return <div className="entry-row"><div className="entry-date"><strong>{new Date(entry.entryDate).getDate()}</strong><span>{new Date(entry.entryDate).toLocaleString(undefined, { month: 'short' })}</span></div>{entry.photos?.[0] && <img className="entry-thumb" src={entry.photos[0].thumbnailUrl} alt="" loading="lazy" /> }<div className="entry-row-content"><div className="entry-title-line"><a href={`/my-diary?entry=${entry.id}`}>{entry.title}</a><Badge tone="slate">{entry.access}</Badge></div><p>{entry.preview || (entry.photoCount ? 'Photo entry' : '')}</p><div className="entry-meta"><span>{entry.category}</span>{entry.photoCount ? <span>· {entry.photoCount > 1 ? `+${entry.photoCount - 1} photos` : '1 photo'}</span> : null}</div></div>{onDelete ? <button className="icon-button" aria-label={`Delete ${entry.title}`} onClick={() => onDelete(entry)}><MoreHorizontal size={18} /></button> : <ArrowUpRight size={17} className="row-arrow" />}</div>;
}
function DashboardView({ onWrite }: { onWrite: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null); const [error, setError] = useState<string | null>(null);
  const load = () => { dashboardService.get().then(setData).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to load dashboard.')); };
  useEffect(() => { load(); }, []);
  if (error) return <StateMessage title="Dashboard unavailable" message={error} retry={() => { setError(null); load(); }} />;
  if (!data) return <div className="panel loading-state">Loading your private dashboard...</div>;
  const { stats, recentEntries } = data;
  return <><section className="welcome-panel"><div><p className="eyebrow light">Your private workspace</p><h1>A quiet place for<br /><em>what matters.</em></h1><p>Keep the moments, lessons, and words you want to carry forward.</p><div className="welcome-actions"><Button onClick={onWrite}><Plus size={17} /> Write a diary entry</Button><a className="text-action" href="/ai-diary">Ask your assistant <ArrowUpRight size={16} /></a></div></div><div className="welcome-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><BookHeart size={42} /></div></section><LifeCountdownMonitor /><div className="privacy-strip"><ShieldCheck size={19} /><div><strong>Your memories are private</strong></div><a href="/settings">Review profile <ArrowUpRight size={15} /></a></div><div className="stats-grid"><Stat icon={BookOpen} label="Diary entries" value={stats.entryCount} tone="blue" /><Stat icon={UsersRound} label="Beneficiaries" value={stats.beneficiaryCount} tone="lavender" /><Stat icon={KeyRound} label="Active policies" value={stats.activePolicyCount} tone="mint" /><Stat icon={Clock3} label="Recent activity" value={stats.recentActivityCount} tone="warm" /></div><div className="dashboard-grid"><div className="panel"><div className="panel-heading"><div><p className="eyebrow">Your memories</p><h2>Recent entries</h2></div><a className="subtle-link" href="/my-diary">View all <ArrowUpRight size={15} /></a></div><div className="entry-list">{recentEntries.length ? recentEntries.map((entry) => <LiveEntryRow key={entry.id} entry={entry} />) : <Empty title="Your diary is empty" message="Create your first entry to begin." action={<Button onClick={onWrite}><Plus size={16} /> New entry</Button>} />}</div></div><div className="panel release-panel"><div className="panel-heading"><div><p className="eyebrow">Legacy planning</p></div></div><div className="release-status"><div className="release-shield"><ShieldCheck size={23} /></div><div><strong>Authorization is server-side</strong><p>Policies and Prolog decide access.</p></div><Badge tone="blue">Verified</Badge></div><a className="subtle-link" href="/legacy-policy">Review policies <ArrowUpRight size={15} /></a></div></div></>;
}
function Stat({ icon: Icon, label, value, tone }: { icon: typeof BookOpen; label: string; value: number; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><p>{label}</p><strong>{value}</strong></div>; }
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
  return <div className="dialog-backdrop"><form className="dialog form-dialog" role="dialog" aria-modal="true" onSubmit={save}><button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">Saved memory</p><h2>Edit diary entry</h2><label className="form-field"><span>Entry</span><textarea required rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></label><p className="field-help">Your original submitted content remains preserved in database history.</p>{error && <p className="field-error" role="alert">{error}</p>}<div className="dialog-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button></div></form></div>;
}
function DiaryReadingDialog({ entry, onClose, onEdit }: { entry: ApiDiaryEntry; onClose: () => void; onEdit: () => void }) {
  return <div className="dialog-backdrop"><article className="dialog diary-reader" role="dialog" aria-modal="true" aria-labelledby="diary-reader-title"><button type="button" className="icon-button dialog-close" aria-label="Close entry" onClick={onClose}><X size={18} /></button><h1 id="diary-reader-title">{entry.title}</h1><p className="diary-reader-meta">{entry.category} · {formatDate(entry.entryDate)}</p><div className="diary-reader-content">{entry.content}</div>{entry.photos?.length ? <div className="diary-photo-grid">{entry.photos.map((photo) => <a key={photo.id} href={photo.fullUrl ?? photo.thumbnailUrl} target="_blank" rel="noreferrer"><img src={photo.fullUrl ?? photo.thumbnailUrl} alt={photo.altText ?? 'Diary photo'} loading="lazy" /></a>)}</div> : null}<div className="dialog-actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={onEdit}>Edit entry</Button></div></article></div>;
}
function DiaryView({ initialQuery = '', showSearch = false }: { initialQuery?: string; showSearch?: boolean }) {
  const [entries, setEntries] = useState<ApiDiaryEntry[]>([]); const [query, setQuery] = useState(initialQuery); const [total, setTotal] = useState(0); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [target, setTarget] = useState<ApiDiaryEntry | null>(null); const [selected, setSelected] = useState<ApiDiaryEntry | null>(null); const [selectedError, setSelectedError] = useState<string | null>(null);
  const load = () => { const params = new URLSearchParams({ page: '1', pageSize: '50', sort: 'newest' }); if (query) params.set('search', query); setLoading(true); setError(null); diaryService.list(`?${params}`).then((result) => { setEntries(result.entries); setTotal(result.pagination.total); }).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to load entries.')).finally(() => setLoading(false)); };
  useEffect(load, [query]);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('entry'); if (!id) return; diaryService.get(id).then(setSelected).catch((reason) => setSelectedError(reason instanceof ApiError ? reason.message : 'Unable to load this entry.')); }, []);
  const remove = async () => { if (!target) return; try { await diaryService.remove(target.id); setTarget(null); if (selected?.id === target.id) setSelected(null); load(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to archive entry.'); setTarget(null); } };
  const [draft, setDraft] = useState({ originalContent: '' }); const [editing, setEditing] = useState(false);
  const [photos, setPhotos] = useState<Array<{ id: string; name: string; preview: string; progress: number; error?: string }>>([]);
  const [voice, setVoice] = useState(false); const [voiceEntry, setVoiceEntry] = useState(false); const [transcript, setTranscript] = useState(''); const [sourceTranscript, setSourceTranscript] = useState(''); const [recording, setRecording] = useState(false); const [saving, setSaving] = useState(false); const [createError, setCreateError] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (entries.length === 0 && !query) editor.current?.focus(); }, [entries.length, query]);
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
  const groups = entries.reduce<Record<string, ApiDiaryEntry[]>>((acc, entry) => { const day = Math.floor((Date.now() - new Date(entry.entryDate).getTime()) / 86400000); const key = day < 1 ? 'Today' : day < 2 ? 'Yesterday' : day < 7 ? 'Previous 7 days' : new Date(entry.entryDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); (acc[key] ??= []).push(entry); return acc; }, {});
  const groupOrder = ['Today', 'Yesterday', 'Previous 7 days'];
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
    {showSearch && <div className="diary-history-toolbar"><label className="search-input"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search entries" /></label><span>{total} {total === 1 ? 'entry' : 'entries'}</span></div>}
    {error ? <StateMessage title="Diary unavailable" message={error} retry={load} /> : loading ? <div className="diary-skeleton" role="status" aria-label="Loading diary entries"><i /><i /><i /></div> : !entries.length ? <div className="diary-history"><section><h2>Your entries {!showSearch && <span className="diary-entry-count">{total} {total === 1 ? 'entry' : 'entries'}</span>}</h2><p className="diary-empty">Your saved moments will find a home here.</p></section></div> : <div className="diary-history">{Object.entries(groups).sort(([a], [b]) => { const order = [...groupOrder, ...Object.keys(groups).filter((key) => !groupOrder.includes(key))]; return order.indexOf(a) - order.indexOf(b); }).map(([group, items], index) => <section key={group}><h2>{group}{!showSearch && index === 0 && <span className="diary-entry-count">{total} {total === 1 ? 'entry' : 'entries'}</span>}</h2>{items.map((entry) => <article className="diary-history-row" key={entry.id}><a href={`/my-diary?entry=${entry.id}`}><strong>{entry.title}</strong><span>{entry.preview}</span><small>{entry.category} · {formatDate(entry.entryDate)}</small></a><button type="button" className="diary-row-menu" aria-label={`Archive ${entry.title}`} onClick={() => setTarget(entry)}><MoreHorizontal size={18} /></button></article>)}</section>)}</div>}
    {target && <div className="dialog-backdrop"><div className="dialog" role="dialog" aria-modal="true"><div className="dialog-icon"><Trash2 size={20} /></div><h2>Archive this entry?</h2><p>The original remains preserved in database history.</p><div className="dialog-actions"><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Archive</Button></div></div></div>}{selectedError && <StateMessage title="Entry unavailable" message={selectedError} />}{selected && (editing ? <DiaryEntryDialog entry={selected} onClose={() => setEditing(false)} onSaved={(updated) => { setSelected(updated); setEditing(false); setEntries((current) => current.map((item) => item.id === updated.id ? updated : item)); }} /> : <DiaryReadingDialog entry={selected} onClose={() => setSelected(null)} onEdit={() => setEditing(true)} />)}</section>;
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

  return <><SectionHeading eyebrow="People you trust" title="Beneficiaries" description="" action={<Button onClick={() => setShowForm(true)}><Plus size={17} /> Add beneficiary</Button>} />{error ? <StateMessage title="Beneficiaries unavailable" message={error} retry={() => { void load(); }} /> : loading ? <div className="panel loading-state" role="status">Loading beneficiaries...</div> : <div className="beneficiary-grid">{records.length ? records.map((person) => <div className="panel beneficiary-card" key={person.id}><div className="person-avatar">{person.fullName.split(' ').map((part) => part[0]).join('')}</div><h2>{person.fullName}</h2><p>{person.relationship} · {person.email}</p><Badge tone={person.status === 'VERIFIED' ? 'green' : 'amber'}>{person.status}</Badge></div>) : <div className="panel"><Empty title="No beneficiaries" message="Add a beneficiary." /></div>}</div>}{showForm && <BeneficiaryForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); void load(); }} />}</>;
}
function BeneficiaryForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) { const [form, setForm] = useState({ fullName: '', email: '', relationship: '' }); const [error, setError] = useState(''); const submit = async () => { try { await beneficiaryService.create(form); onSaved(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to save beneficiary.'); } }; return <div className="dialog-backdrop"><div className="dialog form-dialog" role="dialog" aria-modal="true"><button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><p className="eyebrow">New beneficiary</p><h2>Add someone you trust</h2>{(['fullName', 'email', 'relationship'] as const).map((field) => <label className="form-field" key={field}><span>{field === 'fullName' ? 'Full name' : field === 'email' ? 'Email address' : 'Relationship'}</span><input type={field === 'email' ? 'email' : 'text'} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}{error && <p className="field-error">{error}</p>}<div className="dialog-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Send invitation</Button></div></div></div>; }
function PolicyView() {
  const [policies, setPolicies] = useState<LegacyPolicy[]>([]); const [beneficiaries, setBeneficiaries] = useState<LegacyBeneficiary[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [dialog, setDialog] = useState(false); const [editing, setEditing] = useState<LegacyPolicy | null>(null); const [menu, setMenu] = useState<string | null>(null); const [logs, setLogs] = useState<Awaited<ReturnType<typeof legacyPolicyService.audit>> | null>(null); const [formError, setFormError] = useState(''); const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', beneficiaryId: '', scopeType: 'all_entries', scopeCategories: 'Reflections', entryIds: '', scopeDateFrom: '', scopeDateTo: '', excludedEntryIds: '', releaseMethod: 'owner_manual', releaseAt: '', verifierBeneficiaryId: '', coolingOffDays: '7', expiresAt: '' });
  const [newBeneficiary, setNewBeneficiary] = useState(false); const [beneficiaryForm, setBeneficiaryForm] = useState({ fullName: '', email: '', relationship: '' });
  const load = async () => { setLoading(true); setError(''); try { const [nextPolicies, nextBeneficiaries] = await Promise.all([legacyPolicyService.list(), legacyPolicyService.listBeneficiaries()]); setPolicies(nextPolicies); setBeneficiaries(nextBeneficiaries); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to load access policies.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (!dialog && !logs) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setDialog(false); setLogs(null); setMenu(null); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [dialog, logs]);
  const startCreate = () => { setEditing(null); setForm({ name: '', description: '', beneficiaryId: beneficiaries.find((b) => b.status !== 'REVOKED')?.id ?? '', scopeType: 'all_entries', scopeCategories: 'Reflections', entryIds: '', scopeDateFrom: '', scopeDateTo: '', excludedEntryIds: '', releaseMethod: 'owner_manual', releaseAt: '', verifierBeneficiaryId: '', coolingOffDays: '7', expiresAt: '' }); setFormError(''); setDialog(true); };
  const startEdit = (policy: LegacyPolicy) => { setEditing(policy); setForm({ name: policy.name, description: policy.description ?? '', beneficiaryId: policy.beneficiaryId, scopeType: policy.scopeType, scopeCategories: policy.scopeCategories?.join(', ') ?? '', entryIds: policy.entryLinks.map((l) => l.entryId).join(', '), scopeDateFrom: policy.scopeDateFrom?.slice(0, 10) ?? '', scopeDateTo: policy.scopeDateTo?.slice(0, 10) ?? '', excludedEntryIds: policy.excludedEntryIds.join(', '), releaseMethod: policy.releaseMethod, releaseAt: policy.releaseAt?.slice(0, 10) ?? '', verifierBeneficiaryId: '', coolingOffDays: String(policy.coolingOffDays), expiresAt: policy.expiresAt?.slice(0, 10) ?? '' }); setFormError(''); setDialog(true); };
  const save = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setBusy(true); setFormError(''); const payload = { name: form.name, description: form.description || null, beneficiaryId: form.beneficiaryId, scopeType: form.scopeType, scopeCategories: form.scopeType === 'categories' ? form.scopeCategories.split(',').map((x) => x.trim()).filter(Boolean) : undefined, entryIds: form.scopeType === 'selected_entries' ? form.entryIds.split(',').map((x) => x.trim()).filter(Boolean) : undefined, scopeDateFrom: form.scopeDateFrom || null, scopeDateTo: form.scopeDateTo || null, excludedEntryIds: form.excludedEntryIds.split(',').map((x) => x.trim()).filter(Boolean), releaseMethod: form.releaseMethod, releaseAt: form.releaseAt || null, verifierBeneficiaryId: form.releaseMethod === 'trusted_verifier' ? form.verifierBeneficiaryId : null, coolingOffDays: Number(form.coolingOffDays), expiresAt: form.expiresAt || null }; try { if (editing) await legacyPolicyService.update(editing.id, payload); else await legacyPolicyService.create(payload); setDialog(false); await load(); } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to save the policy.'); } finally { setBusy(false); } };
  const activate = async (policy: LegacyPolicy) => { const password = window.prompt(`Re-enter your password to activate “${policy.name}”.`); if (!password) return; try { await legacyPolicyService.activate(policy.id, password); await load(); } catch (reason) { window.alert(reason instanceof ApiError ? reason.message : 'Unable to activate policy.'); } };
  const revoke = async (policy: LegacyPolicy) => { if (!window.confirm(`Revoke “${policy.name}” immediately? This cannot be undone.`)) return; const password = window.prompt(`Re-enter your password to revoke “${policy.name}”.`); if (!password) return; try { await legacyPolicyService.revoke(policy.id, password); await load(); } catch (reason) { window.alert(reason instanceof ApiError ? reason.message : 'Unable to revoke policy.'); } };
  const requestRelease = async (policy: LegacyPolicy) => { const password = policy.releaseMethod === 'owner_manual' ? window.prompt(`Re-enter your password to request release of “${policy.name}”.`) : undefined; if (policy.releaseMethod === 'owner_manual' && !password) return; try { await legacyPolicyService.requestRelease(policy.id, password || undefined); await load(); } catch (reason) { window.alert(reason instanceof ApiError ? reason.message : 'Unable to request release.'); } };
  const addBeneficiary = async () => { try { const result = await legacyPolicyService.createBeneficiary(beneficiaryForm); const record = result.beneficiary; setBeneficiaries((all) => [record, ...all]); setForm((current) => ({ ...current, beneficiaryId: record.id })); setNewBeneficiary(false); setBeneficiaryForm({ fullName: '', email: '', relationship: '' }); } catch (reason) { setFormError(reason instanceof ApiError ? reason.message : 'Unable to add beneficiary.'); } };
  const scopeSummary = (policy: LegacyPolicy) => { const base = policy.scopeType === 'categories' ? `Categories: ${policy.scopeCategories?.join(', ') ?? 'None'}` : policy.scopeType === 'selected_entries' ? `${policy.entryLinks.length} selected entries` : 'All shareable entries'; const dates = policy.scopeDateFrom || policy.scopeDateTo ? ` · ${policy.scopeDateFrom ? new Date(policy.scopeDateFrom).toLocaleDateString() : 'Any date'} to ${policy.scopeDateTo ? new Date(policy.scopeDateTo).toLocaleDateString() : 'present'}` : ''; return `${base}${dates}${policy.excludedEntryIds.length ? ` · ${policy.excludedEntryIds.length} excluded` : ''}`; };
  return <><SectionHeading eyebrow="Legacy Policy Language" title="Access policies" description="Choose what a beneficiary may read and when access can be released." action={<Button onClick={startCreate}><Plus size={16} /> Create policy</Button>} /><div className="policy-banner"><ShieldCheck size={21} /><div><strong>The browser never grants access or decides beneficiary permissions.</strong></div></div>
    {loading ? <div className="panel policy-list" role="status" aria-label="Loading policies"><div className="diary-skeleton"><i /><i /><i /></div></div> : error ? <StateMessage title="Policies unavailable" message={error} retry={() => void load()} /> : policies.length === 0 ? <div className="panel policy-list"><Empty title="No policies yet" message="Create a policy to define what a verified beneficiary may access." action={<Button onClick={startCreate}><Plus size={16} /> Create policy</Button>} /></div> : <div className="policy-grid">{policies.map((policy) => <article className="panel policy-card" key={policy.id}><div className="policy-card-heading"><div><h2>{policy.name}</h2><span className={`badge badge-${policy.status === 'ACTIVE' || policy.status === 'RELEASED' ? 'green' : 'slate'}`}>{policy.status.toLowerCase()}</span></div><div className="policy-menu-wrap"><button className="icon-button" aria-label={`Actions for ${policy.name}`} aria-expanded={menu === policy.id} onClick={() => setMenu(menu === policy.id ? null : policy.id)}><MoreHorizontal size={18} /></button>{menu === policy.id && <div className="policy-menu">{['DRAFT', 'PAUSED'].includes(policy.status) && <button onClick={() => { setMenu(null); startEdit(policy); }}>Edit</button>}{policy.status === 'ACTIVE' ? <button onClick={async () => { setMenu(null); await legacyPolicyService.pause(policy.id); await load(); }}>Pause</button> : ['DRAFT', 'PAUSED'].includes(policy.status) ? <button onClick={() => { setMenu(null); void activate(policy); }} disabled={policy.beneficiary.status !== 'VERIFIED'}>Activate</button> : null}{policy.status !== 'REVOKED' && <button onClick={() => { setMenu(null); void revoke(policy); }}>Revoke</button>}<button onClick={async () => { setMenu(null); setLogs(await legacyPolicyService.audit(policy.id)); }}>View audit log</button></div>}</div></div><p className="policy-beneficiary">{policy.beneficiary.fullName} · {policy.beneficiary.email}</p><dl><div><dt>Scope</dt><dd>{scopeSummary(policy)}</dd></div><div><dt>Release</dt><dd>{policy.releaseMethod.replaceAll('_', ' ')} · {policy.coolingOffDays}-day wait</dd></div>{policy.releaseReadyAt && <div><dt>Cooling off until</dt><dd>{new Date(policy.releaseReadyAt).toLocaleString()}</dd></div>}</dl>{policy.status === 'ACTIVE' && policy.releaseReadyAt && <Button variant="secondary" onClick={async () => { await legacyPolicyService.cancelRelease(policy.id); await load(); }}>Cancel pending release</Button>}{policy.status === 'ACTIVE' && !policy.releaseReadyAt && policy.releaseMethod !== 'scheduled_date' && <Button variant="secondary" onClick={() => void requestRelease(policy)}>Request release</Button>}</article>)}</div>}
    {dialog && <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDialog(false); }}><form className="dialog form-dialog policy-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="policy-editor-title" onSubmit={save}><button type="button" className="icon-button dialog-close" onClick={() => setDialog(false)} aria-label="Close policy editor"><X size={18} /></button><p className="eyebrow">Access policy</p><h2 id="policy-editor-title">{editing ? 'Edit policy' : 'Create policy'}</h2>
      <label className="form-field"><span>Policy name</span><input required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="form-field"><span>Beneficiary</span><Select required value={form.beneficiaryId} onChange={(e) => setForm({ ...form, beneficiaryId: e.target.value })} options={[{ value: '', label: 'Choose a beneficiary', placeholder: true }, ...beneficiaries.filter((b) => b.status !== 'REVOKED' && b.status !== 'REMOVED').map((b) => ({ value: b.id, label: `${b.fullName} · ${b.status.toLowerCase()}` }))]} /></label><button type="button" className="subtle-link" onClick={() => setNewBeneficiary(!newBeneficiary)}>+ Add beneficiary</button>{newBeneficiary && <div className="policy-inline-beneficiary"><label className="form-field"><span>Name</span><input value={beneficiaryForm.fullName} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, fullName: e.target.value })} /></label><label className="form-field"><span>Email</span><input type="email" value={beneficiaryForm.email} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, email: e.target.value })} /></label><label className="form-field"><span>Relationship</span><input value={beneficiaryForm.relationship} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, relationship: e.target.value })} /></label><Button type="button" variant="secondary" onClick={() => void addBeneficiary()}>Save beneficiary</Button><small>Invite delivery is not configured. This beneficiary must be verified before activation.</small></div>}
      <h3>What can they see?</h3><label className="form-field"><span>Scope</span><Select value={form.scopeType} onChange={(e) => setForm({ ...form, scopeType: e.target.value })} options={[{ value: 'all_entries', label: 'All shareable entries' }, { value: 'categories', label: 'Selected categories' }, { value: 'selected_entries', label: 'Selected entries (IDs)' }]} /></label>{form.scopeType === 'categories' && <label className="form-field"><span>Categories (comma separated)</span><input value={form.scopeCategories} onChange={(e) => setForm({ ...form, scopeCategories: e.target.value })} /></label>}{form.scopeType === 'selected_entries' && <label className="form-field"><span>Entry IDs (comma separated)</span><input value={form.entryIds} onChange={(e) => setForm({ ...form, entryIds: e.target.value })} /></label>}<label className="form-field"><span>Excluded entry IDs (optional)</span><input value={form.excludedEntryIds} onChange={(e) => setForm({ ...form, excludedEntryIds: e.target.value })} /></label><div className="policy-inline-beneficiary"><label className="form-field"><span>From date (optional)</span><input type="date" value={form.scopeDateFrom} onChange={(e) => setForm({ ...form, scopeDateFrom: e.target.value })} /></label><label className="form-field"><span>Through date (optional)</span><input type="date" value={form.scopeDateTo} onChange={(e) => setForm({ ...form, scopeDateTo: e.target.value })} /></label></div>
      <h3>When can it be released?</h3><label className="form-field"><span>Release method</span><Select value={form.releaseMethod} onChange={(e) => setForm({ ...form, releaseMethod: e.target.value })} options={[{ value: 'owner_manual', label: 'Owner confirms release' }, { value: 'scheduled_date', label: 'Scheduled date' }, { value: 'trusted_verifier', label: 'Trusted verifier' }]} /></label>{form.releaseMethod === 'scheduled_date' && <label className="form-field"><span>Release date</span><input type="date" value={form.releaseAt} onChange={(e) => setForm({ ...form, releaseAt: e.target.value })} required /></label>}{form.releaseMethod === 'trusted_verifier' && <label className="form-field"><span>Verified trusted beneficiary</span><Select value={form.verifierBeneficiaryId} onChange={(e) => setForm({ ...form, verifierBeneficiaryId: e.target.value })} options={[{ value: '', label: 'Choose verifier', placeholder: true }, ...beneficiaries.filter((b) => b.status === 'VERIFIED').map((b) => ({ value: b.id, label: b.fullName }))]} /></label>}<label className="form-field"><span>Cooling-off days (minimum 3)</span><input type="number" min={3} max={365} value={form.coolingOffDays} onChange={(e) => setForm({ ...form, coolingOffDays: e.target.value })} /></label><label className="form-field"><span>Access expires (optional)</span><input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
      <p className="policy-summary">{form.name || 'This policy'} will let {beneficiaries.find((b) => b.id === form.beneficiaryId)?.fullName || 'the beneficiary'} read {form.scopeType === 'categories' ? `${form.scopeCategories} entries` : form.scopeType === 'selected_entries' ? 'the selected entries' : 'shareable entries'} after {form.releaseMethod.replaceAll('_', ' ')} and a {form.coolingOffDays}-day waiting period. You can cancel release during the waiting period.</p>{formError && <p className="field-error" role="alert">{formError}</p>}<div className="dialog-actions"><Button type="button" variant="secondary" onClick={() => setDialog(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save draft'}</Button></div></form></div>}
    {logs && <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setLogs(null); }}><div className="dialog policy-audit-dialog" role="dialog" aria-modal="true" aria-labelledby="policy-audit-title"><button type="button" className="icon-button dialog-close" onClick={() => setLogs(null)} aria-label="Close audit log"><X size={18} /></button><p className="eyebrow">Security history</p><h2 id="policy-audit-title">Audit log</h2>{logs.length ? <ol>{logs.map((log) => <li key={log.id}><strong>{log.action.replaceAll('_', ' ').toLowerCase()}</strong><span>{new Date(log.createdAt).toLocaleString()}</span></li>)}</ol> : <p>No audit events recorded.</p>}</div></div>}
  </>;
}
function ActivityView() { const [items, setItems] = useState<Array<{ id: string; action: string; resourceType: string; result: string; createdAt: string }>>([]); const [error, setError] = useState(''); useEffect(() => { activityService.list().then((result) => setItems(result.activities)).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to load activity.')); }, []); return <><SectionHeading eyebrow="A clear record" title="Activity logs" description="Security events retrieved from your owner-scoped audit log." />{error ? <StateMessage title="Activity unavailable" message={error} /> : <div className="panel activity-panel"><div className="activity-table"><div className="table-head"><span>Activity</span><span>Resource</span><span>Result</span><span>Date</span></div>{items.length ? items.map((item) => <div className="table-row" key={item.id}><div className="activity-action"><span className="activity-icon"><Check size={14} /></span><strong>{item.action}</strong></div><span>{item.resourceType}</span><Badge tone={item.result === 'ALLOWED' ? 'green' : 'amber'}>{item.result}</Badge><span>{formatDate(item.createdAt)}</span></div>) : <Empty title="No activity yet" message="Important account actions will appear here." />}</div></div>}</>; }
function AssistantView() { return <><SectionHeading eyebrow="Your diary companion" title="Chat with Memo" description="Choose a companion or explore memories from your own diary." /><AIChatPanel /></>; }
function WritingView() {
  const [entry, setEntry] = useState<ApiDiaryEntry | null>(null);
  const [mode, setMode] = useState<'VERBATIM' | 'LIGHT_FIX' | 'REVIEW'>('LIGHT_FIX');
  const [output, setOutput] = useState('');
  const [consent, setConsent] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { diaryService.list('?page=1&pageSize=1&sort=newest').then((result) => setEntry(result.entries[0] ?? null)).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to load the diary entry.')); }, []);
  const process = async () => {
    if (!entry) return;
    setProcessing(true); setError('');
    try {
      const result = await writingModeService.process({ diaryEntryId: entry.id, mode, content: entry.originalContent, consentToGemini: mode !== 'VERBATIM' ? consent : undefined });
      setOutput(result.version.processedContent);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to process this writing mode.'); } finally { setProcessing(false); }
  };
  const accept = async () => {
    if (!entry || !output) return;
    setProcessing(true); setError('');
    try { const updated = await diaryService.update(entry.id, { content: output }); setEntry(updated); setOutput(''); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to accept this revision.'); } finally { setProcessing(false); }
  };
  return <><SectionHeading eyebrow="Preserve your voice" title="Writing modes" description="" /><div className="panel writing-editor"><div className="editor-top"><strong>{entry?.title ?? 'No diary entries available'}</strong><Select aria-label="Writing mode" value={mode} onChange={(event) => { setMode(event.target.value as typeof mode); setOutput(''); setError(''); }} disabled={processing} options={[{ value: 'VERBATIM', label: 'Verbatim' }, { value: 'LIGHT_FIX', label: 'Light Fix' }, { value: 'REVIEW', label: 'Review' }]} /></div><div className="comparison"><div><span className="field-label">Original</span><textarea className="writing-textarea" value={entry?.originalContent ?? ''} readOnly /></div>{output && <div><span className="field-label">Suggestion - accept or edit before using</span><textarea className="writing-textarea" value={output} onChange={(event) => setOutput(event.target.value)} /></div>}</div>{mode !== 'VERBATIM' && <label className="voice-gemini-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={processing} /> I consent to sending this diary text to Google Gemini.</label>}<Button onClick={() => void process()} disabled={!entry || processing || (mode !== 'VERBATIM' && !consent)}>{processing ? 'Processing...' : mode === 'VERBATIM' ? 'Preview verbatim' : 'Generate Gemini suggestion'}</Button>{output && <div className="voice-comparison-actions"><Button variant="secondary" onClick={() => setOutput('')}>Reject</Button><Button onClick={() => void accept()} disabled={processing}>Accept revised text</Button></div>}{error && <p className="field-error" role="alert">{error}</p>}</div></>;
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
  return <div className="dialog-backdrop"><form className="dialog form-dialog category-dialog voice-entry-dialog" role="dialog" aria-modal="true" onSubmit={save}>
    <button type="button" className="icon-button dialog-close" onClick={close} aria-label="Close" disabled={isSaving}><X size={18} /></button>
    <p className="eyebrow">New memory</p><h2>Create a diary entry</h2>
    <div className="entry-input-tabs" role="group" aria-label="Diary entry input method">
      <button type="button" aria-pressed={inputMode === 'TEXT'} className={inputMode === 'TEXT' ? 'is-active' : ''} onClick={() => setInputMode('TEXT')} disabled={isSaving}>Write manually</button>
      <button type="button" aria-pressed={inputMode === 'VOICE'} className={inputMode === 'VOICE' ? 'is-active' : ''} onClick={() => setInputMode('VOICE')} disabled={isSaving}>Speak instead</button>
    </div>
    {inputMode === 'TEXT' ? <label className="form-field"><span>Entry</span><textarea required rows={6} value={form.originalContent} maxLength={100000} onChange={(event) => setForm({ ...form, originalContent: event.target.value })} /></label> : <VoiceJournal transcript={transcript} onTranscriptChange={setTranscript} onTranscribed={(value) => setSourceTranscript(value)} onRecordingChange={setVoiceHasRecording} disabled={isSaving} />}
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="dialog-actions"><Button type="button" variant="secondary" onClick={close} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving || (inputMode === 'VOICE' && !transcript.trim())}>{isSaving ? 'Saving...' : 'Save diary entry'}</Button></div>
  </form></div>;
}
export default function LiveAppShell() { const pathname = usePathname(); const [create, setCreate] = useState(false); const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') ?? '' : ''; const page = pathname === '/my-diary' || pathname === '/saved-information' ? <DiaryView initialQuery={pathname === '/saved-information' ? query : ''} showSearch={pathname === '/saved-information'} /> : pathname === '/beneficiaries' ? <BeneficiaryView /> : pathname === '/legacy-policy' ? <PolicyView /> : pathname === '/letter-of-wishes' ? <WishesEditor /> : pathname === '/activity-logs' ? <ActivityView /> : pathname === '/ai-diary' ? <AssistantView /> : pathname === '/writing-modes' ? <WritingView /> : pathname === '/settings' ? <SettingsView /> : pathname === '/profile' ? <ProfileSettings /> : <DashboardView onWrite={() => setCreate(true)} />; return <AppLayout><div className="page-content"><div className="page-content-inner">{page}</div></div>{create && <CreateEntryDialog onClose={() => setCreate(false)} onSaved={() => { setCreate(false); window.location.reload(); }} />}</AppLayout>; }
