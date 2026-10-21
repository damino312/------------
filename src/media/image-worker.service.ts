import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import { resolveWorkerScript } from '../common/workers/resolve-worker-script.js';
import type {
  ImageThumbnailWorkerInput,
  ImageThumbnailWorkerOutput,
} from './image-thumbnail.worker.js';

export interface ThumbnailResult extends ImageThumbnailWorkerOutput {
  durationMs: number;
  thread: 'worker';
}

@Injectable()
export class ImageWorkerService implements OnModuleDestroy {
  private readonly activeWorkers = new Set<Worker>();

  createThumbnail(
    image: Buffer,
    maxWidth: number,
    quality: number,
  ): Promise<ThumbnailResult> {
    const started = performance.now();
    const workerData: ImageThumbnailWorkerInput = { image, maxWidth, quality };

    return new Promise((resolve, reject) => {
      const worker = new Worker(
        resolveWorkerScript(import.meta.url, 'image-thumbnail.worker.js'),
        { workerData },
      );
      this.activeWorkers.add(worker);

      const cleanup = () => {
        this.activeWorkers.delete(worker);
      };

      worker.once('message', (message: ImageThumbnailWorkerOutput) => {
        cleanup();
        resolve({
          ...message,
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
          reject(new Error(`Image worker exited with code ${code}`));
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
