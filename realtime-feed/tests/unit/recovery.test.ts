import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  matchesSavedEntry,
  createEntriesApi,
} from "../../src/features/entries/api";
import {
  mergeEntries,
  boundReadWindow,
} from "../../src/features/realtime/useGuestbookFeed";
import {
  emptyDraft,
  type EditEntry,
  type SaveEntryInput,
} from "../../src/domain/guestbook";
const entry: EditEntry = {
  ...emptyDraft(),
  id: "entry",
  authorId: "owner",
  nickname: "작성자",
  version: 2,
  createdAt: "2026-10-12T00:00:00Z",
  updatedAt: "2026-10-12T01:00:00Z",
  text: "서버 확정 내용",
};
const input: SaveEntryInput = {
  id: entry.id,
  expectedVersion: 1,
  text: entry.text,
  imageAssetIds: [],
  drawing: null,
};
it("confirms a lost response only when owner, version and every saved component match", () => {
  expect(matchesSavedEntry(entry, input, "owner")).toBe(true);
  expect(
    matchesSavedEntry({ ...entry, authorId: "other" }, input, "owner"),
  ).toBe(false);
  expect(matchesSavedEntry({ ...entry, version: 3 }, input, "owner")).toBe(
    false,
  );
  expect(
    matchesSavedEntry({ ...entry, text: "다른 내용" }, input, "owner"),
  ).toBe(false);
  expect(
    matchesSavedEntry(
      {
        ...entry,
        images: [{ id: "new-image", url: "", width: 1, height: 1, bytes: 1 }],
      },
      input,
      "owner",
    ),
  ).toBe(false);
});
it("does not replace a newer card with a late snapshot and removes absent cards", () => {
  expect(
    mergeEntries([entry], [{ ...entry, version: 1, text: "이전" }]),
  ).toEqual([entry]);
  expect(mergeEntries([entry], [])).toEqual([]);
});

it("keeps PostgreSQL microsecond order before comparing UUIDs", () => {
  const first = {
    ...entry,
    id: "z",
    createdAt: "2026-10-12T00:00:00.000100+00:00",
  };
  const second = {
    ...entry,
    id: "a",
    createdAt: "2026-10-12T00:00:00.000200+00:00",
  };
  expect(mergeEntries([], [first, second]).map((e) => e.id)).toEqual([
    "a",
    "z",
  ]);
});

it("keeps the read boundary when a realtime insert pushes it into a later page", () => {
  const rows = Array.from({ length: 40 }, (_, index) => ({
    ...entry,
    id: String(index),
    createdAt: new Date(
      Date.parse(entry.createdAt) - index * 1000,
    ).toISOString(),
  }));
  const newest = { ...entry, id: "new", createdAt: "2026-10-12T00:01:00Z" };
  const bounded = boundReadWindow([newest, ...rows], rows[19], rows[39]);
  expect(bounded.entries).toHaveLength(21);
  expect(
    bounded.entries.filter(
      (e) => !rows.slice(0, 20).some((old) => old.id === e.id),
    ),
  ).toEqual([newest]);
  expect(bounded.nextCursor).toEqual(rows[19]);
  const deletedBoundary = boundReadWindow(
    rows.filter((e) => e.id !== "19"),
    rows[19],
    rows[39],
  );
  expect(deletedBoundary.entries).toHaveLength(19);
  expect(deletedBoundary.nextCursor).toEqual(rows[18]);
});

it("retries an uncommitted failed edit after confirming the server is still at the expected version", async () => {
  let writes = 0;
  const current = {
    ...entry,
    version: 1,
    text: "앞선 내용",
    strokesJson: null,
  };
  const rpc = vi.fn(async (name: string) => {
    if (name === "save_entry") {
      if (++writes === 1) throw new TypeError("network");
      return { data: { ...entry, strokesJson: null }, error: null };
    }
    return { data: current, error: null };
  });
  const api = createEntriesApi({ rpc } as unknown as SupabaseClient);
  const draft = { ...emptyDraft(), text: entry.text };
  expect((await api.saveDraft(entry.id, 1, draft, "owner")).ok).toBe(false);
  expect((await api.saveDraft(entry.id, 1, draft, "owner")).ok).toBe(true);
  expect(writes).toBe(2);
});
it("confirms a committed edit after a lost response without sending a second write", async () => {
  let writes = 0;
  const rpc = vi.fn(async (name: string) => {
    if (name === "save_entry") {
      writes++;
      throw new TypeError("network");
    }
    return { data: { ...entry, strokesJson: null }, error: null };
  });
  const api = createEntriesApi({ rpc } as unknown as SupabaseClient);
  expect(
    (
      await api.saveDraft(
        entry.id,
        1,
        { ...emptyDraft(), text: entry.text },
        "owner",
      )
    ).ok,
  ).toBe(true);
  expect(writes).toBe(1);
});
