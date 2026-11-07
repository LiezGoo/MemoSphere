import { prisma } from '../config/prisma.js';
import type { AccessResult, Prisma, PrismaClient } from '@prisma/client';

type AuditDatabase = PrismaClient | Prisma.TransactionClient;

export async function recordAudit(input: { ownerId: string; actorUserId?: string; action: string; resourceType: string; resourceId?: string; result: AccessResult; metadata?: object }, database: AuditDatabase = prisma) {
  await database.accessAuditLog.create({ data: { ...input, metadata: input.metadata as never } });
}