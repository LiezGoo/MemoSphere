'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Bot, LoaderCircle, Send, Trash2 } from 'lucide-react';
import { ApiError, assistantService, type AssistantCitation } from '@/services/api';
import Link from 'next/link';

type ChatMode = 'AI_BUDDY' | 'DIARY_ASSISTANT';
type ChatMessage = { id: string; role: 'USER' | 'ASSISTANT'; content: string; createdAt: string; citations: AssistantCitation[] };
const diarySuggestions = ['Search my saved memories.', 'What playlists and videos have I saved?', 'Summarize my Letter of Wishes.', 'Find a saved file by its name.'];

export default function AIChatPanel({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [mode, setMode] = useState<ChatMode>('AI_BUDDY');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<Array<{ id: string; mode: ChatMode; title: string | null; updatedAt: string }>>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const storageKey = `memosphere-assistant:${userId}`;

  const loadConversations = async (nextMode = mode) => {
    setLoading(true);
    setError('');
    try { setConversations(await assistantService.listConversations(nextMode)); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to load conversations.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadConversations(mode); }, [mode]);
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return;
        const state = JSON.parse(stored) as { conversationId?: unknown; mode?: unknown };
        const savedMode: ChatMode = state.mode === 'DIARY_ASSISTANT' ? 'DIARY_ASSISTANT' : 'AI_BUDDY';
        if (!active) return;
        setMode(savedMode);
        if (typeof state.conversationId !== 'string' || !state.conversationId) return;
        const conversation = await assistantService.getConversation(state.conversationId);
        if (!active) return;
        setConversationId(conversation.id);
        setMessages(conversation.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
          citations: message.citations ?? [],
        })));
      } catch {
        if (active) {
          try { localStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
          setConversationId(undefined);
          setMessages([]);
        }
      } finally { if (active) setRestoring(false); }
    };
    void restore();
    return () => { active = false; };
  }, [storageKey]);
  useEffect(() => {
    if (restoring) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ conversationId, mode })); }
    catch { /* The active conversation remains usable if storage is unavailable. */ }
  }, [conversationId, mode, restoring, storageKey]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending]);

  const changeMode = (nextMode: ChatMode) => {
    if (restoring || sending || creatingConversation || nextMode === mode) return;
    setMode(nextMode);
    setConversationId(undefined);
    setMessages([]);
    setError('');
  };

  const openConversation = async (id: string) => {
    if (restoring || openingConversationId) return;
    setError('');
    setOpeningConversationId(id);
    try {
      const conversation = await assistantService.getConversation(id);
      setConversationId(conversation.id);
      setMessages(conversation.messages.map((message) => ({ id: message.id, role: message.role, content: message.content, createdAt: message.createdAt, citations: message.citations ?? [] })));
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to open this conversation.'); }
    finally { setOpeningConversationId(null); }
  };

  const newConversation = async () => {
    if (restoring || loading || creatingConversation || sending) return;
    setError('');
    setCreatingConversation(true);
    try {
      const conversation = await assistantService.createConversation(mode);
      setConversationId(conversation.id);
      setMessages([]);
      await loadConversations(mode);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to create a conversation.'); }
    finally { setCreatingConversation(false); }
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || sending || creatingConversation || restoring) return;
    setSending(true); setError('');
    setQuestion('');
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'USER', content: prompt, createdAt: new Date().toISOString(), citations: [] }]);
    try {
      let id = conversationId;
      if (!id) {
        const conversation = await assistantService.createConversation(mode);
        id = conversation.id;
        setConversationId(id);
      }
      const result = await assistantService.send(id, prompt);
      setMessages((current) => [...current, { id: result.message.id, role: 'ASSISTANT', content: result.message.content, createdAt: new Date().toISOString(), citations: result.message.citations ?? [] }]);
      await loadConversations(mode);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Memo could not respond. Please try again.'); }
    finally { setSending(false); }
  };

  const removeConversation = async (id: string) => {
    try {
      await assistantService.removeConversation(id);
      if (conversationId === id) { setConversationId(undefined); setMessages([]); }
      await loadConversations(mode);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to delete this conversation.'); }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className={`ai-chat-page${compact ? ' is-compact' : ''}`}>
      <aside className="ai-chat-history">
        <button type="button" className="button button-primary" onClick={() => void newConversation()} disabled={restoring || loading || creatingConversation || sending}>{creatingConversation ? 'Startingâ€¦' : 'New conversation'}</button>
        <div className="ai-chat-history-list">
          {loading ? <p>Loading conversations...</p> : conversations.length ? conversations.map((conversation) => (
            <div className={conversationId === conversation.id ? 'is-active' : ''} key={conversation.id}>
              <button type="button" onClick={() => void openConversation(conversation.id)} disabled={restoring || openingConversationId !== null}>{openingConversationId === conversation.id ? 'Openingâ€¦' : conversation.title || 'Conversation'}</button>
              <button type="button" aria-label="Delete conversation" onClick={() => void removeConversation(conversation.id)}><Trash2 size={14} /></button>
            </div>
          )) : <p>No conversations yet.</p>}
        </div>
      </aside>
      <section className="ai-chat-main">
        <div className="ai-chat-modes" role="tablist" aria-label="Chat mode">
          <button type="button" role="tab" aria-selected={mode === 'AI_BUDDY'} className={mode === 'AI_BUDDY' ? 'is-active' : ''} onClick={() => changeMode('AI_BUDDY')} disabled={restoring || sending || creatingConversation}>AI Buddy</button>
          <button type="button" role="tab" aria-selected={mode === 'DIARY_ASSISTANT'} className={mode === 'DIARY_ASSISTANT' ? 'is-active' : ''} onClick={() => changeMode('DIARY_ASSISTANT')} disabled={restoring || sending || creatingConversation}>Diary Assistant</button>
        </div>
        <div className="ai-chat-messages" aria-live="polite">
          {restoring ? <div className="ai-chat-empty" role="status"><LoaderCircle size={24} /><p>Restoring your conversationâ€¦</p></div> : !messages.length ? <div className="ai-chat-empty"><Bot size={30} /><h2>{mode === 'AI_BUDDY' ? 'Talk with Memo' : 'Search your personal knowledge'}</h2><p>{mode === 'AI_BUDDY' ? 'Share what is on your mind or ask a general question.' : 'Ask about diary entries, voice transcripts, your Letter of Wishes, saved YouTube playlist titles and video references, or find a saved Drive file by name.'}</p>{mode === 'DIARY_ASSISTANT' && <><div className="ai-chat-suggestions" aria-label="Suggested questions">{diarySuggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}</div><small className="ai-chat-source-note">Drive file contents and the songs inside YouTube playlists are not indexed. You can open saved music references from Files.</small></>}</div> : messages.map((message) => (
            <article key={message.id} className={`ai-chat-message ${message.role === 'USER' ? 'from-user' : 'from-assistant'}`}>
              {message.role === 'ASSISTANT' && <span><Bot size={15} /></span>}
              <div><p>{message.content}</p>{message.citations.length > 0 && <div className="ai-chat-citations">{message.citations.map((citation) => <Link key={`${citation.sourceType ?? 'DIARY_ENTRY'}:${citation.id}`} href={citation.href ?? `/my-diary?entry=${encodeURIComponent(citation.id)}`}><small>{citation.sourceLabel ?? 'Diary entry'}</small><span>{citation.title}</span></Link>)}</div>}</div>
            </article>
          ))}
          {sending && <div className="ai-chat-loading" role="status"><LoaderCircle size={16} /> Memo is thinking...</div>}
          <div ref={end} />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <form className="ai-chat-composer" onSubmit={send}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} placeholder={mode === 'AI_BUDDY' ? 'Message your AI buddy...' : 'Ask about your saved content...'} rows={2} maxLength={4000} disabled={sending || restoring || creatingConversation} />
          <button type="submit" aria-label="Send message" disabled={!question.trim() || sending || restoring || creatingConversation}><Send size={17} /></button>
        </form>
      </section>
    </div>
  );
}
