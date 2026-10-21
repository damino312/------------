import { describe, expect, it } from 'vitest';
import { ParallelPoolService } from './parallel-pool.service.js';

describe('ParallelPoolService (SharedArrayBuffer)', () => {
  it('completes all tasks via shared memory counters', async () => {
    const service = new ParallelPoolService();
    const result = await service.runPool(500, 2);

    expect(result.completed).toBe(500);
    expect(result.completedViaSharedMemory).toBe(500);
    expect(result.workerCount).toBe(2);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
