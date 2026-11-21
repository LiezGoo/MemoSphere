'use client';

import { ArrowLeft, BookOpen, FileText, Image as ImageIcon, Music2, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, beneficiaryPortalService, type BeneficiaryPortalEntry, type BeneficiaryPortalOverview, type BeneficiaryPortalPolicy } from '@/services/api';

type Section = 'overview' | 'memories' | 'photos' | 'voice' | 'music' | 'letters' | 'documents' | 'assistant';
const sections: { id: Section; label: string; icon: typeof BookOpen }[] = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck }, { id: 'memories', label: 'Memories', icon: BookOpen },
  { id: 'photos', label: 'Photos', icon: ImageIcon }, { id: 'voice', label: 'Voice', icon: Music2 }, { id: 'music', label: 'Music', icon: Music2 },
  { id: 'letters', label: 'Letters', icon: FileText }, { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'assistant', label: 'Memory assistant', icon: Sparkles },
];

export default function BeneficiaryPortal() {
  const [overview, setOverview] = useState<BeneficiaryPortalOverview | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [policyId, setPolicyId] = useState('');
  const [entries, setEntries] = useState<BeneficiaryPortalEntry[]>([]);
  const [resources, setResources] = useState<{ playlists: { id: string; title: string; url: string }[]; letters: { id: string; title: string; content: string }[]; files: { id: string; name: string; mime: string; category: string; size: string }[] }>({ playlists: [], letters: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<{ id: string; title: string; entryDate: string }[]>([]);
  const [asking, setAsking] = useState(false);

  const loadOverview = async () => {
    setLoading(true); setError('');
    try { setOverview(await beneficiaryPortalService.overview()); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'The beneficiary library could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadOverview(); }, []);

  const loadPolicy = async (id: string, filters: { from?: string; to?: string; category?: string } = {}) => {
    setPolicyId(id); setDetailLoading(true); setError('');
    try { const result = await beneficiaryPortalService.policy(id, filters); setEntries(result.entries); setResources(result.resources); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Released memories could not be loaded.'); }
    finally { setDetailLoading(false); }
  };
  const releasedPolicies = useMemo(() => overview?.beneficiaries.flatMap((beneficiary) => beneficiary.policies.filter((item) => item.status === 'RELEASED').map((item) => ({ ...item, beneficiaryId: beneficiary.id, ownerName: beneficiary.ownerName, relationship: beneficiary.relationship }))) ?? [], [overview]);
  const photoEntries = entries.filter((entry) => entry.photos.length > 0);

  const ask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!question.trim()) return;
    setAsking(true); setAnswer(''); setCitations([]);
    try { const result = await beneficiaryPortalService.ask(question); setAnswer(result.answer); setCitations(result.citations); }
    catch (reason) { setAnswer(reason instanceof ApiError ? reason.message : 'The memory assistant is unavailable right now.'); }
    finally { setAsking(false); }
  };

  return <main className="beneficiary-portal">
    <header className="beneficiary-portal-header"><a href="/" className="portal-brand"><span className="portal-brand-mark"><ShieldCheck size={22} /></span><span>MemoSphere <small>Beneficiary library</small></span></a><p>Private memories shared with you</p></header>
    <div className="beneficiary-portal-layout">
      <aside className="beneficiary-portal-nav" aria-label="Beneficiary library sections">{sections.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}><Icon size={17} />{label}</button>)}</aside>
      <section className="beneficiary-portal-content">
        <div className="beneficiary-portal-heading"><div><p className="eyebrow">A trusted memory library</p><h1>{section === 'overview' ? 'Your legacy library' : sections.find((item) => item.id === section)?.label}</h1><p>Invitation acceptance and legacy access are separate. Only released policy content appears here.</p></div>{policyId && <button type="button" className="portal-back-button" onClick={() => { setPolicyId(''); setEntries([]); setResources({ playlists: [], letters: [], files: [] }); setSection('overview'); }}><ArrowLeft size={16} /> All owners</button>}</div>
        {error && <div className="portal-error" role="alert">{error}<button type="button" onClick={() => policyId ? void loadPolicy(policyId, { from, to, category }) : void loadOverview()}>Try again</button></div>}
        {loading ? <div className="portal-state" role="status">Loading your library…</div> : !overview?.beneficiaries.length ? <div className="portal-state"><ShieldCheck size={28} /><h2>No accepted invitations yet</h2><p>When you accept an owner’s invitation, their access status will appear here. Memories remain private until a legacy policy is released.</p></div> : <>
          {section === 'overview' && <div className="portal-owner-grid">{overview.beneficiaries.map((beneficiary) => <article className="portal-owner-card" key={beneficiary.id}><p className="eyebrow">{beneficiary.relationship || 'Beneficiary'}</p><h2>{beneficiary.ownerName}</h2><p className="portal-accepted">Invitation accepted · {beneficiary.acceptedAt ? new Date(beneficiary.acceptedAt).toLocaleDateString() : 'Active relationship'}</p>{beneficiary.policies.length ? beneficiary.policies.map((item) => <div className="portal-policy-row" key={item.id}><div><strong>{item.name}</strong><span>{item.status === 'RELEASED' ? `${item.entryCount} released memories · ${item.categories.join(', ') || 'No diary entries'}` : item.releaseReadyAt ? `Cooling-off period ends ${new Date(item.releaseReadyAt).toLocaleDateString()}` : item.releaseAt ? `Scheduled for ${new Date(item.releaseAt).toLocaleDateString()}` : 'Access pending owner release'}</span></div>{item.status === 'RELEASED' ? <button type="button" onClick={() => { setSection('memories'); void loadPolicy(item.id); }}>Open library</button> : <span className="portal-status-pending">Pending</span>}</div>) : <div className="portal-pending-note">Your invitation is accepted. The owner has not released a legacy policy yet.</div>}</article>)}</div>}
          {section !== 'overview' && section !== 'assistant' && <>
            {!policyId && <div className="portal-owner-grid">{releasedPolicies.map((item) => <button type="button" className="portal-policy-select" key={item.id} onClick={() => void loadPolicy(item.id)}><span>{item.ownerName} · {item.name}</span><small>{item.entryCount} memories released</small></button>)}</div>}
            {policyId && <><div className="portal-filter-row"><label>From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Through <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label>Category <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All</option>{[...new Set(entries.map((entry) => entry.category))].map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={() => void loadPolicy(policyId, { from, to, category })}>Apply filters</button></div>{detailLoading ? <div className="portal-state" role="status">Loading released content…</div> : section === 'memories' ? <div className="portal-memory-list">{entries.length ? entries.map((entry) => <article className="portal-memory-card" key={entry.id}><div className="portal-memory-meta"><span>{entry.category}</span><time>{new Date(entry.entryDate).toLocaleDateString()}</time></div><h2>{entry.title}</h2><div className="portal-memory-content">{entry.content}</div></article>) : <div className="portal-state"><BookOpen size={25} /><h2>No released memories match these filters</h2><p>This policy may have released other content, or the selected filters may be too narrow.</p></div>}</div> : section === 'photos' ? <div className="portal-photo-grid">{photoEntries.flatMap((entry) => entry.photos.map((photo) => <a key={photo.id} href={photo.fullUrl} target="_blank" rel="noreferrer"><img src={photo.thumbnailUrl} alt={photo.altText ?? `Memory from ${new Date(entry.entryDate).toLocaleDateString()}`} /><span>{entry.title}</span></a>))}{!photoEntries.length && <div className="portal-state"><ImageIcon size={25} /><h2>No released photos</h2><p>Photos appear when they are attached to a released diary entry.</p></div>}</div> : section === 'music' ? <div className="portal-memory-list">{resources.playlists.map((playlist) => <a className="portal-resource-card" key={playlist.id} href={playlist.url} target="_blank" rel="noreferrer"><Music2 size={18} /><span>{playlist.title}</span><small>Open YouTube playlist</small></a>)}{!resources.playlists.length && <div className="portal-state"><Music2 size={25} /><h2>No playlists released in this policy</h2></div>}</div> : section === 'letters' ? <div className="portal-memory-list">{resources.letters.map((letter) => <article className="portal-memory-card" key={letter.id}><h2>{letter.title}</h2><div className="portal-memory-content">{letter.content}</div></article>)}{!resources.letters.length && <div className="portal-state"><FileText size={25} /><h2>No letters released in this policy</h2></div>}</div> : section === 'documents' ? <div className="portal-memory-list">{resources.files.map((file) => <article className="portal-resource-card" key={file.id}><FileText size={18} /><span>{file.name}</span><small>{file.category} · {file.mime} · {Number(file.size).toLocaleString()} bytes</small></article>)}{!resources.files.length && <div className="portal-state"><FileText size={25} /><h2>No documents released in this policy</h2><p>Document metadata is available; the current Drive integration does not provide a beneficiary download link.</p></div>}</div> : <div className="portal-memory-list">{entries.flatMap((entry) => entry.media.filter((media) => media.mediaType === 'AUDIO' || media.mediaType === 'VOICE_MESSAGE').map((media) => <article className="portal-resource-card" key={media.id}><Music2 size={18} /><span>{media.fileName}</span><small>{entry.title} · {media.mimeType}</small></article>))}{!entries.some((entry) => entry.media.some((media) => media.mediaType === 'AUDIO' || media.mediaType === 'VOICE_MESSAGE')) && <div className="portal-state"><Music2 size={25} /><h2>No voice recordings released</h2><p>Audio file playback is not exposed by the existing media storage integration.</p></div>}</div>}</>}
          </>}
          {section === 'assistant' && <div className="portal-assistant-card"><p className="eyebrow">Released memories only</p><h2>Ask about a memory</h2><p>Memo searches only entries released to your account. It will say when those memories do not contain an answer.</p><form onSubmit={(event) => void ask(event)}><textarea maxLength={3000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What did they write about family traditions?" /><button type="submit" disabled={asking || !question.trim()}><Send size={16} />{asking ? 'Thinking…' : 'Ask Memo'}</button></form>{answer && <div className="portal-answer" role="status"><p>{answer}</p>{citations.length > 0 && <ul>{citations.map((citation) => <li key={citation.id}>{citation.title} · {new Date(citation.entryDate).toLocaleDateString()}</li>)}</ul>}</div>}</div>}
        </>}
      </section>
    </div>
  </main>;
}
