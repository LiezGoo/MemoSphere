import { prisma } from '../../config/prisma.js';

export type PersonalSourceType = 'DIARY_ENTRY' | 'LETTER_OF_WISHES' | 'FILE_METADATA' | 'PLAYLIST';
export type PersonalSource = {
  id: string;
  type: PersonalSourceType;
  title: string;
  date: Date;
  content: string;
  href: string;
  score: number;
};

const stopWords = new Set(['about', 'after', 'again', 'also', 'been', 'before', 'being', 'between', 'could', 'did', 'does', 'doing', 'ever', 'everything', 'find', 'for', 'from', 'have', 'help', 'into', 'just', 'last', 'like', 'make', 'mentioned', 'more', 'myself', 'over', 'please', 'really', 'search', 'should', 'that', 'their', 'them', 'there', 'these', 'they', 'this', 'through', 'under', 'very', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your', 'the', 'was', 'were', 'are', 'and', 'but', 'not', 'you', 'all', 'any', 'can', 'how', 'did', 'does', 'summarize', 'summarise', 'document', 'documents', 'uploaded', 'saved', 'content']);

export function searchTerms(question: string) {
  return [...new Set(question.toLowerCase().normalize('NFKD').match(/[\p{L}\p{N}]{3,}/gu) ?? [])]
    .filter((term) => !stopWords.has(term)).slice(0, 10);
}

export function matchScore(text: string, terms: string[]) {
  const words = new Set(text.toLowerCase().normalize('NFKD').match(/[\p{L}\p{N}]{3,}/gu) ?? []);
  return terms.reduce((score, term) => score + (words.has(term) ? 1 : 0), 0);
}

function excerpt(text: string, terms: string[], limit: number) {
  const clean = text.trim();
  if (clean.length <= limit) return clean;
  const normalized = clean.toLowerCase();
  const positions = terms.map((term) => normalized.indexOf(term)).filter((position) => position >= 0);
  const start = positions.length ? Math.max(0, Math.min(...positions) - Math.floor(limit * 0.18)) : 0;
  const end = Math.min(clean.length, start + limit);
  return `${start ? '…' : ''}${clean.slice(start, end)}${end < clean.length ? '…' : ''}`;
}

export async function retrievePersonalSources(ownerId: string, question: string): Promise<PersonalSource[]> {
  const terms = searchTerms(question);
  const fileIntent = /\b(file|files|document|documents|pdf|docx|word|uploaded)\b/i.test(question);
  const playlistIntent = /\b(playlist|playlists|music|song|songs|track|tracks|artist|artists|album|albums|youtube)\b/i.test(question);
  const diaryMatch = terms.length ? { OR: terms.flatMap((term) => [
    { title: { contains: term } }, { originalContent: { contains: term } },
    { normalizedContent: { contains: term } }, { transcript: { contains: term } },
  ]) } : {};
  const [entries, wishes, files, playlists] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { ownerId, status: { not: 'DELETED' }, ...diaryMatch },
      orderBy: { entryDate: 'desc' }, take: terms.length ? 30 : 8,
      select: { id: true, title: true, entryDate: true, originalContent: true, normalizedContent: true, transcript: true },
    }),
    prisma.letterOfWishes.findUnique({ where: { ownerId }, select: { id: true, title: true, content: true, updatedAt: true } }),
    prisma.userFile.findMany({ where: { ownerId }, select: { id: true, name: true, mime: true, createdAt: true } }),
    prisma.userPlaylist.findMany({
      where: { ownerId },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      take: 30,
      select: { id: true, kind: true, youtubePlaylistId: true, youtubeVideoId: true, startSeconds: true, title: true, position: true, createdAt: true },
    }),
  ]);

  const sources: PersonalSource[] = entries.map((entry) => {
    const content = [entry.normalizedContent, entry.transcript, entry.originalContent].filter((part, index, all): part is string => Boolean(part) && all.indexOf(part) === index).join('\n');
    const score = matchScore(`${entry.title} ${content}`, terms) + matchScore(entry.title, terms) * 2;
    return { id: entry.id, type: 'DIARY_ENTRY' as const, title: entry.title, date: entry.entryDate, content: excerpt(content, terms, 3600), href: `/my-diary?entry=${encodeURIComponent(entry.id)}`, score };
  }).filter((source) => !terms.length || source.score > 0);

  if (wishes) {
    const score = matchScore(`${wishes.title} ${wishes.content}`, terms) + matchScore(wishes.title, terms) * 2;
    if (!terms.length || score > 0) sources.push({ id: wishes.id, type: 'LETTER_OF_WISHES', title: wishes.title, date: wishes.updatedAt, content: excerpt(wishes.content, terms, 3600), href: '/letter-of-wishes', score });
  }

  for (const file of files) {
    const score = matchScore(`${file.name} ${file.mime}`, terms) + (fileIntent ? 1 : 0);
    if (score > 0) sources.push({ id: file.id, type: 'FILE_METADATA', title: file.name, date: file.createdAt, content: `File metadata only: ${file.name} (${file.mime}). The document contents are held in the user's Google Drive and are not available to this assistant. Do not infer or summarize the file contents.`, href: '/files', score });
  }

  for (const playlist of playlists) {
    const isVideo = playlist.kind === 'video' || Boolean(playlist.youtubeVideoId);
    const score = matchScore(`${playlist.title} ${playlist.kind}`, terms) + (playlistIntent ? 1 : 0);
    if (!playlistIntent && score <= 0) continue;
    if (playlistIntent || score > 0) {
      const reference = isVideo
        ? `Saved YouTube video${playlist.youtubeVideoId ? ` (video ID: ${playlist.youtubeVideoId})` : ''}${playlist.startSeconds ? ` starting at ${playlist.startSeconds} seconds` : ''}.`
        : `Saved YouTube playlist${playlist.youtubePlaylistId ? ` (playlist ID: ${playlist.youtubePlaylistId})` : ''}. The playlist's individual songs and metadata are not stored in MemoSphere.`;
      const href = `/files?playlist=${encodeURIComponent(playlist.id)}`;
      sources.push({
        id: playlist.id,
        type: 'PLAYLIST',
        title: playlist.title,
        date: playlist.createdAt,
        content: `${reference} Saved title: ${playlist.title}. Kind: ${isVideo ? 'video' : 'playlist'}. Position in the saved list: ${playlist.position + 1}. Created: ${playlist.createdAt.toISOString()}. MemoSphere stores no description, category, artist, album, or update date for this item. A title may be descriptive but does not establish unrecorded song or artist metadata.`,
        href,
        score,
      });
    }
  }

  return sources.sort((a, b) => b.score - a.score || b.date.getTime() - a.date.getTime()).slice(0, playlistIntent ? 38 : 8);
}

