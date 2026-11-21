import { describe, expect, it } from 'vitest';
import { extractYouTubePlaylistId, fileCreateSchema, parseYouTubeLink, playlistCreateSchema } from './files.validation.js';

describe('files metadata validation', () => {
  it('accepts allowed files and sanitizes their names', () => {
    const result = fileCreateSchema.safeParse({ driveFileId: 'drive_file-123456', name: '../passport:scan.pdf', mime: 'application/pdf', size: 2048, category: 'credential' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('_passport_scan.pdf');
  });

  it('rejects executables, category mismatches, and files larger than 25 MB', () => {
    const base = { driveFileId: 'drive_file-123456', name: 'file.bin', size: 100 };
    expect(fileCreateSchema.safeParse({ ...base, mime: 'application/x-msdownload', category: 'document' }).success).toBe(false);
    expect(fileCreateSchema.safeParse({ ...base, name: 'script.js', mime: 'text/plain', category: 'document' }).success).toBe(false);
    expect(fileCreateSchema.safeParse({ ...base, mime: 'application/pdf', category: 'photo' }).success).toBe(false);
    expect(fileCreateSchema.safeParse({ ...base, mime: 'text/plain', category: 'document', size: 25 * 1024 * 1024 + 1 }).success).toBe(false);
  });
});

describe('YouTube URL parsing', () => {
  it('accepts playlist and all supported video forms', () => {
    expect(extractYouTubePlaylistId('https://www.youtube.com/playlist?list=PL1234567890abc')).toBe('PL1234567890abc');
    expect(extractYouTubePlaylistId('https://youtube.com/watch?v=video123&list=PL1234567890abc&feature=share')).toBe('PL1234567890abc');
    expect(extractYouTubePlaylistId('https://youtu.be/abcdefghijk?list=PL1234567890abc&si=share-token')).toBe('PL1234567890abc');
    expect(playlistCreateSchema.safeParse({ url: 'https://m.youtube.com/playlist?list=PL1234567890abc' }).success).toBe(true);
    for (const url of [
      'https://youtube.com/watch?v=abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk',
      'https://m.youtube.com/shorts/abcdefghijk', 'https://music.youtube.com/embed/abcdefghijk',
      'https://youtu.be/abcdefghijk', 'https://youtube-nocookie.com/live/abcdefghijk',
    ]) expect(parseYouTubeLink(url)?.youtubeVideoId).toBe('abcdefghijk');
    expect(parseYouTubeLink('https://youtube.com/watch?v=abcdefghijk&t=90')?.startSeconds).toBe(90);
    expect(parseYouTubeLink('https://youtube.com/watch?v=abcdefghijk&t=1m30s')?.startSeconds).toBe(90);
    expect(parseYouTubeLink('https://youtube.com/watch?v=abcdefghijk&start=42')?.startSeconds).toBe(42);
    expect(parseYouTubeLink('https://youtube.com/watch?v=abcdefghijk&list=PL1234567890abc')?.kind).toBe('playlist');
    expect(parseYouTubeLink('https://youtube.com/watch?v=abcdefghijk&list=PL1234567890abc', 'video')?.kind).toBe('video');
  });

  it('rejects malformed and malicious playlist URLs', () => {
    for (const value of [
      'not a URL', 'javascript:alert(1)', 'https://youtube.com.evil.test/playlist?list=PL1234567890abc',
      'https://evil.test/?list=PL1234567890abc', 'http://youtube.com/playlist?list=PL1234567890abc',
      'https://youtube.com/playlist?list=<script>', 'https://youtube.com/watch?v=video123',
      'https://youtu.be/abcdefghijk', 'https://youtu.be.invalid/abcdefghijk?list=PL1234567890abc',
      'https://user@youtube.com/playlist?list=PL1234567890abc',
    ]) expect(extractYouTubePlaylistId(value)).toBeNull();
    expect(playlistCreateSchema.safeParse({ url: 'https://evil.test/?list=PL1234567890abc' }).success).toBe(false);
    for (const value of ['https://youtube.com.evil.test/watch?v=abcdefghijk', 'https://youtu.be.invalid/abcdefghijk', 'https://evil.test/watch?v=abcdefghijk', 'javascript:alert(1)', 'https://youtube.com/watch?v=bad']) expect(parseYouTubeLink(value)).toBeNull();
    expect(playlistCreateSchema.safeParse({ url: 'not a link' }).error?.issues[0]?.message).toBe("That doesn't look like a YouTube link.");
  });
});
