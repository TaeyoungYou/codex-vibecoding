import type { MediaAsset } from "@/domain/guestbook";
import { MiB } from "@/domain/validation";

export async function prepareImage(file: File): Promise<MediaAsset> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("JPEG, PNG, WebP 이미지를 선택해주세요.");
  if (file.size > 15 * MiB)
    throw new Error("원본 이미지는 15 MiB 이하로 선택해주세요.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("이미지를 읽지 못했어요. 다른 파일을 선택해주세요.");
  }
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이 브라우저에서 이미지를 준비하지 못했어요.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.88, 0.75, 0.6, 0.45, 0.3, 0.15]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.type === "image/webp" && blob.size <= MiB) {
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error("이미지를 준비하지 못했어요. 다시 시도해주세요."));
          reader.readAsDataURL(blob);
        });
        return {
          id: crypto.randomUUID(),
          url,
          width: canvas.width,
          height: canvas.height,
          bytes: blob.size,
          name: file.name,
        };
      }
    }
    throw new Error(
      "이미지를 1 MiB 이하로 줄이지 못했어요. 더 작은 이미지를 선택해주세요.",
    );
  } finally {
    bitmap.close();
  }
}
