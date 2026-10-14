import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const enabled =
  !!url && !!key && process.env.SUPABASE_TEST_PROJECT_CONFIRMED === "yes";

describe.skipIf(!enabled)("live dedicated media boundaries", () => {
  it("rejects forged media, overwrites, another owner and visitor access to the worker queue", async () => {
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    const owner = createClient(url!, key!, options);
    const other = createClient(url!, key!, options);
    const publicReader = createClient(url!, key!, options);
    const records: string[] = [];
    try {
      for (const client of [owner, other]) {
        expect((await client.auth.signInAnonymously()).error).toBeNull();
        expect(
          (await client.rpc("set_nickname", { p_nickname: "권한검증" })).error,
        ).toBeNull();
      }
      expect((await publicReader.rpc("list_entries", {})).error).toBeNull();
      const entryId = randomUUID();
      const reservation = await owner.rpc("reserve_media_upload", {
        p_entry_id: entryId,
        p_kind: "image",
      });
      expect(reservation.error).toBeNull();
      const { assetId, objectPath } = reservation.data;
      records.push(assetId);
      const bytes = new TextEncoder().encode("not a real WebP image");
      const upload = (client: typeof owner, upsert = false) =>
        client.storage
          .from("guestbook-media")
          .upload(objectPath, bytes, { contentType: "image/webp", upsert });
      expect((await upload(other)).error).not.toBeNull();
      expect((await upload(owner)).error).toBeNull();
      expect((await upload(owner, true)).error).not.toBeNull();
      const removed = await owner.storage
        .from("guestbook-media")
        .remove([objectPath]);
      expect(!!removed.error || removed.data?.length === 0).toBe(true);
      const publicUrl = owner.storage
        .from("guestbook-media")
        .getPublicUrl(objectPath).data.publicUrl;
      expect((await fetch(publicUrl, { cache: "no-store" })).status).toBe(200);
      expect(
        (await owner.functions.invoke("verify-media", { body: { assetId } }))
          .error,
      ).not.toBeNull();
      expect(
        (await other.functions.invoke("verify-media", { body: { assetId } }))
          .error,
      ).not.toBeNull();
      expect(
        (
          await publicReader.functions.invoke("verify-media", {
            body: { assetId },
          })
        ).error,
      ).not.toBeNull();
      expect(
        (
          await owner.rpc("verify_media_upload", {
            p_asset_id: assetId,
            p_owner_id: randomUUID(),
            p_bytes: 20,
            p_width: 1,
            p_height: 1,
          })
        ).error,
      ).not.toBeNull();
      expect(
        (
          await owner.rpc("save_entry", {
            p_id: entryId,
            p_expected_version: null,
            p_text: "",
            p_image_asset_ids: [assetId],
            p_drawing: null,
          })
        ).error,
      ).not.toBeNull();
      expect(
        (await owner.rpc("read_entry", { p_id: entryId })).data,
      ).toBeNull();
      expect(
        (
          await owner.rpc("claim_media_cleanup_job", {
            p_lease_seconds: 120,
            p_max_attempts: 5,
          })
        ).error,
      ).not.toBeNull();
      expect(
        (
          await owner
            .schema("guestbook_private")
            .from("drawing_strokes")
            .select("*")
        ).error,
      ).not.toBeNull();
      expect(
        (await owner.schema("cron").from("job").select("*")).error,
      ).not.toBeNull();
    } finally {
      // No user DELETE permission: expire only these reserved test assets through
      // an admin verification step, then let the normal cleanup worker remove them.
      mkdirSync("supabase/.temp", { recursive: true });
      writeFileSync(
        "supabase/.temp/live-media-verification.json",
        JSON.stringify(records),
      );
      await owner.auth.signOut();
      await other.auth.signOut();
    }
  }, 45000);
});
