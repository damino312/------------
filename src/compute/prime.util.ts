/** Pure CPU work — safe to run in main thread or worker thread. */
export function countPrimesUpTo(limit: number): number {
  if (!Number.isInteger(limit) || limit < 2) {
    return 0;
  }

  const sieve = new Uint8Array(limit + 1);
  let count = 0;

  for (let n = 2; n <= limit; n++) {
    if (sieve[n] === 0) {
      count++;
      for (let m = n * n; m <= limit; m += n) {
        sieve[m] = 1;
      }
    }
  }

  return count;
}
