import type { NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma.js';

type NotificationInput = { userId: string; type: NotificationType; title: string; body: string; link?: string | null; dedupeKey?: string };

function cleanText(value: string, maxLength: number) {
  return value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isInternalPath(link: string) {
  if (!link.startsWith('/') || link.startsWith('//') || link.includes('\\')) return false;
  try { return new URL(link, 'https://memosphere.invalid').origin === 'https://memosphere.invalid'; } catch { return false; }
}

export async function createNotification(input: NotificationInput) {
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { notificationPreferences: true } });
  if (!user) return null;
  const preferences = user.notificationPreferences as Record<string, unknown> | null;
  if (input.type !== 'SECURITY' && preferences?.[input.type.toLowerCase()] === false) return null;
  const title = cleanText(input.title, 160);
  const body = cleanText(input.body, 500);
  const link = input.link && isInternalPath(input.link) ? input.link : null;
  if (!title || !body) return null;
  try {
    return await prisma.notification.create({ data: { userId: input.userId, type: input.type, title, body, link, ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}) } });
  } catch (error) {
    if (input.dedupeKey && typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return null;
    throw error;
  }
}

export async function ensureDailyReminder(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true, notificationPreferences: true } });
  const preferences = user?.notificationPreferences as Record<string, unknown> | null;
  if (!user || preferences?.reminder !== true) return;
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: user.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await createNotification({ userId, type: 'REMINDER', title: 'A moment for your diary', body: 'If it feels right, take a moment to save a thought from today.', link: '/my-diary', dedupeKey: `daily-reminder:${userId}:${localDate}` });
}
