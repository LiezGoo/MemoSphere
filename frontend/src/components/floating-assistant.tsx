'use client';

import { Bot, MessageCircle, Minus, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import AIChatPanel from '@/components/ai-chat-panel';

export default function FloatingAssistant({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    const openAssistant = () => { setHasOpened(true); setOpen(true); setMinimized(false); };
    window.addEventListener('alaala:assistant-open', openAssistant);
    return () => window.removeEventListener('alaala:assistant-open', openAssistant);
  }, []);

  const toggle = () => {
    if (minimized) { setHasOpened(true); setMinimized(false); setOpen(true); }
    else setOpen((current) => { const next = !current; if (next) setHasOpened(true); return next; });
  };

  return (
    <div className="assistant-widget">
      {hasOpened && <section className={`assistant-panel${!open || minimized ? ' is-hidden' : ''}`} role="dialog" aria-label="Chat with Memo" aria-modal="false">
        <header className="assistant-panel-header">
          <span className="assistant-panel-avatar"><Bot size={20} /></span>
          <div className="assistant-panel-title"><strong>Ask Memo</strong><span>Your private AI companion</span></div>
          <button className="assistant-control" type="button" aria-label="Minimize Memo" title="Minimize Memo" onClick={() => setMinimized(true)}><Minus size={17} /></button>
          <button className="assistant-control" type="button" aria-label="Close Memo" title="Close Memo" onClick={() => setOpen(false)}><X size={17} /></button>
        </header>
        <AIChatPanel userId={userId} compact />
      </section>}

      {minimized && <div className="assistant-minimized" role="group" aria-label="Memo chat minimized"><span><Bot size={16} /> Memo</span><button type="button" aria-label="Restore Memo" title="Restore Memo" onClick={() => setMinimized(false)}><Plus size={16} /></button><button type="button" aria-label="Close Memo" title="Close Memo" onClick={() => { setOpen(false); setMinimized(false); }}><X size={16} /></button></div>}

      <button className="assistant-launcher" type="button" title="Chat with Memo" aria-label="Ask Memo" aria-expanded={open && !minimized} onClick={toggle}>
        <MessageCircle size={23} />
        <span>Ask Memo</span>
      </button>
    </div>
  );
}
