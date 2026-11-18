'use client';

import { Bot, ExternalLink, LoaderCircle, MessageCircle, Minus, Plus, Send, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ApiError, assistantService, type AssistantCitation } from '@/services/api';

type ChatMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: Date;
  citations: AssistantCitation[];
};

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'ASSISTANT',
  content: "Hi! I'm Memo, your personal diary companion. I'm here to help you revisit your memories, explore your thoughts, and find meaningful moments from your diary.",
  createdAt: new Date(0),
  citations: [],
};

function formatTime(date: Date) {
  if (date.getTime() === 0) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endOfMessages = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending, open]);

  useEffect(() => {
    const openAssistant = () => { setOpen(true); setMinimized(false); };
    window.addEventListener('alaala:assistant-open', openAssistant);
    return () => window.removeEventListener('alaala:assistant-open', openAssistant);
  }, []);

  const startNewConversation = () => {
    setConversationId(undefined);
    setMessages([welcomeMessage]);
    setQuestion('');
    setError('');
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || sending) return;

    setError('');
    setQuestion('');
    setSending(true);
    setMessages((current) => [...current, {
      id: `user-${Date.now()}`,
      role: 'USER',
      content: prompt,
      createdAt: new Date(),
      citations: [],
    }]);

    try {
      const result = await assistantService.ask({ question: prompt, conversationId });
      setConversationId(result.conversationId);
      setMessages((current) => [...current, {
        id: result.message.id,
        role: 'ASSISTANT',
        content: result.message.content,
        createdAt: new Date(),
        citations: result.message.citations ?? [],
      }]);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Memo couldn't respond. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="assistant-widget">
      {open && !minimized && <section className="assistant-panel" aria-label="Chat with Memo" aria-live="polite">
        <header className="assistant-panel-header">
          <span className="assistant-panel-avatar"><Bot size={20} /></span>
          <div className="assistant-panel-title"><strong>Memo</strong><span>Your personal diary companion</span></div>
          <button className="assistant-control" type="button" aria-label="New conversation" title="New conversation" onClick={startNewConversation}><Plus size={17} /></button>
          <button className="assistant-control" type="button" aria-label="Minimize Memo" title="Minimize Memo" onClick={() => setMinimized(true)}><Minus size={17} /></button>
          <button className="assistant-control" type="button" aria-label="Close Memo" title="Close Memo" onClick={() => setOpen(false)}><X size={17} /></button>
        </header>

        {/* <div className="assistant-privacy-note" role="note">
          Diary retrieval is not connected yet. Memo cannot access or cite diary entries. The current service stores conversations and responds that it has no authorized information to answer from. Earlier conversations cannot be reopened yet.
        </div> */}

        <div className="assistant-messages" aria-label="Chat with Memo">
          {messages.map((message) => <article key={message.id} className={`assistant-message ${message.role === 'USER' ? 'from-user' : 'from-assistant'}`}>
            {message.role === 'ASSISTANT' && <span className="assistant-message-avatar"><Bot size={15} /></span>}
            <div className="assistant-message-content">
              {message.role === 'ASSISTANT' && <span className="assistant-sender">Memo</span>}
              <p>{message.content}</p>
              {message.citations.length > 0 && <div className="assistant-citations">
                <span className="assistant-citations-title">Sources</span>
                {message.citations.map((citation) => <a key={citation.id} href={`/my-diary?entry=${encodeURIComponent(citation.id)}`} className="assistant-citation-link">
                  <span>{citation.title} - {new Date(citation.entryDate).toLocaleDateString()}</span><ExternalLink size={13} />
                </a>)}
              </div>}
              {message.createdAt.getTime() !== 0 && <time dateTime={message.createdAt.toISOString()}>{formatTime(message.createdAt)}</time>}
            </div>
          </article>)}
          {sending && <div className="assistant-typing" role="status"><LoaderCircle size={16} className="assistant-spinner" /> Memo is thinking...</div>}
          <div ref={endOfMessages} />
        </div>

        {error && <p className="assistant-error" role="alert">{error}</p>}
        <form className="assistant-composer" onSubmit={send}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleInputKeyDown} placeholder="Message Memo..." aria-label="Message Memo" rows={1} maxLength={4000} disabled={sending} />
          <button className="assistant-send" type="submit" aria-label="Send message" disabled={!question.trim() || sending}><Send size={17} /></button>
          <span className="assistant-input-hint">Enter to send - Shift+Enter for a new line</span>
        </form>
      </section>}

      {minimized && <div className="assistant-minimized" role="status"><span><Bot size={16} /> Memo</span><button type="button" aria-label="Restore Memo" title="Restore Memo" onClick={() => setMinimized(false)}><Plus size={16} /></button><button type="button" aria-label="Close Memo" title="Close Memo" onClick={() => { setOpen(false); setMinimized(false); }}><X size={16} /></button></div>}

      <button className="assistant-launcher" type="button" title="Chat with Memo" aria-label="Chat with Memo" aria-expanded={open && !minimized} onClick={() => { if (minimized) { setMinimized(false); setOpen(true); } else { setOpen((current) => !current); } }}>
        <MessageCircle size={23} />
        <span>Ask Memo</span>
      </button>
    </div>
  );
}
