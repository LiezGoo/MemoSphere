'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AlertCircle, Check, Cloud, Download, ExternalLink, File, FileImage, FileText, FolderOpen, LoaderCircle, Music2, Play, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { ApiError, filesService, type UserFile, type UserFileCategory, type UserPlaylist } from '@/services/api';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim();
const GOOGLE_CLIENT_ID_DIAGNOSTIC = process.env.NODE_ENV === 'development'
  ? GOOGLE_CLIENT_ID ? `Client ID: set (length ${GOOGLE_CLIENT_ID.length})` : 'Client ID: missing'
  : '';
const PLAYLIST_API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '')}/api/files/playlists`;
const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif', 'image/bmp', 'image/tiff']);
const DOCUMENT_MIMES = new Set(['application/pdf', 'application/msword', 'application/rtf', 'text/rtf', 'text/plain', 'text/csv', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation']);
const BLOCKED_FILE_EXTENSION = /\.(?:exe|dll|com|bat|cmd|msi|ps1|sh|bash|zsh|js|mjs|cjs|jsx|ts|tsx|php|py|pyc|rb|pl|vbs|vbe|jar|class|wasm|hta|html?|svg|apk|dmg|pkg|deb|rpm|scr|pif|app)$/i;
const categoryLabels: Record<UserFileCategory, string> = { photo: 'Photos', document: 'Documents', credential: 'Credentials' };

type GoogleTokenResponse = { access_token?: string; expires_in?: number; error?: string };
type GoogleTokenClient = { requestAccessToken(options?: { prompt?: string }): void };
declare global {
  interface Window {
    google?: { accounts: { oauth2: { initTokenClient(options: { client_id: string; scope: string; callback(response: GoogleTokenResponse): void; error_callback?(error: { type?: string }): void }): GoogleTokenClient; revoke(token: string, callback?: () => void): void } } };
    __memosphereGisPromise?: Promise<void>;
  }
}
type FolderTree = Record<UserFileCategory, string>;
type UploadTask = { id: string; file: File; category: UserFileCategory; progress: number; state: 'uploading' | 'failed' | 'cancelled' | 'completed'; error?: string };

function loadGoogleIdentity() {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (window.__memosphereGisPromise) return window.__memosphereGisPromise;
  window.__memosphereGisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true;
    script.onload = () => window.google?.accounts.oauth2 ? resolve() : reject(new Error('Google sign-in could not be initialized.'));
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
    document.head.appendChild(script);
  });
  return window.__memosphereGisPromise;
}

function safeName(name: string) { return name.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/\s+/g, ' ').replace(/^\.+/, '').trim().slice(0, 255) || 'untitled-file'; }
function fileCategory(file: File): UserFileCategory | null {
  if (PHOTO_MIMES.has(file.type.toLowerCase())) return 'photo';
  if (DOCUMENT_MIMES.has(file.type.toLowerCase())) return 'document';
  return null;
}
function formatSize(value: string | number) {
  const size = Number(value);
  if (!Number.isFinite(size)) return 'Unknown size';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function driveError(status: number, action: string) {
  if (status === 401) return new Error('Your Google Drive connection expired. Connect again to continue.');
  if (status === 403 && action === 'upload') return new Error('Google Drive rejected this upload. Check your available Drive storage and try again.');
  if (status === 403) return new Error('Google Drive denied that action. Reconnect the account or check the file permissions.');
  return new Error(`Google Drive could not ${action} this file. Try again.`);
}

export default function FilesPage() {
  const [token, setToken] = useState('');
  const tokenRef = useRef('');
  const tokenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const folders = useRef<FolderTree | null>(null);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const uploadControllers = useRef(new Map<string, AbortController>());
  const uploadedDriveIds = useRef(new Map<string, string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [driveMessage, setDriveMessage] = useState('');
  const [files, setFiles] = useState<UserFile[]>([]);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [filesError, setFilesError] = useState('');
  const [playlistsError, setPlaylistsError] = useState('');
  const [playlistLoadReference, setPlaylistLoadReference] = useState('');
  const [category, setCategory] = useState<'all' | UserFileCategory>('all');
  const [uploadCategory, setUploadCategory] = useState<'auto' | UserFileCategory>('auto');
  const [mobileTab, setMobileTab] = useState<'files' | 'playlists'>('files');
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{ name: string; url: string; type: string } | null>(null);
  const [busyFileId, setBusyFileId] = useState('');
  const [renameFile, setRenameFile] = useState<UserFile | null>(null);
  const [renamePlaylist, setRenamePlaylist] = useState<UserPlaylist | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistBusy, setPlaylistBusy] = useState(false);
  const [playlistChoice, setPlaylistChoice] = useState<'playlist' | 'video'>('playlist');
  const expireDriveToken = () => { tokenRef.current = ''; folders.current = null; setToken(''); setDriveMessage('Your Google Drive connection expired. Reconnect to continue.'); };

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true); setFilesError('');
    try { setFiles(await filesService.list()); }
    catch (error) { setFilesError(error instanceof ApiError && error.status === 401 ? 'Your session has expired. Sign in again to see your files.' : 'Your saved file details could not be loaded. Try again.'); }
    finally { setLoadingFiles(false); }
  }, []);
  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true); setPlaylistsError(''); setPlaylistLoadReference('');
    try { setPlaylists(await filesService.listPlaylists()); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) setPlaylistsError('Your session has expired. Sign in again to see playlists.');
      else if (process.env.NODE_ENV === 'development' && error instanceof ApiError) setPlaylistsError(`Playlist request failed: GET ${error.url ?? PLAYLIST_API_URL} returned ${error.status}. ${error.message}`);
      else if (process.env.NODE_ENV === 'development') setPlaylistsError(`Playlist request failed before a response: GET ${PLAYLIST_API_URL}. ${error instanceof Error ? error.message : 'Network request failed.'}`);
      else { setPlaylistsError('Your playlists could not be loaded. Try again.'); if (error instanceof ApiError) setPlaylistLoadReference(error.requestId ?? ''); }
    }
    finally { setLoadingPlaylists(false); }
  }, []);
  useEffect(() => { void loadFiles(); void loadPlaylists(); }, [loadFiles, loadPlaylists]);
  useEffect(() => () => { xhrs.current.forEach((xhr) => xhr.abort()); uploadControllers.current.forEach((controller) => controller.abort()); if (tokenTimer.current) clearTimeout(tokenTimer.current); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  useEffect(() => {
    if (!preview && !renameFile && !renamePlaylist) return;
    const dialog = previewRef.current ?? document.querySelector<HTMLElement>('.files-modal-backdrop [role="dialog"]');
    const previous = document.activeElement as HTMLElement | null;
    const focusable = dialog?.querySelectorAll<HTMLElement>('button, a, input, [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { setPreview(null); setRenameFile(null); setRenamePlaylist(null); return; }
      if (event.key !== 'Tab' || !focusable?.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1]?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0]?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [preview, renameFile, renamePlaylist]);

  const googleJson = async <T,>(url: string, accessToken: string, init?: RequestInit, action = 'read'): Promise<T> => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    const response = await fetch(url, { ...init, headers });
    if (!response.ok) {
      if (response.status === 401) expireDriveToken();
      throw driveError(response.status, action);
    }
    return response.json() as Promise<T>;
  };

  const ensureFolder = async (accessToken: string, name: string, parentId?: string) => {
    const conditions = [`name='${name.replace(/'/g, "\\'")}'`, `mimeType='${GOOGLE_FOLDER_MIME}'`, 'trashed=false'];
    if (parentId) conditions.push(`'${parentId}' in parents`);
    const query = encodeURIComponent(conditions.join(' and '));
    const found = await googleJson<{ files: Array<{ id: string }> }>(`https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=20&fields=files(id)`, accessToken);
    if (found.files[0]) return found.files[0].id;
    const created = await googleJson<{ id: string }>('https://www.googleapis.com/drive/v3/files?fields=id', accessToken, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: GOOGLE_FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) }) }, 'create');
    return created.id;
  };

  const ensureDriveFolders = async (accessToken: string) => {
    if (folders.current) return folders.current;
    const root = await ensureFolder(accessToken, 'MemoSphere Files');
    const tree: FolderTree = { photo: await ensureFolder(accessToken, 'Photos', root), document: await ensureFolder(accessToken, 'Documents', root), credential: await ensureFolder(accessToken, 'Credentials', root) };
    folders.current = tree;
    return tree;
  };

  const connectDrive = async () => {
    setConnecting(true); setDriveMessage(''); setAccountEmail(''); folders.current = null;
    try {
      const clientId = GOOGLE_CLIENT_ID;
      if (!clientId) {
        setDriveMessage(process.env.NODE_ENV === 'development'
          ? 'Google Drive is not configured yet. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to frontend/.env.local, then restart the frontend dev server.'
          : "Google Drive isn't available right now.");
        return;
      }
      await loadGoogleIdentity();
      const accessToken = await new Promise<GoogleTokenResponse>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({ client_id: clientId, scope: DRIVE_SCOPE, callback: resolve, error_callback: () => reject(new Error('Google sign-in was cancelled.')) });
        client.requestAccessToken({ prompt: 'consent' });
      });
      if (!accessToken.access_token) throw new Error('Google did not return a Drive access token. Try connecting again.');
      tokenRef.current = accessToken.access_token;
      if (tokenTimer.current) clearTimeout(tokenTimer.current);
      const about = await googleJson<{ user?: { emailAddress?: string } }>('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', accessToken.access_token);
      await ensureDriveFolders(accessToken.access_token);
      setAccountEmail(about.user?.emailAddress ?? 'Google account');
      setToken(accessToken.access_token);
      tokenTimer.current = setTimeout(expireDriveToken, Math.max(1000, ((accessToken.expires_in ?? 3600) - 30) * 1000));
      setDriveMessage('Google Drive is ready. Files upload directly to your account.');
    } catch (error) {
      if (tokenRef.current) { tokenRef.current = ''; setToken(''); folders.current = null; }
      setDriveMessage(error instanceof Error ? error.message : 'Google Drive could not be connected. Try again.');
    } finally { setConnecting(false); }
  };

  const disconnectDrive = () => {
    const current = tokenRef.current;
    if (current && window.google?.accounts.oauth2) window.google.accounts.oauth2.revoke(current, () => undefined);
    tokenRef.current = ''; folders.current = null; setToken(''); setAccountEmail(''); setDriveMessage('Google Drive disconnected.');
    if (tokenTimer.current) clearTimeout(tokenTimer.current);
  };

  const uploadOne = async (file: File, categoryValue: UserFileCategory, taskId: string) => {
    const accessToken = tokenRef.current;
    if (!accessToken) { setDriveMessage('Connect Google Drive before uploading.'); setTasks((current) => current.map((task) => task.id === taskId ? { ...task, state: 'failed', error: 'Connect Google Drive before retrying.' } : task)); return; }
    const controller = new AbortController();
    uploadControllers.current.set(taskId, controller);
    const taskUpdate = (update: Partial<UploadTask>) => setTasks((current) => current.map((task) => task.id === taskId ? { ...task, ...update } : task));
    taskUpdate({ state: 'uploading', progress: 0, error: undefined });
    try {
      if (file.size > MAX_FILE_SIZE) throw new Error('Each file must be 25 MB or smaller.');
      if (file.size === 0) throw new Error('This file is empty. Choose a file with content.');
      if (BLOCKED_FILE_EXTENSION.test(file.name)) throw new Error('Executable and script files are not allowed.');
      const categoryFromMime = fileCategory(file);
      if (!categoryFromMime) throw new Error('Choose an image, PDF, Office document, or text file. Executables and scripts are not allowed.');
      if (categoryValue === 'photo' && categoryFromMime !== 'photo') throw new Error('Photos must use an approved image format.');
      if (categoryValue !== 'photo' && categoryFromMime !== 'document') throw new Error('Documents must use an approved document or text format.');
      const mime = file.type.toLowerCase();
      let driveFileId = uploadedDriveIds.current.get(taskId);
      if (!driveFileId) {
        const tree = await ensureDriveFolders(accessToken);
        const init = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,createdTime,webViewLink', {
          method: 'POST', signal: controller.signal,
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(file.size) },
          body: JSON.stringify({ name: safeName(file.name), mimeType: mime, parents: [tree[categoryValue]] }),
        });
        if (!init.ok) {
          if (init.status === 401) expireDriveToken();
          throw driveError(init.status, 'upload');
        }
        const sessionUrl = init.headers.get('Location');
        if (!sessionUrl) throw new Error('Google Drive did not start a resumable upload. Try again.');
        const uploaded = await new Promise<{ id: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest(); xhrs.current.set(taskId, xhr); xhr.open('PUT', sessionUrl); xhr.setRequestHeader('Content-Type', mime);
          xhr.upload.onprogress = (event) => { if (event.lengthComputable) taskUpdate({ progress: Math.round(event.loaded / event.total * 100) }); };
          xhr.onload = () => { xhrs.current.delete(taskId); if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(xhr.responseText) as { id: string }); } catch { reject(new Error('Google Drive returned an invalid upload response.')); } } else { if (xhr.status === 401) expireDriveToken(); reject(driveError(xhr.status, 'upload')); } };
          xhr.onerror = () => { xhrs.current.delete(taskId); reject(new Error('Upload interrupted. Retry to start the resumable upload again.')); };
          xhr.onabort = () => { xhrs.current.delete(taskId); reject(new Error('Upload cancelled.')); };
          xhr.send(file);
        });
        driveFileId = uploaded.id;
        uploadedDriveIds.current.set(taskId, driveFileId);
      }
      await filesService.create({ driveFileId, name: safeName(file.name), mime, size: file.size, category: categoryValue });
      uploadedDriveIds.current.delete(taskId);
      taskUpdate({ progress: 100, state: 'completed' });
      await loadFiles();
      window.setTimeout(() => setTasks((current) => current.filter((task) => task.id !== taskId)), 2200);
    } catch (error) {
      const message = controller.signal.aborted ? 'Upload cancelled.' : error instanceof Error ? error.message : 'Upload failed. Retry the file.';
      taskUpdate({ state: message.includes('cancelled') ? 'cancelled' : 'failed', error: message });
      if (message.includes('expired') || message.includes('Reconnect')) setDriveMessage(message);
    } finally { uploadControllers.current.delete(taskId); }
  };

  const queueFiles = (selected: FileList | File[]) => {
    const items = Array.from(selected);
    if (!items.length) return;
    const queued = items.map((file) => {
      const detected = fileCategory(file);
      const categoryValue: UserFileCategory = uploadCategory === 'auto' ? detected ?? 'document' : uploadCategory;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setTasks((current) => [...current, { id, file, category: categoryValue, progress: 0, state: 'uploading' }]);
      void uploadOne(file, categoryValue, id);
      return id;
    });
    void queued;
  };
  const cancelUpload = (task: UploadTask) => { uploadControllers.current.get(task.id)?.abort(); xhrs.current.get(task.id)?.abort(); setTasks((current) => current.map((item) => item.id === task.id ? { ...item, state: 'cancelled', error: 'Upload cancelled.' } : item)); };

  const driveFileAction = async (file: UserFile, action: 'preview' | 'download') => {
    const accessToken = tokenRef.current;
    if (!accessToken) { setDriveMessage('Connect Google Drive to preview or download files.'); return; }
    setBusyFileId(file.id);
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.driveFileId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) { if (response.status === 401) expireDriveToken(); throw driveError(response.status, action); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (action === 'preview') setPreview({ name: file.name, url, type: file.mime });
      else { const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch (error) { setDriveMessage(error instanceof Error ? error.message : 'Google Drive could not open this file.'); }
    finally { setBusyFileId(''); }
  };
  const openInDrive = async (file: UserFile) => {
    const accessToken = tokenRef.current;
    if (!accessToken) { setDriveMessage('Connect Google Drive to open this file.'); return; }
    try {
      const result = await googleJson<{ webViewLink?: string }>(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.driveFileId)}?fields=webViewLink`, accessToken);
      if (result.webViewLink) window.open(result.webViewLink, '_blank', 'noopener,noreferrer');
      else setDriveMessage('Google Drive could not open this file.');
    } catch (error) { setDriveMessage(error instanceof Error ? error.message : 'Google Drive could not open this file.'); }
  };
  const removeFile = async (file: UserFile) => {
    if (!window.confirm(`Move “${file.name}” to your Google Drive trash?`)) return;
    const accessToken = tokenRef.current;
    if (!accessToken) { setDriveMessage('Connect Google Drive to delete files.'); return; }
    setBusyFileId(file.id);
    try {
      await googleJson(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.driveFileId)}`, accessToken, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) }, 'delete');
      await filesService.remove(file.id); setFiles((current) => current.filter((item) => item.id !== file.id));
    } catch (error) { setDriveMessage(error instanceof Error ? error.message : 'The file could not be moved to Drive trash.'); }
    finally { setBusyFileId(''); }
  };
  const saveFileName = async (event: FormEvent) => {
    event.preventDefault(); if (!renameFile || !tokenRef.current) { setDriveMessage('Reconnect Google Drive before renaming files.'); return; }
    const name = safeName(renameValue); setBusyFileId(renameFile.id);
    try {
      await googleJson(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(renameFile.driveFileId)}`, tokenRef.current, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }, 'rename');
      const updated = await filesService.rename(renameFile.id, name); setFiles((current) => current.map((file) => file.id === updated.id ? updated : file)); setRenameFile(null);
    } catch (error) { setDriveMessage(error instanceof Error ? error.message : 'The file could not be renamed.'); }
    finally { setBusyFileId(''); }
  };

  const submitPlaylist = async (event: FormEvent) => {
    event.preventDefault(); if (!playlistUrl.trim()) return;
    setPlaylistBusy(true); setPlaylistsError('');
    try {
      const saved = await filesService.addPlaylist(playlistUrl.trim(), playlistChoice);
      setPlaylists((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
      setPlaylistUrl(''); setPlaylistChoice('playlist');
      window.dispatchEvent(new Event('memosphere:playlists-updated'));
      void loadPlaylists();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setPlaylistsError('Your session has expired. Sign in again, then save the playlist.');
      else if (error instanceof ApiError && error.status === 409) setPlaylistsError(error.message);
      else if (error instanceof ApiError && error.status === 422) setPlaylistsError("That doesn't look like a YouTube link.");
      else if (error instanceof ApiError && error.status === 429) setPlaylistsError('Too many playlist changes. Wait a little and try again.');
      else if (error instanceof ApiError && error.status >= 500) setPlaylistsError('A server error prevented saving this playlist. Try again later.');
      else if (error instanceof TypeError) setPlaylistsError('MemoSphere could not reach the server. Check your connection and try again.');
      else setPlaylistsError('The playlist could not be saved. Try again.');
    }
    finally { setPlaylistBusy(false); }
  };
  const savePlaylistTitle = async (event: FormEvent) => {
    event.preventDefault(); if (!renamePlaylist) return;
    try { const item = await filesService.renamePlaylist(renamePlaylist.id, renameValue.trim()); setPlaylists((current) => current.map((playlist) => playlist.id === item.id ? item : playlist)); setRenamePlaylist(null); window.dispatchEvent(new Event('memosphere:playlists-updated')); }
    catch (error) { setPlaylistsError(error instanceof ApiError ? error.message : 'The playlist title could not be saved.'); }
  };
  const removePlaylist = async (playlist: UserPlaylist) => {
    if (!window.confirm(`Remove “${playlist.title}” from MemoSphere?`)) return;
    try { await filesService.removePlaylist(playlist.id); setPlaylists((current) => current.filter((item) => item.id !== playlist.id)); window.dispatchEvent(new Event('memosphere:playlists-updated')); }
    catch { setPlaylistsError('The playlist could not be removed. Try again.'); }
  };
  const playPlaylist = (playlist: UserPlaylist) => window.dispatchEvent(new CustomEvent<UserPlaylist>('memosphere:play-playlist', { detail: playlist }));
  const playAll = () => window.dispatchEvent(new CustomEvent<UserPlaylist[]>('memosphere:play-queue', { detail: playlists }));
  const hasBothIds = (() => { try { const parsed = new URL(playlistUrl); return Boolean(parsed.searchParams.get('list') && (parsed.searchParams.get('v') || /^\/(?:shorts|embed|live)\//.test(parsed.pathname) || parsed.hostname === 'youtu.be')); } catch { return false; } })();

  const visibleFiles = files.filter((file) => category === 'all' || file.category === category);
  const categoryTabKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options: Array<'all' | UserFileCategory> = ['all', 'photo', 'document', 'credential'];
    const index = options.indexOf(category);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    setCategory(options[next]);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  const mobileTabKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' || event.key === 'ArrowLeft' ? 'files' : 'playlists';
    setMobileTab(next);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[role="tab"][aria-label="${next}"]`)?.focus();
  };
  const dropFiles = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length) queueFiles(event.dataTransfer.files); };

  return <section className="files-page">
    <header className="files-page-heading"><p className="eyebrow">Your private library</p><h1>Files</h1><p>Keep important files in your own Google Drive and YouTube close by.</p></header>
    <div className="files-mobile-tabs" role="tablist" aria-label="Files and playlists"><button type="button" role="tab" aria-label="files" aria-selected={mobileTab === 'files'} onClick={() => setMobileTab('files')} onKeyDown={mobileTabKey}>Files</button><button type="button" role="tab" aria-label="playlists" aria-selected={mobileTab === 'playlists'} onClick={() => setMobileTab('playlists')} onKeyDown={mobileTabKey}>Playlists</button></div>
    <div className="files-page-layout">
      <div className={`files-main-column${mobileTab !== 'files' ? ' mobile-hidden' : ''}`}>
        <section className="files-drive-card" aria-label="Google Drive connection">
          <div className="files-drive-icon"><Cloud size={22} /></div><div className="files-drive-copy"><strong>{token ? 'Google Drive connected' : 'Your files stay in your Drive'}</strong><span>{token ? accountEmail : 'Connect your own Google Drive to add, preview, and manage files.'}</span></div>
      {token ? <button type="button" className="files-secondary-button" onClick={disconnectDrive}>Disconnect</button> : <button type="button" className="files-primary-button" disabled={connecting || !GOOGLE_CLIENT_ID} onClick={() => void connectDrive()}>{connecting ? <><LoaderCircle size={16} className="files-spin" /> Connecting…</> : 'Connect Google Drive'}</button>}
        </section>
        {process.env.NODE_ENV === 'development' && <p className="files-youtube-note" role="status">{GOOGLE_CLIENT_ID_DIAGNOSTIC}</p>}
        {!GOOGLE_CLIENT_ID && <p className={process.env.NODE_ENV === 'development' ? 'files-error' : 'files-notice'} role="status">{process.env.NODE_ENV === 'development' ? 'Google Drive is not configured yet. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to frontend/.env.local, then restart the frontend dev server.' : "Google Drive isn't available right now."}</p>}
        {driveMessage && <p className={driveMessage.includes('ready') || driveMessage.includes('disconnected') ? 'files-notice' : 'files-error'} role={driveMessage.includes('ready') ? 'status' : 'alert'}>{driveMessage}</p>}
        <div className="files-content-card">
          <div className="files-upload-zone" data-dragging={dragging} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={dropFiles}>
            <span className="files-upload-icon"><Upload size={22} /></span><strong>Drop files here</strong><span>Photos, PDFs, Office files, and text up to 25 MB each</span>
            <label className="files-upload-category">Save to <select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as typeof uploadCategory)}><option value="auto">Auto category</option><option value="photo">Photos</option><option value="document">Documents</option><option value="credential">Credentials</option></select></label>
            <button type="button" className="files-primary-button" disabled={!token} onClick={() => fileInput.current?.click()}><Plus size={16} /> Choose files</button>
            <input ref={fileInput} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/bmp,image/tiff,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.csv,.md" onChange={(event) => { if (event.target.files) queueFiles(event.target.files); event.currentTarget.value = ''; }} />
            {!token && <small>Connect Google Drive before uploading.</small>}
          </div>
          <div className="files-category-tabs" role="tablist" aria-label="Filter files by category">{(['all', 'photo', 'document', 'credential'] as const).map((value) => <button type="button" role="tab" aria-selected={category === value} className={category === value ? 'is-active' : ''} key={value} onClick={() => setCategory(value)} onKeyDown={categoryTabKey}>{value === 'all' ? 'All' : categoryLabels[value]}</button>)}</div>
          {category === 'credential' && <p className="files-credential-notice" role="note">Upload documents like IDs or certificates. Don&apos;t upload plain-text passwords.</p>}
          {tasks.length > 0 && <div className="files-upload-tasks" aria-label="Uploads">{tasks.map((task) => <div className="files-upload-task" key={task.id}><div><strong>{task.file.name}</strong><span>{task.state === 'uploading' ? `Uploading · ${task.progress}%` : task.state === 'completed' ? 'Uploaded to Google Drive' : task.error}</span></div>{task.state === 'uploading' ? <button type="button" aria-label={`Cancel ${task.file.name}`} onClick={() => cancelUpload(task)}><X size={16} /></button> : task.state === 'failed' ? <button type="button" aria-label={`Retry ${task.file.name}`} onClick={() => void uploadOne(task.file, task.category, task.id)}><RefreshCw size={16} /></button> : <Check size={16} aria-label={task.state === 'completed' ? 'Upload complete' : 'Cancelled'} />}<progress max="100" value={task.progress} aria-label={`${task.file.name} upload progress`} /></div>)}</div>}
          <div className="files-list-heading"><div><h2>{category === 'all' ? 'Your files' : categoryLabels[category]}</h2><span>{visibleFiles.length} {visibleFiles.length === 1 ? 'file' : 'files'}</span></div><button className="files-icon-button" type="button" aria-label="Refresh files" onClick={() => void loadFiles()}><RefreshCw size={16} /></button></div>
          {filesError ? <div className="files-state files-state-error" role="alert"><AlertCircle size={20} /><p>{filesError}</p><button type="button" onClick={() => void loadFiles()}>Retry</button></div> : loadingFiles ? <div className="files-skeleton" role="status" aria-label="Loading files"><i /><i /><i /></div> : visibleFiles.length === 0 ? <div className="files-empty-state"><FolderOpen size={27} /><strong>No files here yet</strong><span>{category === 'all' ? 'Connect Drive and upload a file to get started.' : `Files in ${categoryLabels[category].toLowerCase()} will appear here.`}</span></div> : <ul className="files-list">{visibleFiles.map((file) => <li className="files-list-item" key={file.id}>
            <button type="button" className="files-preview-button" aria-label={`Preview ${file.name}`} disabled={!token || busyFileId === file.id || !(file.mime.startsWith('image/') || file.mime === 'application/pdf')} onClick={() => void driveFileAction(file, 'preview')}>{file.mime.startsWith('image/') ? <FileImage size={21} /> : file.mime === 'application/pdf' ? <FileText size={21} /> : <File size={21} />}</button>
            <div className="files-item-details"><strong title={file.name}>{file.name}</strong><span>{formatSize(file.size)} · {categoryLabels[file.category]} · {new Date(file.createdAt).toLocaleDateString()}</span></div>
            <div className="files-item-actions"><button type="button" aria-label={`Download ${file.name}`} title="Download" disabled={!token || busyFileId === file.id} onClick={() => void driveFileAction(file, 'download')}><Download size={16} /></button><button type="button" aria-label={`Rename ${file.name}`} title="Rename" disabled={!token || busyFileId === file.id} onClick={() => { setRenameFile(file); setRenameValue(file.name); }}><span aria-hidden="true">Aa</span></button><button type="button" aria-label={`Open ${file.name} in Drive`} title="Open in Drive" disabled={!token || busyFileId === file.id} onClick={() => void openInDrive(file)}><ExternalLink size={16} /></button><button type="button" aria-label={`Delete ${file.name}`} title="Move to Drive trash" disabled={!token || busyFileId === file.id} onClick={() => void removeFile(file)}>{busyFileId === file.id ? <LoaderCircle size={16} className="files-spin" /> : <Trash2 size={16} />}</button></div>
          </li>)}</ul>}
        </div>
      </div>
      <aside className={`files-playlists-panel${mobileTab !== 'playlists' ? ' mobile-hidden' : ''}`} aria-labelledby="files-playlists-title">
        <div className="files-playlist-heading"><span><Music2 size={19} /></span><div><h2 id="files-playlists-title">YouTube</h2><p>Up to 30 videos and playlists</p></div></div>
        <form className="files-playlist-form" onSubmit={(event) => void submitPlaylist(event)}><label htmlFor="playlist-url">Add a YouTube video or playlist</label><input id="playlist-url" type="url" value={playlistUrl} onChange={(event) => setPlaylistUrl(event.target.value)} placeholder="Paste a YouTube link" maxLength={2048} required />{hasBothIds && <fieldset className="youtube-choice"><legend>Choose what to add</legend><label><input type="radio" name="youtube-choice" value="playlist" checked={playlistChoice === 'playlist'} onChange={() => setPlaylistChoice('playlist')} /> Add the playlist</label><label><input type="radio" name="youtube-choice" value="video" checked={playlistChoice === 'video'} onChange={() => setPlaylistChoice('video')} /> Add just this video</label></fieldset>}<button type="submit" className="files-primary-button" disabled={playlistBusy || playlists.length >= 30}>{playlistBusy ? 'Adding…' : 'Add to YouTube'}</button></form>
        <p className="files-youtube-note">Playback is provided by YouTube.</p>
        {playlistsError && <div className="files-error" role="alert">{playlistsError}{playlistLoadReference && <small className="files-error-reference">Reference: {playlistLoadReference}</small>}</div>}
        {!loadingPlaylists && playlists.length > 0 && <button type="button" className="files-secondary-button youtube-play-all" onClick={playAll}>Play all</button>}
        {loadingPlaylists ? <div className="files-skeleton files-playlist-skeleton" role="status" aria-label="Loading YouTube items"><i /><i /></div> : playlists.length === 0 ? <div className="files-playlists-empty"><Music2 size={23} /><span>Add your first YouTube video or playlist.</span></div> : <ul className="files-playlist-list">{playlists.map((playlist) => <li key={playlist.id}>
          <div className="files-playlist-card">{playlist.kind === 'video' || playlist.youtubeVideoId ? <div className="youtube-thumb"><img src={`https://i.ytimg.com/vi/${playlist.youtubeVideoId}/hqdefault.jpg`} alt="" /><button type="button" className="files-play-button" aria-label={`Play ${playlist.title}`} onClick={() => playPlaylist(playlist)}><Play size={16} fill="currentColor" /></button></div> : <button type="button" className="files-play-button" aria-label={`Play ${playlist.title}`} onClick={() => playPlaylist(playlist)}><Music2 size={17} /></button>}<div className="files-playlist-copy"><strong title={playlist.title}>{playlist.title}</strong><span>{playlist.kind === 'video' || playlist.youtubeVideoId ? 'YouTube video' : 'YouTube playlist'}</span></div><button type="button" aria-label={`Rename ${playlist.title}`} onClick={() => { setRenamePlaylist(playlist); setRenameValue(playlist.title); }}>Aa</button><button type="button" aria-label={`Remove ${playlist.title}`} onClick={() => void removePlaylist(playlist)}><Trash2 size={15} /></button></div>
        </li>)}</ul>}
      </aside>
    </div>
    {renameFile && <div className="files-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setRenameFile(null); }}><form className="files-modal" role="dialog" aria-modal="true" aria-labelledby="rename-file-title" onSubmit={(event) => void saveFileName(event)}><button type="button" className="files-modal-close" aria-label="Close rename dialog" onClick={() => setRenameFile(null)}><X size={18} /></button><h2 id="rename-file-title">Rename file</h2><label htmlFor="rename-file-input">File name</label><input id="rename-file-input" autoFocus maxLength={255} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} required /><div><button type="button" className="files-secondary-button" onClick={() => setRenameFile(null)}>Cancel</button><button type="submit" className="files-primary-button" disabled={busyFileId === renameFile.id}>Save name</button></div></form></div>}
    {renamePlaylist && <div className="files-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setRenamePlaylist(null); }}><form className="files-modal" role="dialog" aria-modal="true" aria-labelledby="rename-playlist-title" onSubmit={(event) => void savePlaylistTitle(event)}><button type="button" className="files-modal-close" aria-label="Close rename dialog" onClick={() => setRenamePlaylist(null)}><X size={18} /></button><h2 id="rename-playlist-title">Rename playlist</h2><label htmlFor="rename-playlist-input">Playlist title</label><input id="rename-playlist-input" autoFocus maxLength={200} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} required /><div><button type="button" className="files-secondary-button" onClick={() => setRenamePlaylist(null)}>Cancel</button><button type="submit" className="files-primary-button">Save title</button></div></form></div>}
    {preview && <div className="files-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}><div ref={previewRef} className="files-preview-modal" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`}><header><strong>{preview.name}</strong><button type="button" aria-label="Close preview" onClick={() => setPreview(null)}><X size={20} /></button></header>{preview.type === 'application/pdf' ? <iframe title={`PDF preview: ${preview.name}`} src={preview.url} /> : <img src={preview.url} alt={preview.name} />}</div></div>}
  </section>;
}
