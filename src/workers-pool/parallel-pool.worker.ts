import { workerData } from 'node:worker_threads';

interface PoolWorkerData {
  shared: SharedArrayBuffer;
  taskCount: number;
}

/** shared layout: Int32Array — [0] next index to claim, [1] completed tasks */
const INDEX_NEXT = 0;
const INDEX_DONE = 1;

const { shared, taskCount } = workerData as PoolWorkerData;
const slots = new Int32Array(shared);

while (true) {
  const taskId = Atomics.add(slots, INDEX_NEXT, 1);
  if (taskId >= taskCount) {
    break;
  }

  // имитация CPU-работы (в проде: hash chunk, parse line, etc.)
  let acc = 0;
  for (let i = 0; i < 50_000; i++) {
    acc += i ^ taskId;
  }
  if (acc === Number.NaN) {
    throw new Error('unreachable');
  }

  Atomics.add(slots, INDEX_DONE, 1);
}
