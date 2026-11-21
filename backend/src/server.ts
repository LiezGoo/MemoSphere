import { environment } from './config/environment.js';
import { app } from './app.js';
import { runLegacyReleaseJobs } from './modules/legacy/legacy.routes.js';
import { validateMailConfiguration } from './modules/legacy/legacy-mailer.js';
import { Prisma } from '@prisma/client';
import { prisma } from './config/prisma.js';

if (!environment.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured before starting the backend.');
}
validateMailConfiguration();

const port = environment.PORT ?? environment.BACKEND_PORT;

async function logMissingTables() {
  try {
    const expected = Prisma.dmmf.datamodel.models.map((model) => model.dbName ?? model.name);
    const present = await prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE()`;
    const names = new Set(present.map((table) => table.TABLE_NAME));
    const missing = expected.filter((table) => !names.has(table));
    if (missing.length) console.error(JSON.stringify({ level: 'error', event: 'database_schema_missing_tables', tables: missing }));
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'database_schema_check_failed', errorName: error instanceof Error ? error.name : typeof error }));
  }
}

app.listen(port, () => {
  console.log(`MemoSphere backend listening on port ${port}`);
  void logMissingTables();
  const runJobs = () => { void runLegacyReleaseJobs().catch(() => console.error('Legacy release worker failed.')); };
  runJobs();
  const timer = setInterval(runJobs, 60_000);
  timer.unref();
});
