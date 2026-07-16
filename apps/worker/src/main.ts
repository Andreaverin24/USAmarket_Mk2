import { loadConfig } from '@atlas/config';
import { createLogger } from '@atlas/observability';
import { startOutboxWorker } from './outbox-worker.js';

const config = loadConfig();
const logger = createLogger('worker');
const stop = startOutboxWorker(config);
logger.info('Atlas worker started');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => void stop().then(() => process.exit(0)));
