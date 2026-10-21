import { BadRequestException, Injectable } from '@nestjs/common';
import { countPrimesUpTo } from './prime.util.js';
import { ComputeWorkerService } from './compute-worker.service.js';

export interface MainThreadPrimeResult {
  limit: number;
  primeCount: number;
  durationMs: number;
  thread: 'main';
}

const MAX_LIMIT = 5_000_000;

@Injectable()
export class ComputeService {
  constructor(private readonly computeWorker: ComputeWorkerService) {}

  parseLimit(raw: string | undefined): number {
    const limit = Number(raw);
    if (!Number.isInteger(limit) || limit < 2 || limit > MAX_LIMIT) {
      throw new BadRequestException(
        `Query "limit" must be an integer from 2 to ${MAX_LIMIT}`,
      );
    }
    return limit;
  }

  runPrimeCountOnMainThread(limit: number): MainThreadPrimeResult {
    const started = performance.now();
    const primeCount = countPrimesUpTo(limit);
    return {
      limit,
      primeCount,
      durationMs: Math.round(performance.now() - started),
      thread: 'main',
    };
  }

  runPrimeCountInWorker(limit: number) {
    return this.computeWorker.runPrimeCountInWorker(limit);
  }
}
