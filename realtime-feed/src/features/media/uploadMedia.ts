import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaAsset } from "@/domain/guestbook";
import { apiError, failure, success, type Result } from "@/lib/errors";

export function createMediaUploader(client: SupabaseClient) {
  const prepared = new Map<
    string,
    {
      assetId: string;
      objectPath: string;
      bucket: string;
      complete?: MediaAsset;
    }
  >();
  return async (
    entryId: string,
    media: MediaAsset,
    kind: "image" | "drawing_preview",
  ): Promise<Result<MediaAsset>> => {
    if (!media.url.startsWith("data:")) return success(media);
    const key = `${entryId}:${media.id}`;
    try {
      if (!media.url.startsWith("data:image/webp;")) return failure("invalid");
      let reservation = prepared.get(key);
      if (reservation?.complete) return success(reservation.complete);
      const blob = await (await fetch(media.url)).blob();
      if (blob.size === 0 || blob.size > 1048576) return failure("invalid");
      if (!reservation) {
        const result = await client.rpc("reserve_media_upload", {
          p_entry_id: entryId,
          p_kind: kind,
        });
        if (result.error) return { ok: false, error: apiError(result.error) };
        const value = result.data;
        if (
          !value ||
          typeof value.assetId !== "string" ||
          typeof value.objectPath !== "string" ||
          value.bucket !== "guestbook-media"
        )
          return failure("server");
        reservation = value;
        prepared.set(key, reservation!);
      }
      const upload = await client.storage
        .from(reservation!.bucket)
        .upload(reservation!.objectPath, blob, {
          contentType: "image/webp",
          upsert: false,
        });
      if (upload.error && String(upload.error.statusCode) !== "409")
        return { ok: false, error: apiError(upload.error) };
      const verified = await client.functions.invoke("verify-media", {
        body: { assetId: reservation!.assetId },
      });
      if (verified.error)
        return failure(
          "server",
          "첨부 파일 확인에 실패했어요. 초안과 업로드한 파일은 재시도할 수 있어요.",
        );
      const value = verified.data;
      if (
        !value ||
        typeof value.width !== "number" ||
        typeof value.height !== "number" ||
        value.bytes !== blob.size
      )
        return failure("server");
      const result: MediaAsset = {
        id: reservation!.assetId,
        url: client.storage
          .from("guestbook-media")
          .getPublicUrl(reservation!.objectPath).data.publicUrl,
        width: value.width,
        height: value.height,
        bytes: value.bytes,
      };
      reservation!.complete = result;
      return success(result);
    } catch (error) {
      return { ok: false, error: apiError(error) };
    }
  };
}
