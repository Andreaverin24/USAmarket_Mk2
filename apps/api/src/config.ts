import { loadConfig, type AppConfig } from '@atlas/config';

let cached: AppConfig | undefined;
export function appConfig() {
  cached ??= loadConfig();
  return cached;
}
