import { it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createIdentityApi } from "../../src/features/auth/api";

it("retries a failed profile write using the same anonymous account", async () => {
  let session: object | null = null;
  const signInAnonymously = vi.fn(async () => {
    session = { user: { id: "owner" } };
    return { data: session, error: null };
  });
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({ error: { code: "500" } })
    .mockResolvedValueOnce({
      data: { id: "owner", nickname: "테스트" },
      error: null,
    });
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: { id: "owner" } }, error: null }),
      signInAnonymously,
    },
    rpc,
  } as unknown as SupabaseClient;
  const api = createIdentityApi(client);
  expect((await api.begin("테스트")).ok).toBe(false);
  expect(await api.begin("테스트")).toEqual({
    ok: true,
    value: { id: "owner", nickname: "테스트" },
  });
  expect(signInAnonymously).toHaveBeenCalledTimes(1);
});
it("does not create an account while restoring a missing or invalid session", async () => {
  const signInAnonymously = vi.fn();
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously,
    },
  } as unknown as SupabaseClient;
  expect(await createIdentityApi(client).restore()).toEqual({
    ok: true,
    value: null,
  });
  expect(signInAnonymously).not.toHaveBeenCalled();
});
