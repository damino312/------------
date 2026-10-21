import { parentPort, workerData } from 'node:worker_threads';
import { countPrimesUpTo } from './prime.util.js';

interface WorkerInput {
  limit: number;
}

interface WorkerOutput {
  limit: number;
  primeCount: number;
}

const { limit } = workerData as WorkerInput;
const primeCount = countPrimesUpTo(limit);

const result: WorkerOutput = { limit, primeCount };
parentPort?.postMessage(result);
