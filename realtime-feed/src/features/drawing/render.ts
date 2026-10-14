import type { MediaAsset, StrokeDocument } from "@/domain/guestbook";
import { serializeDrawing } from "./document";

export function renderDrawing(
  ctx: CanvasRenderingContext2D,
  document: StrokeDocument,
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of document.strokes) {
    ctx.strokeStyle = ctx.fillStyle =
      stroke.tool === "eraser" ? "#FFFFFF" : stroke.color;
    ctx.lineWidth = (stroke.widthPx * width) / 900;
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      stroke.points.forEach((p, i) =>
        i === 0
          ? ctx.moveTo(p.x * width, p.y * height)
          : ctx.lineTo(p.x * width, p.y * height),
      );
      ctx.stroke();
    }
  }
}

export function drawingPreview(document: StrokeDocument): MediaAsset {
  serializeDrawing(document);
  const canvas = window.document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서 그림을 준비하지 못했어요.");
  renderDrawing(ctx, document);
  const url = canvas.toDataURL("image/webp", 0.85);
  if (!url.startsWith("data:image/webp;"))
    throw new Error("이 브라우저에서는 WebP 그림을 준비할 수 없어요.");
  const payload = url.split(",")[1] ?? "";
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  const bytes = (payload.length * 3) / 4 - padding;
  if (bytes > 1024 * 1024)
    throw new Error("그림 미리보기가 1 MiB를 넘었어요. 획을 줄여주세요.");
  return { id: crypto.randomUUID(), url, width: 900, height: 600, bytes };
}
