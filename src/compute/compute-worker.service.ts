import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

/** Worker script is emitted next to this file in dist/ after nest build. */
function workerScriptUrl(): URL {
  const besideModule = new URL('./compute.worker.js', import.meta.url);
  if (existsSync(besideModule)) {
    return besideModule;
  }

  const fromDist = join(process.cwd(), 'dist/compute/compute.worker.js');
  if (existsSync(fromDist)) {
    return pathToFileURL(fromDist);
  }

  throw new Error(
    'compute.worker.js not found. Run "yarn build" before using worker threads.',
  );
}

export interface WorkerPrimeResult {
  limit: number;
  primeCount: number;
  durationMs: number;
  thread: 'worker';
}

@Injectable()
export class ComputeWorkerService implements OnModuleDestroy {
  private readonly activeWorkers = new Set<Worker>();

  runPrimeCountInWorker(limit: number): Promise<WorkerPrimeResult> {
    const started = performance.now();

    return new Promise((resolve, reject) => {
      const worker = new Worker(workerScriptUrl(), {
        workerData: { limit },
      });
      this.activeWorkers.add(worker);

      const cleanup = () => {
        this.activeWorkers.delete(worker);
      };

      worker.once('message', (message: { limit: number; primeCount: number }) => {
        cleanup();
        resolve({
          limit: message.limit,
          primeCount: message.primeCount,
          durationMs: Math.round(performance.now() - started),
          thread: 'worker',
        });
      });

      worker.once('error', (error) => {
        cleanup();
        reject(error);
      });

      worker.once('exit', (code) => {
        if (code !== 0) {
          cleanup();
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  onModuleDestroy() {
    for (const worker of this.activeWorkers) {
      void worker.terminate();
    }
    this.activeWorkers.clear();
  }
}
