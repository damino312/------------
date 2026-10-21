import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Worker .js must sit beside the compiled service in dist/ (nest build).
 * Vitest imports from src/ — fallback maps .../src/<dir>/ → .../dist/<dir>/.
 */
export function resolveWorkerScript(
  importMetaUrl: string,
  workerFileName: string,
): URL {
  const besideCaller = new URL(`./${workerFileName}`, importMetaUrl);
  if (existsSync(besideCaller)) {
    return besideCaller;
  }

  const callerDir = dirname(fileURLToPath(importMetaUrl));
  const distDirectory = callerDir.replace(/[/\\]src[/\\]/, (match) =>
    match.includes('/') ? '/dist/' : '\\dist\\',
  );
  const workerPath = join(distDirectory, workerFileName);

  if (existsSync(workerPath)) {
    return pathToFileURL(workerPath);
  }

  throw new Error(
    `Worker "${workerFileName}" not found at ${workerPath}. Run "yarn build" first.`,
  );
}
