import { z } from 'zod';

export const MAX_DRIVE_FILE_SIZE = 25 * 1024 * 1024;
const photoMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif', 'image/bmp', 'image/tiff']);
const documentMimes = new Set([
  'application/pdf', 'application/msword', 'application/rtf', 'text/rtf', 'text/plain', 'text/csv', 'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
]);
const blockedExtensions = /\.(?:exe|dll|com|bat|cmd|msi|ps1|sh|bash|zsh|js|mjs|cjs|jsx|ts|tsx|php|py|pyc|rb|pl|vbs|vbe|jar|class|wasm|hta|html?|svg|apk|dmg|pkg|deb|rpm|scr|pif|app)$/i;

export function sanitizeDriveFileName(value: string) {
  return value.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/\s+/g, ' ').replace(/^\.+/, '').trim().slice(0, 255);
}

const fileMetadata = z.object({
  driveFileId: z.string().trim().regex(/^[A-Za-z0-9_-]{8,200}$/),
  name: z.string().transform(sanitizeDriveFileName).pipe(z.string().min(1).max(255)),
  mime: z.string().trim().toLowerCase().max(150),
  size: z.coerce.number().int().positive().max(MAX_DRIVE_FILE_SIZE),
  category: z.enum(['photo', 'document', 'credential']),
}).strict().superRefine((file, context) => {
  if (blockedExtensions.test(file.name)) context.addIssue({ code: 'custom', path: ['name'], message: 'Executable and script files are not allowed.' });
  if (file.category === 'photo' ? !photoMimes.has(file.mime) : !documentMimes.has(file.mime)) {
    context.addIssue({ code: 'custom', path: ['mime'], message: 'This file type is not allowed for the selected category.' });
  }
});

export const fileCreateSchema = fileMetadata;
export const fileUpdateSchema = z.object({ name: z.string().transform(sanitizeDriveFileName).pipe(z.string().min(1).max(255)) }).strict();

export type ParsedYouTubeLink = { kind: 'playlist' | 'video'; youtubePlaylistId: string | null; youtubeVideoId: string | null; startSeconds: number | null };
export function parseYouTubeLink(value: string, choice?: 'playlist' | 'video'): ParsedYouTubeLink | null {
  if (value.length > 2048) return null;
  try {
    const url = new URL(value);
    const hosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com'];
    if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || url.port || url.username || url.password) return null;
    const rawList = url.searchParams.get('list');
    const playlistId = rawList && /^[A-Za-z0-9_-]{10,64}$/.test(rawList) ? rawList : null;
    if (rawList && !['/playlist', '/watch'].includes(url.pathname) && !(url.hostname === 'youtu.be' && /^\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname))) return null;
    const videoIdCandidate = url.hostname === 'youtu.be' ? url.pathname.split('/')[1] :
      url.pathname === '/watch' ? url.searchParams.get('v') :
      /^\/(?:shorts|embed|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : null;
    const videoId = videoIdCandidate && /^[A-Za-z0-9_-]{11}$/.test(videoIdCandidate) ? videoIdCandidate : null;
    if (rawList && !playlistId) return null;
    const time = url.searchParams.get('start') ?? url.searchParams.get('t');
    let startSeconds: number | null = null;
    if (time && /^\d+(?:h\d+m?\d*s?|m\d+s?|s)?$/.test(time)) {
      if (/^\d+$/.test(time)) startSeconds = Number(time);
      else {
        const parts = time.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
        if (parts) startSeconds = Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
      }
      if (!Number.isSafeInteger(startSeconds) || startSeconds! < 0) startSeconds = null;
    }
    if (playlistId && (choice ?? 'playlist') === 'playlist') return { kind: 'playlist', youtubePlaylistId: playlistId, youtubeVideoId: null, startSeconds: null };
    if (videoId) return { kind: 'video', youtubePlaylistId: null, youtubeVideoId: videoId, startSeconds };
    if (playlistId) return { kind: 'playlist', youtubePlaylistId: playlistId, youtubeVideoId: null, startSeconds: null };
    return null;
  } catch {
    return null;
  }
}

export function extractYouTubePlaylistId(value: string): string | null { return parseYouTubeLink(value)?.youtubePlaylistId ?? null; }
export const playlistCreateSchema = z.object({ url: z.string().trim().min(1).max(2048), choice: z.enum(['playlist', 'video']).optional() }).strict().transform(({ url, choice }, context) => {
  const parsed = parseYouTubeLink(url, choice);
  if (!parsed) {
    context.addIssue({ code: 'custom', path: ['url'], message: "That doesn't look like a YouTube link." });
    return z.NEVER;
  }
  return parsed;
});
export const playlistUpdateSchema = z.object({ title: z.string().trim().min(1).max(200) }).strict();
