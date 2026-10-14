import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Draft,
  EditEntry,
  Entry,
  EntryCursor,
  EntryPage,
  SaveEntryInput,
} from "@/domain/guestbook";
import { apiError, failure, success, type Result } from "@/lib/errors";
import { parseEntry, parseEditEntry, parsePage } from "./contracts";
import { createMediaUploader } from "@/features/media/uploadMedia";
import { serializeDrawing } from "@/features/drawing/document";
import { draftError } from "@/domain/validation";

export function matchesSavedEntry(
  entry: EditEntry,
  input: SaveEntryInput,
  ownerId: string,
): boolean {
  return (
    entry.id === input.id &&
    entry.authorId === ownerId &&
    entry.version === (input.expectedVersion ?? 0) + 1 &&
    entry.text === input.text &&
    entry.images.map((i) => i.id).join(",") === input.imageAssetIds.join(",") &&
    (entry.drawing?.id ?? null) === (input.drawing?.previewAssetId ?? null) &&
    (entry.drawingDocument ? serializeDrawing(entry.drawingDocument) : null) ===
      (input.drawing?.strokesJson ?? null)
  );
}

export function createEntriesApi(client: SupabaseClient) {
  const upload = createMediaUploader(client);
  const uncertain = new Map<
    string,
    { input: SaveEntryInput; fingerprint: string }
  >();
  function hydrate(value: unknown): unknown {
    if (!value || typeof value !== "object") return value;
    const entry = value as Record<string, unknown>;
    const media = (raw: unknown) => {
      if (!raw || typeof raw !== "object") return raw;
      const m = raw as Record<string, unknown>;
      if (
        typeof m.url !== "string" ||
        !/^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\.webp$/i.test(m.url)
      )
        throw new Error("invalid media path");
      return {
        ...m,
        url: client.storage.from("guestbook-media").getPublicUrl(m.url).data
          .publicUrl,
      };
    };
    return {
      ...entry,
      images: Array.isArray(entry.images)
        ? entry.images.map(media)
        : entry.images,
      drawing: entry.drawing === null ? null : media(entry.drawing),
    };
  }
  async function rpc<T>(
    name: string,
    args: Record<string, unknown>,
    parse: (value: unknown) => T,
  ): Promise<Result<T>> {
    try {
      const result = await client.rpc(name, args);
      if (result.error) return { ok: false, error: apiError(result.error) };
      try {
        return success(parse(result.data));
      } catch {
        return failure("server");
      }
    } catch (error) {
      return { ok: false, error: apiError(error) };
    }
  }
  const api = {
    read(id: string): Promise<Result<Entry | null>> {
      return rpc("read_entry", { p_id: id }, (value) =>
        value === null ? null : parseEntry(hydrate(value)),
      );
    },
    forEdit(id: string): Promise<Result<EditEntry>> {
      return rpc("read_entry_for_edit", { p_id: id }, (value) =>
        parseEditEntry(hydrate(value)),
      );
    },
    list(cursor: EntryCursor | null): Promise<Result<EntryPage>> {
      return rpc(
        "list_entries",
        {
          p_before_created_at: cursor?.createdAt ?? null,
          p_before_id: cursor?.id ?? null,
        },
        (value) => {
          const page = value as { entries?: unknown[] };
          return parsePage({ ...page, entries: page?.entries?.map(hydrate) });
        },
      );
    },
    async saveDraft(
      id: string,
      expectedVersion: number | null,
      draft: Draft,
      ownerId: string,
    ): Promise<Result<Entry>> {
      const problem = draftError(draft);
      if (problem) return failure("invalid", problem);
      try {
        const previousRequest = uncertain.get(id);
        const pending = previousRequest?.input;
        if (pending) {
          const prior = await api.forEdit(id);
          if (prior.ok) {
            if (matchesSavedEntry(prior.value, pending, ownerId)) {
              uncertain.delete(id);
              // Keep a changed draft open rather than treating an older request as its save.
              const intended =
                JSON.stringify(draft) === previousRequest!.fingerprint;
              if (!intended)
                return failure(
                  "conflict",
                  "앞선 요청이 저장된 것을 확인했어요. 현재 초안은 유지했어요. 최신 내용을 확인해주세요.",
                );
              return success(prior.value);
            }
            if (
              prior.value.authorId !== ownerId ||
              prior.value.version !== pending.expectedVersion ||
              expectedVersion !== pending.expectedVersion
            )
              return failure("conflict");
          }
          const current = await api.read(id);
          if (!current.ok)
            return failure(
              "network",
              "저장 결과를 확인하지 못했어요. 초안을 유지하며 다시 확인해주세요.",
            );
          if (current.value && current.value.version !== expectedVersion)
            return failure("conflict");
          uncertain.delete(id);
        }
        const strokesJson = draft.drawingDocument
          ? serializeDrawing(draft.drawingDocument)
          : null;
        if (!!draft.drawing !== !!strokesJson) return failure("invalid");
        const images = [];
        for (const image of draft.images) {
          const result = await upload(id, image, "image");
          if (!result.ok) return result;
          images.push(result.value);
        }
        const drawing = draft.drawing
          ? await upload(id, draft.drawing, "drawing_preview")
          : null;
        if (drawing && !drawing.ok) return drawing;
        const input: SaveEntryInput = {
          id,
          expectedVersion,
          text: draft.text,
          imageAssetIds: images.map((m) => m.id),
          drawing:
            drawing?.ok && strokesJson
              ? { previewAssetId: drawing.value.id, strokesJson }
              : null,
        };
        uncertain.set(id, { input, fingerprint: JSON.stringify(draft) });
        const result = await rpc(
          "save_entry",
          {
            p_id: id,
            p_expected_version: expectedVersion,
            p_text: input.text,
            p_image_asset_ids: input.imageAssetIds,
            p_drawing: input.drawing,
          },
          (value) => parseEntry(hydrate(value)),
        );
        if (result.ok) {
          uncertain.delete(id);
          return result;
        }
        if (
          ["invalid", "not_authenticated", "forbidden"].includes(
            result.error.code,
          )
        ) {
          uncertain.delete(id);
          return result;
        }
        const confirmed = await api.forEdit(id);
        if (
          confirmed.ok &&
          matchesSavedEntry(confirmed.value, input, ownerId)
        ) {
          uncertain.delete(id);
          return success(confirmed.value);
        }
        return result.error.code === "conflict"
          ? result
          : failure(
              "network",
              "저장 결과를 확인하지 못했어요. 초안을 유지하며 다시 확인해주세요.",
            );
      } catch (error) {
        return { ok: false, error: apiError(error) };
      }
    },
    async delete(id: string, version: number): Promise<Result<void>> {
      const result = await rpc(
        "delete_entry",
        { p_id: id, p_expected_version: version },
        () => undefined,
      );
      if (
        result.ok ||
        result.error.code === "forbidden" ||
        result.error.code === "not_authenticated"
      )
        return result;
      const confirmed = await api.read(id);
      if (confirmed.ok && !confirmed.value) return success(undefined);
      return result;
    },
  };
  return api;
}
