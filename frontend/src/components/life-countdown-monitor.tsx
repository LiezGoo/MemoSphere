'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, lifeCountdownService, type LifeCountdown } from '@/services/api';

function remainingParts(ms: number) {
  let seconds = Math.max(0, Math.floor(ms / 1000));
  const years = Math.floor(seconds / 31536000); seconds %= 31536000;
  const months = Math.floor(seconds / 2592000); seconds %= 2592000;
  const days = Math.floor(seconds / 86400); seconds %= 86400;
  const hours = Math.floor(seconds / 3600); seconds %= 3600;
  const minutes = Math.floor(seconds / 60); seconds %= 60;
  return { years, months, days, hours, minutes, seconds };
}

function prettyDate(value?: string) {
  return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '—';
}

export default function LifeCountdownMonitor() {
  const [countdown, setCountdown] = useState<LifeCountdown | null>(null);
  const [now, setNow] = useState(Date.now());
  const [serverOffset, setServerOffset] = useState(0);
  const [durationDays, setDurationDays] = useState('365');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const completionChecked = useRef(new Set<string>());

  const load = () => lifeCountdownService.get().then((result) => {
    const value = result.countdown;
    setServerOffset(Date.parse(result.serverNow) - Date.now()); setNow(Date.parse(result.serverNow));
    setCountdown(value);
    if (value) { setDurationDays(String(value.durationDays)); setStartDate(value.startDate.slice(0, 10)); }
  }).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to load your countdown.')).finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!countdown || countdown.status === 'COMPLETED') return undefined;
    const timer = window.setInterval(() => setNow(Date.now() + serverOffset), 1000);
    return () => window.clearInterval(timer);
  }, [countdown, serverOffset]);

  const remaining = countdown ? Math.max(0, new Date(countdown.expirationDate).getTime() - now) : 0;
  const completed = countdown?.status === 'COMPLETED' || (countdown !== null && remaining === 0);
  const parts = remainingParts(remaining);
  const progress = countdown ? Math.min(100, Math.max(0, ((now - new Date(countdown.startDate).getTime()) / (new Date(countdown.expirationDate).getTime() - new Date(countdown.startDate).getTime())) * 100)) : 0;

  useEffect(() => {
    if (!countdown || countdown.status !== 'ACTIVE' || !completed || completionChecked.current.has(countdown.id)) return;
    completionChecked.current.add(countdown.id);
    lifeCountdownService.get().then((result) => { setServerOffset(Date.parse(result.serverNow) - Date.now()); setNow(Date.parse(result.serverNow)); if (result.countdown) setCountdown(result.countdown); }).catch(() => undefined);
  }, [countdown, completed]);

  const save = async () => {
    const days = Number(durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 36500 || !startDate) { setError('Choose a duration from 1 to 36,500 days and a valid start date.'); return; }
    const expiration = new Date(new Date(`${startDate}T00:00:00.000Z`).getTime() + days * 86400000);
    if (!window.confirm(`Activate this symbolic, user-configured countdown?\n\nStart: ${prettyDate(`${startDate}T00:00:00.000Z`)}\nExpected end: ${prettyDate(expiration.toISOString())}\n\nThis is a diary feature, not a medical device, health assessment, or prediction.`)) return;
    setSaving(true); setError('');
    try { const result = await lifeCountdownService.configure({ durationDays: days, startDate }, countdown !== null); setCountdown(result.countdown); setServerOffset(Date.parse(result.serverNow) - Date.now()); setNow(Date.parse(result.serverNow)); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to save your countdown.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="panel countdown-loading">Loading your countdown monitor…</div>;
  return <section className="countdown-panel" aria-label="Life Countdown Monitor">
    <div className="countdown-heading"><div><p className="eyebrow">A symbolic diary feature</p><h2>Life Countdown Monitor</h2></div><span className={`countdown-status ${completed ? 'completed' : countdown ? 'active' : ''}`}><i />{completed ? 'COUNTDOWN COMPLETED' : countdown ? 'COUNTDOWN ACTIVE' : 'NOT CONFIGURED'}</span></div>
    <div className={`ecg-monitor ${completed ? 'is-flatline' : ''}`}>
      <div className="ecg-readout" aria-live="off">{completed ? <>{['00','00','00','00','00','00'].map((value, index) => <span key={index}>{value}<small>{['YRS','MON','DAYS','HRS','MIN','SEC'][index]}</small></span>)}</> : countdown ? <><span>{String(parts.years).padStart(2, '0')}<small>YRS</small></span><span>{String(parts.months).padStart(2, '0')}<small>MON</small></span><span>{String(parts.days).padStart(2, '0')}<small>DAYS</small></span><span>{String(parts.hours).padStart(2, '0')}<small>HRS</small></span><span>{String(parts.minutes).padStart(2, '0')}<small>MIN</small></span><span>{String(parts.seconds).padStart(2, '0')}<small>SEC</small></span></> : <span className="ecg-prompt">Configure a countdown below</span>}</div>
      <div className="countdown-track" role="img" aria-label={countdown ? `Countdown ${Math.floor(progress)} percent elapsed` : 'Countdown progress awaiting configuration'}><span className="countdown-progress" style={{ width: `${progress}%` }} /><i className="countdown-knob" style={{ left: `${progress}%` }} /></div>
      <div className="ecg-dates"><span>START <strong>{prettyDate(countdown?.startDate)}</strong></span><span>{completed ? 'EXPIRED' : 'EXPECTED END'} <strong>{prettyDate(countdown?.expirationDate)}</strong></span></div>
      <p className="countdown-disclaimer">This is a diary feature, not a medical device, health assessment, or prediction.</p>
    </div>
    <div className="countdown-config"><div><h3>{countdown ? 'Configure a new countdown' : 'Set up your countdown'}</h3><p>Default duration is 365 days. Each new configuration is saved in your countdown history.</p></div><div className="countdown-fields"><label className="form-field"><span>Duration (days)</span><input type="number" min="1" max="36500" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} /></label><label className="form-field"><span>Start date</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><button className="button button-primary" type="button" disabled={saving} onClick={() => { void save(); }}>{saving ? 'Saving…' : countdown ? 'Confirm and reset' : 'Confirm and activate'}</button></div></div>
    {error && <p className="field-error" role="alert">{error}</p>}
  </section>;
}
