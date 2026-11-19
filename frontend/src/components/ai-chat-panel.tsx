'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Bot, LoaderCircle, Send, Trash2 } from 'lucide-react';
import { ApiError, assistantService, type AssistantCitation } from '@/services/api';

type ChatMode = 'AI_BUDDY' | 'DIARY_ASSISTANT';
type ChatMessage = { id: string; role: 'USER' | 'ASSISTANT'; content: string; createdAt: string; citations: AssistantCitation[] };

export default function AIChatPanel() {
  const [mode, setMode] = useState<ChatMode>('AI_BUDDY');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<Array<{ id: string; mode: ChatMode; title: string | null; updatedAt: string }>>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);

  const loadConversations = async (nextMode = mode) => {
    setLoading(true);
    setError('');
    try { setConversations(await assistantService.listConversations(nextMode)); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to load conversations.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadConversations(mode); }, [mode]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending]);

  const changeMode = (nextMode: ChatMode) => {
    setMode(nextMode);
    setConversationId(undefined);
    setMessages([]);
    setError('');
  };

  const openConversation = async (id: string) => {
    setError('');
    try {
      const conversation = await assistantService.getConversation(id);
      setConversationId(conversation.id);
      setMessages(conversation.messages.map((message) => ({ id: message.id, role: message.role, content: message.content, createdAt: message.createdAt, citations: [] })));
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to open this conversation.'); }
  };

  const newConversation = async () => {
    setError('');
    try {
      const conversation = await assistantService.createConversation(mode);
      setConversationId(conversation.id);
      setMessages([]);
      await loadConversations(mode);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to create a conversation.'); }
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || sending) return;
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
    <div className="ai-chat-page">
      <aside className="ai-chat-history">
        <button type="button" className="button button-primary" onClick={() => void newConversation()}>New conversation</button>
        <div className="ai-chat-history-list">
          {loading ? <p>Loading conversations...</p> : conversations.length ? conversations.map((conversation) => (
            <div className={conversationId === conversation.id ? 'is-active' : ''} key={conversation.id}>
              <button type="button" onClick={() => void openConversation(conversation.id)}>{conversation.title || 'Conversation'}</button>
              <button type="button" aria-label="Delete conversation" onClick={() => void removeConversation(conversation.id)}><Trash2 size={14} /></button>
            </div>
          )) : <p>No conversations yet.</p>}
        </div>
      </aside>
      <section className="ai-chat-main">
        <div className="ai-chat-modes" role="tablist" aria-label="Chat mode">
          <button type="button" role="tab" aria-selected={mode === 'AI_BUDDY'} className={mode === 'AI_BUDDY' ? 'is-active' : ''} onClick={() => changeMode('AI_BUDDY')}>AI Buddy</button>
          <button type="button" role="tab" aria-selected={mode === 'DIARY_ASSISTANT'} className={mode === 'DIARY_ASSISTANT' ? 'is-active' : ''} onClick={() => changeMode('DIARY_ASSISTANT')}>Diary Assistant</button>
        </div>
        <div className="ai-chat-messages" aria-live="polite">
          {!messages.length ? <div className="ai-chat-empty"><Bot size={30} /><h2>{mode === 'AI_BUDDY' ? 'Talk with Memo' : 'Explore your memories'}</h2><p>{mode === 'AI_BUDDY' ? 'Share what is on your mind or ask a general question.' : 'Ask about experiences or memories from your own diary.'}</p></div> : messages.map((message) => (
            <article key={message.id} className={`ai-chat-message ${message.role === 'USER' ? 'from-user' : 'from-assistant'}`}>
              {message.role === 'ASSISTANT' && <span><Bot size={15} /></span>}
              <div><p>{message.content}</p>{message.citations.length > 0 && <div className="ai-chat-citations">{message.citations.map((citation) => <a key={citation.id} href={`/my-diary?entry=${encodeURIComponent(citation.id)}`}>{citation.title}</a>)}</div>}</div>
            </article>
          ))}
          {sending && <div className="ai-chat-loading" role="status"><LoaderCircle size={16} /> Memo is thinking...</div>}
          <div ref={end} />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <form className="ai-chat-composer" onSubmit={send}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} placeholder={mode === 'AI_BUDDY' ? 'Message your AI buddy...' : 'Ask about your diary...'} rows={2} maxLength={4000} disabled={sending} />
          <button type="submit" aria-label="Send message" disabled={!question.trim() || sending}><Send size={17} /></button>
        </form>
      </section>
    </div>
  );
}
