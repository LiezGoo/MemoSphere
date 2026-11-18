'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, faceAuthService, profileService, type Profile } from '@/services/api';
import FaceCapture from '@/components/face-capture';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export default function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [preferences, setPreferences] = useState<Profile['notificationPreferences']>({ countdown: true, reminder: false, revision_ready: true, system: true });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [faceEnabled, setFaceEnabled] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  const [facePassword, setFacePassword] = useState('');

  useEffect(() => {
    profileService.get().then((value) => {
      setProfile(value); setDisplayName(value.fullName); setBio(value.bio ?? ''); setTimezone(value.timezone);
      setPreferences(value.notificationPreferences);
    }).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to load your profile.')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { void faceAuthService.status().then((value) => setFaceEnabled(value.enabled)).catch(() => undefined); }, []);
  useEffect(() => () => { if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const updated = await profileService.update({ displayName, bio, timezone, notificationPreferences: preferences });
      setProfile(updated); setMessage('Profile settings saved.'); window.dispatchEvent(new Event('memosphere:profile-updated'));
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to save profile settings.'); }
    finally { setSaving(false); }
  };
  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Choose an image that is 2 MB or smaller.'); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Choose a PNG, JPG, or WebP image.'); return; }
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); setError('');
  };
  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setSaving(true); setError(''); setMessage('');
    try { const updated = await profileService.uploadAvatar(avatarFile); setProfile((current) => current ? { ...current, avatarUrl: updated.avatarUrl } : current); setAvatarFile(null); setAvatarPreview(''); setMessage('Avatar updated.'); window.dispatchEvent(new Event('memosphere:profile-updated')); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to upload avatar.'); }
    finally { setSaving(false); }
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { const result = await profileService.changePassword({ currentPassword, newPassword }); setMessage(result.data.message); setCurrentPassword(''); setNewPassword(''); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to change password.'); }
    finally { setSaving(false); }
  };
  const deleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (confirmation !== 'DELETE MY ACCOUNT' || !window.confirm('Permanently delete your MemoSphere account and its associated data? This cannot be undone.')) return;
    setSaving(true); setError('');
    try { await profileService.deleteAccount({ confirmation: 'DELETE MY ACCOUNT', currentPassword: deletePassword }); window.location.assign('/login'); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to delete this account.'); setSaving(false); }
  };

  if (loading) return <div className="panel loading-state">Loading profile settings…</div>;
  if (!profile) return <div className="panel error-state"><h2>Profile unavailable</h2><p>{error}</p></div>;
  const preferenceLabels: [keyof Profile['notificationPreferences'], string, string][] = [
    ['countdown', 'Countdown reflections', 'Configuration and milestone reminders for your personal countdown.'],
    ['reminder', 'Diary reminders', 'A gentle daily prompt to capture a thought.'],
    ['revision_ready', 'Writing mode updates', 'A note when a writing mode preview has finished.'],
    ['system', 'Product updates', 'Helpful updates about your MemoSphere space.'],
  ];

  return <>
    <div className="section-heading"><div><p className="eyebrow">Your account</p><h1>Profile settings</h1><p className="section-description">Manage your personal details and notification preferences.</p></div></div>
    {error && <p className="profile-toast profile-toast-error" role="alert">{error}</p>}{message && <p className="profile-toast" role="status">{message}</p>}
    <form className="panel profile-card" onSubmit={saveProfile}>
      <h2>Profile</h2>
      <div className="profile-avatar-row"><span className="profile-avatar-preview">{avatarPreview || profile.avatarUrl ? <img src={avatarPreview || `${API_BASE}${profile.avatarUrl}`} alt="Profile avatar preview" /> : profile.fullName.slice(0, 1).toUpperCase()}</span><div><label className="profile-file-button">Choose avatar<input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectAvatar} /></label><small>PNG, JPG, or WebP. Maximum 2 MB.</small></div>{avatarFile && <button className="button button-secondary" type="button" disabled={saving} onClick={() => { void uploadAvatar(); }}>Upload image</button>}</div>
      <label className="form-field"><span>Display name</span><input required maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
      <label className="form-field"><span>Email address</span><input value={profile.email} readOnly /></label>
      <label className="form-field"><span>Bio</span><textarea rows={3} maxLength={2000} value={bio} onChange={(event) => setBio(event.target.value)} /></label>
      <label className="form-field"><span>Timezone (IANA name)</span><input required value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Asia/Manila" /></label>
      <div className="profile-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div>
    </form>
    <section className="panel profile-card" id="notifications"><h2>Notification preferences</h2><p>Security notifications are always delivered. Diary reminders are off until you opt in.</p><div className="profile-preferences">{preferenceLabels.map(([key, label, description]) => <label key={key} className="profile-preference"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={preferences[key]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} /></label>)}</div><button className="button button-secondary" type="button" disabled={saving} onClick={() => { void profileService.update({ notificationPreferences: preferences }).then((updated) => { setProfile(updated); setMessage('Notification preferences saved.'); setError(''); }).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to save preferences.')); }}>Save notification preferences</button></section>
    <section className="panel profile-card"><h2>Face login</h2><p>{faceEnabled ? 'Face login is enabled for this account.' : 'Use your device camera for a faster sign-in. Your face template is encrypted.'}</p>{!faceEnabled && <label className="form-field"><span>Confirm with your password</span><input type="password" autoComplete="current-password" value={facePassword} onChange={(event) => setFacePassword(event.target.value)} /></label>}<div className="profile-actions">{faceEnabled ? <button className="button button-secondary" type="button" onClick={() => { const password = window.prompt('Enter your current password to disable face login.'); if (password) void faceAuthService.remove(password).then(() => setFaceEnabled(false)).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to disable face login.')); }}>Disable face login</button> : <button className="button button-secondary" type="button" disabled={!facePassword} onClick={() => setFaceOpen(true)}>Set up face login</button>}</div></section>
    <form className="panel profile-card" onSubmit={changePassword}><h2>Change password</h2><label className="form-field"><span>Current password</span><input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label className="form-field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><small className="field-help">At least 8 characters, with uppercase, lowercase, and a number.</small></label><button className="button button-secondary" type="submit" disabled={saving}>Change password</button></form>
    <form className="panel profile-card profile-danger-zone" onSubmit={deleteAccount}><p className="eyebrow">Danger zone</p><h2>Delete account</h2><p>Deleting your account permanently removes your profile and associated diary data.</p><label className="form-field"><span>Type DELETE MY ACCOUNT to confirm</span><input required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><label className="form-field"><span>Confirm with your current password</span><input required type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /></label><button className="button button-danger" type="submit" disabled={saving || confirmation !== 'DELETE MY ACCOUNT'}>Delete my account</button></form>
    {faceOpen && <FaceCapture purpose="enroll" password={facePassword} onClose={() => setFaceOpen(false)} onComplete={() => { setFaceOpen(false); setFaceEnabled(true); setFacePassword(''); setMessage('Face login enabled.'); }} />}
  </>;
}
