import { environment } from '../src/config/environment.js';
import { validateMailConfiguration } from '../src/modules/legacy/legacy-mailer.js';

const requiredVariables = ['DATABASE_URL'];
const missingVariables = requiredVariables.filter((name) => !environment[name as keyof typeof environment]);

if (missingVariables.length > 0) {
  console.error(`Missing required environment variables: ${missingVariables.join(', ')}`);
  process.exitCode = 1;
} else {
  try {
    validateMailConfiguration(environment);
    console.log('Environment check passed.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Mail provider configuration is invalid.');
    process.exitCode = 1;
  }
}
