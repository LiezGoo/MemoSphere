import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';

const backendConfigDirectory = dirname(__filename);
const projectRoot = resolve(backendConfigDirectory, '../../..');

/** Load local files by project location, not npm's current working directory. */
export function loadEnvironmentFiles() {
  config({ path: resolve(projectRoot, '.env'), override: false });
  config({ path: resolve(projectRoot, '.env.local'), override: false });
  config({ path: resolve(projectRoot, 'backend', '.env'), override: false });
}
