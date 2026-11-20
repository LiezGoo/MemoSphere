import '../src/config/environment.js';
import { prisma } from '../src/config/prisma.js';
import { runLegacyJob } from '../src/modules/legacy/legacy-jobs.js';

async function main() {
  const policy = await prisma.legacyPolicy.findFirst({ where: { releaseMethod: 'scheduled_date', status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
  if (!policy) {
    console.log('No active scheduled policy found.');
    return;
  }
  await prisma.legacyPolicy.update({ where: { id: policy.id }, data: { releaseAt: new Date(Date.now() - 60_000) } });
  await runLegacyJob();
  console.log(`Simulated release for policy ${policy.id}.`);
  await prisma.$disconnect();
}

void main();
