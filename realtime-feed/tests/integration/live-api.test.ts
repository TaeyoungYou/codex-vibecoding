import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const enabled =
  !!url && !!key && process.env.SUPABASE_TEST_PROJECT_CONFIRMED === "yes";
const ids: string[] = [];
let owner: SupabaseClient, other: SupabaseClient;
describe.skipIf(!enabled)("live dedicated Supabase API (opt-in)", () => {
  beforeAll(async () => {
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    owner = createClient(url!, key!, options);
    other = createClient(url!, key!, options);
    for (const client of [owner, other]) {
      expect((await client.auth.signInAnonymously()).error).toBeNull();
      expect(
        (
          await client.rpc("set_nickname", {
            p_nickname: "검증" + randomUUID().slice(0, 6),
          })
        ).error,
      ).toBeNull();
    }
  });
  afterAll(async () => {
    for (const id of ids) {
      const current = await owner.rpc("read_entry", { p_id: id });
      if (current.data)
        await owner.rpc("delete_entry", {
          p_id: id,
          p_expected_version: current.data.version,
        });
    }
    await owner?.auth.signOut();
    await other?.auth.signOut();
  });
  it("persists owner CRUD and rejects another anonymous user, direct writes and stale versions", async () => {
    const id = randomUUID();
    ids.push(id);
    const args = {
      p_id: id,
      p_expected_version: null,
      p_text: "integration-" + id,
      p_image_asset_ids: [],
      p_drawing: null,
    };
    const created = await owner.rpc("save_entry", args);
    expect(created.error).toBeNull();
    expect(created.data).toMatchObject({ id, version: 1 });
    expect(
      (
        await other.rpc("save_entry", {
          ...args,
          p_expected_version: 1,
          p_text: "denied",
        })
      ).error,
    ).not.toBeNull();
    expect(
      (await other.from("entries").update({ body: "denied" }).eq("id", id))
        .error,
    ).not.toBeNull();
    expect(
      (await other.rpc("read_entry_for_edit", { p_id: id })).error,
    ).not.toBeNull();
    const updated = await owner.rpc("save_entry", {
      ...args,
      p_expected_version: 1,
      p_text: "updated-" + id,
    });
    expect(updated.error).toBeNull();
    expect(updated.data).toMatchObject({ version: 2 });
    expect(
      (await owner.rpc("save_entry", { ...args, p_expected_version: 1 })).error,
    ).not.toBeNull();
    expect((await owner.rpc("read_entry", { p_id: id })).data).toMatchObject({
      version: 2,
      text: "updated-" + id,
    });
    expect(
      (await owner.rpc("delete_entry", { p_id: id, p_expected_version: 2 }))
        .error,
    ).toBeNull();
    expect((await other.rpc("read_entry", { p_id: id })).data).toBeNull();
  });
});
