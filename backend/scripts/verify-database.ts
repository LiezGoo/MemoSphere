import '../src/config/environment.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const name = `verification-${Date.now()}`;
  const created = await prisma.tag.create({ data: { name } });
  const read = await prisma.tag.findUniqueOrThrow({ where: { id: created.id } });
  const updated = await prisma.tag.update({ where: { id: created.id }, data: { name: `${name}-updated` } });
  await prisma.tag.delete({ where: { id: updated.id } });
  const deleted = await prisma.tag.findUnique({ where: { id: created.id } });

  if (read.name !== name || updated.name !== `${name}-updated` || deleted !== null) {
    throw new Error('Database CRUD verification failed.');
  }
  console.log('Database CRUD verification passed without changing seeded records.');
}

main().catch((error) => {
  console.error('Database CRUD verification failed.', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});