import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { runCleanup, type Claim } from "./worker.ts";

Deno.serve(async (request) => {
  const expected = Deno.env.get("CLEANUP_WORKER_SECRET");
  if (!expected || request.headers.get("x-cleanup-secret") !== expected)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key =
      JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key)
      return Response.json(
        { error: "server configuration required" },
        { status: 503 },
      );
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const rpc = async <T>(
      name: string,
      args: Record<string, unknown>,
    ): Promise<T> => {
      const result = await client.rpc(name, args);
      if (result.error) throw new Error("queue request failed");
      return result.data as T;
    };
    const summary = await runCleanup(
      {
        claim: () =>
          rpc<Claim | null>("claim_media_cleanup_job", {
            p_lease_seconds: 120,
            p_max_attempts: 5,
          }),
        complete: (claim) =>
          rpc<boolean>("complete_media_cleanup_job", {
            p_id: claim.id,
            p_claim_token: claim.claimToken,
          }),
        retry: (claim, reason, delay) =>
          rpc<boolean>("retry_media_cleanup_job", {
            p_id: claim.id,
            p_claim_token: claim.claimToken,
            p_error: reason,
            p_delay_seconds: delay,
            p_max_attempts: 5,
          }),
        enqueueExpired: async (before) => {
          await rpc("enqueue_expired_media", { p_before: before });
        },
        purgeCompleted: async (before) => {
          await rpc("purge_completed_media_cleanup_jobs", { p_before: before });
        },
      },
      async (claim, signal) => {
        // Use a per-request client so AbortSignal reaches the actual Storage HTTP request.
        const storage = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { fetch: (input, init) => fetch(input, { ...init, signal }) },
        });
        const result = await storage.storage
          .from(claim.bucket)
          .remove([claim.objectPath]);
        if (result.error && String(result.error.statusCode) !== "404")
          throw new Error("storage removal failed");
      },
    );
    return Response.json(summary);
  } catch {
    return Response.json({ error: "cleanup failed" }, { status: 503 });
  }
});
