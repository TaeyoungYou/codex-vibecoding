export interface Claim {
  id: string;
  bucket: string;
  objectPath: string;
  claimToken: string;
  attempts: number;
}
export interface CleanupQueue {
  claim(): Promise<Claim | null>;
  complete(claim: Claim): Promise<boolean>;
  retry(claim: Claim, reason: string, delay: number): Promise<boolean>;
  enqueueExpired(before: string): Promise<void>;
  purgeCompleted(before: string): Promise<void>;
}
export async function runCleanup(
  queue: CleanupQueue,
  remove: (claim: Claim, signal: AbortSignal) => Promise<void>,
  now = Date.now,
) {
  const started = now();
  const summary = { processed: 0, succeeded: 0, retried: 0, failed: 0 };
  await queue.enqueueExpired(new Date(started - 86400000).toISOString());
  await queue.purgeCompleted(new Date(started - 7 * 86400000).toISOString());
  while (summary.processed < 20 && now() - started < 20000) {
    const claim = await queue.claim();
    if (!claim) break;
    summary.processed++;
    try {
      const timeout = Math.max(1, Math.min(10000, 20000 - (now() - started)));
      await remove(claim, AbortSignal.timeout(timeout));
      if (await queue.complete(claim)) summary.succeeded++;
    } catch {
      const delay = [60, 300, 1800, 7200][Math.min(claim.attempts - 1, 3)];
      // Store a fixed reason: SDK errors can contain URLs or credentials.
      if (
        await queue.retry(claim, "storage removal or completion failed", delay)
      ) {
        if (claim.attempts >= 5) summary.failed++;
        else summary.retried++;
      }
    }
  }
  return summary;
}
