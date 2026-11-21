import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ diaryFindMany: vi.fn(), wishesFindUnique: vi.fn(), filesFindMany: vi.fn() }));
vi.mock('../../config/prisma.js', () => ({ prisma: {
  diaryEntry: { findMany: db.diaryFindMany },
  letterOfWishes: { findUnique: db.wishesFindUnique },
  userFile: { findMany: db.filesFindMany },
} }));

import { retrievePersonalSources } from './retrieval.service.js';

describe('personal source retrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.diaryFindMany.mockResolvedValue([{ id: 'entry-a', title: 'Graduation plans', entryDate: new Date('2026-01-01T00:00:00Z'), originalContent: 'I planned to celebrate graduation with my family.', normalizedContent: null, transcript: 'Voice note: call my family.' }]);
    db.wishesFindUnique.mockResolvedValue({ id: 'wishes-a', title: 'Letter of Wishes', content: 'Please share my graduation photos with my family.', updatedAt: new Date('2026-02-01T00:00:00Z') });
    db.filesFindMany.mockResolvedValue([{ id: 'file-a', name: 'Graduation research.pdf', mime: 'application/pdf', createdAt: new Date('2026-03-01T00:00:00Z') }]);
  });

  it('retrieves diary text, voice transcripts, wishes, and file metadata only for the owner', async () => {
    const sources = await retrievePersonalSources('owner-a', 'What did I save about graduation?');
    expect(sources.map((source) => source.type)).toEqual(expect.arrayContaining(['DIARY_ENTRY', 'LETTER_OF_WISHES', 'FILE_METADATA']));
    expect(sources.find((source) => source.type === 'DIARY_ENTRY')?.content).toContain('Voice note: call my family.');
    expect(sources.find((source) => source.type === 'FILE_METADATA')?.content).toContain('contents are held');
    expect(db.diaryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner-a', status: { not: 'DELETED' } }) }));
    expect(db.wishesFindUnique).toHaveBeenCalledWith({ where: { ownerId: 'owner-a' }, select: expect.any(Object) });
    expect(db.filesFindMany).toHaveBeenCalledWith({ where: { ownerId: 'owner-a' }, select: expect.any(Object) });
  });

  it('does not return unmatched letters or file metadata for unrelated questions', async () => {
    db.wishesFindUnique.mockResolvedValue({ id: 'wishes-a', title: 'Letter of Wishes', content: 'Please call my brother.', updatedAt: new Date() });
    db.filesFindMany.mockResolvedValue([{ id: 'file-a', name: 'Research.pdf', mime: 'application/pdf', createdAt: new Date() }]);
    expect(await retrievePersonalSources('owner-b', 'What was the weather in Madrid?')).toEqual([]);
    expect(db.diaryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner-b' }) }));
  });
});
