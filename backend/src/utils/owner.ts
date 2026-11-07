import { prisma } from '../config/prisma.js';
import { AccessDenied } from '../exceptions/index.js';

export async function getOwnerForUser(userId: string) {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) throw new AccessDenied('The authenticated account has no owner profile.');
  return owner;
}