import 'dotenv/config';
import { environment } from './config/environment.js';
import { app } from './app.js';

if (!environment.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured before starting the backend.');
}

const port = environment.BACKEND_PORT;

app.listen(port, () => {
  console.log(`Alaala backend listening on port ${port}`);
});