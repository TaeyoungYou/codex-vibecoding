import { expect, it, vi } from "vitest";
import {
  runCleanup,
  type Claim,
  type CleanupQueue,
} from "../../supabase/functions/media-cleanup/worker";
const claim: Claim = {
  id: "job",
  bucket: "bucket",
  objectPath: "path",
  claimToken: "token",
  attempts: 1,
};
function port(value: Claim | null): CleanupQueue {
  return {
    claim: vi.fn().mockResolvedValueOnce(value).mockResolvedValue(null),
    complete: vi.fn().mockResolvedValue(true),
    retry: vi.fn().mockResolvedValue(true),
    enqueueExpired: vi.fn().mockResolvedValue(undefined),
    purgeCompleted: vi.fn().mockResolvedValue(undefined),
  };
}
it("exits without deleting on an empty queue", async () => {
  const remove = vi.fn();
  expect((await runCleanup(port(null), remove)).processed).toBe(0);
  expect(remove).not.toHaveBeenCalled();
});
it("retries deletion failures without marking success", async () => {
  const queue = port(claim);
  const result = await runCleanup(queue, async () => {
    throw new Error("failure");
  });
  expect(result).toMatchObject({ succeeded: 0, retried: 1 });
  expect(queue.retry).toHaveBeenCalledWith(claim, expect.any(String), 60);
});
it("does not count a stale completion token as successful", async () => {
  const queue = port(claim);
  vi.mocked(queue.complete).mockResolvedValue(false);
  expect((await runCleanup(queue, async () => {})).succeeded).toBe(0);
});
