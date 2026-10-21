import { Injectable } from '@nestjs/common';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { resolveWorkerScript } from '../common/workers/resolve-worker-script.js';

export interface ParallelPoolResult {
  taskCount: number;
  workerCount: number;
  completed: number;
  durationMs: number;
  /** Значение из SharedArrayBuffer — main читает без postMessage payload */
  completedViaSharedMemory: number;
}

@Injectable()
export class ParallelPoolService {
  /**
   * Несколько worker_threads делят очередь задач через SharedArrayBuffer (вариант 3).
   */
  async runPool(taskCount: number, workerCount?: number): Promise<ParallelPoolResult> {
    const poolSize = workerCount ?? Math.min(4, os.cpus().length);
    if (!Number.isInteger(taskCount) || taskCount < 1 || taskCount > 1_000_000) {
      throw new Error('taskCount must be 1..1000000');
    }
    if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > 16) {
      throw new Error('workerCount must be 1..16');
    }

    const shared = new SharedArrayBuffer(8);
    const slots = new Int32Array(shared);
    slots[0] = 0;
    slots[1] = 0;

    const started = performance.now();
    const workers: Worker[] = [];

    await new Promise<void>((resolve, reject) => {
      let alive = poolSize;

      for (let i = 0; i < poolSize; i++) {
        const worker = new Worker(
          resolveWorkerScript(import.meta.url, 'parallel-pool.worker.js'),
          { workerData: { shared, taskCount } },
        );
        workers.push(worker);

        worker.once('error', reject);
        worker.once('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`pool worker exited with code ${code}`));
            return;
          }
          alive -= 1;
          if (alive === 0) {
            resolve();
          }
        });
      }
    });

    const durationMs = Math.round(performance.now() - started);

    for (const w of workers) {
      w.unref();
    }

    return {
      taskCount,
      workerCount: poolSize,
      completed: slots[1]!,
      completedViaSharedMemory: Atomics.load(slots, 1),
      durationMs,
    };
  }
}
