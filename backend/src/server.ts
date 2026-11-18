import 'dotenv/config';
import { environment } from './config/environment.js';
import { app } from './app.js';
import { runLegacyReleaseJobs } from './modules/legacy/legacy.routes.js';

if (!environment.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured before starting the backend.');
}

const port = environment.BACKEND_PORT;

app.listen(port, () => {
  console.log(`MemoSphere backend listening on port ${port}`);
  const runJobs = () => { void runLegacyReleaseJobs().catch(() => console.error('Legacy release worker failed.')); };
  runJobs();
  const timer = setInterval(runJobs, 60_000);
  timer.unref();
});
