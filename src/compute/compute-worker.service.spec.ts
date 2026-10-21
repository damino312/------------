import { describe, expect, it } from 'vitest';
import { ComputeWorkerService } from './compute-worker.service.js';

describe('ComputeWorkerService', () => {
  it('runs prime count in a worker thread', async () => {
    const service = new ComputeWorkerService();
    const result = await service.runPrimeCountInWorker(10_000);
    expect(result.primeCount).toBe(1229);
    expect(result.limit).toBe(10_000);
    expect(result.thread).toBe('worker');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    service.onModuleDestroy();
  });
});
