import { blankDrawing, type StrokeDocument } from "@/domain/guestbook";

export function parseDrawing(json: string): StrokeDocument {
  if (new TextEncoder().encode(json).byteLength > 512 * 1024)
    throw new Error("그림 데이터가 512 KiB를 넘었어요. 획을 줄여주세요.");
  const doc = JSON.parse(json) as StrokeDocument;
  if (
    !doc ||
    doc.formatVersion !== 1 ||
    doc.width !== 900 ||
    doc.height !== 600 ||
    !Array.isArray(doc.strokes)
  )
    throw new Error("그림 편집 데이터를 읽지 못했어요.");
  for (const stroke of doc.strokes) {
    if (
      !stroke ||
      !["pen", "eraser"].includes(stroke.tool) ||
      !/^#[0-9a-f]{6}$/i.test(stroke.color) ||
      !Number.isFinite(stroke.widthPx) ||
      stroke.widthPx < 1 ||
      stroke.widthPx > 40 ||
      !Array.isArray(stroke.points) ||
      !stroke.points.length ||
      stroke.points.some(
        (p) =>
          !p ||
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < 0 ||
          p.x > 1 ||
          p.y < 0 ||
          p.y > 1,
      )
    )
      throw new Error("그림 편집 데이터의 획이 올바르지 않아요.");
  }
  return doc;
}

export function serializeDrawing(document: StrokeDocument): string {
  const json = JSON.stringify(document);
  parseDrawing(json);
  return json;
}

export function flowerDrawing(): StrokeDocument {
  const doc = blankDrawing();
  const add = (
    points: { x: number; y: number }[],
    color: string,
    widthPx = 5,
  ) => doc.strokes.push({ tool: "pen", color, widthPx, points });
  const circle = (cx: number, cy: number, rx: number, ry: number) =>
    Array.from({ length: 65 }, (_, i) => ({
      x: cx + Math.cos((i / 64) * Math.PI * 2) * rx,
      y: cy + Math.sin((i / 64) * Math.PI * 2) * ry,
    }));
  add(
    [
      { x: 0.5, y: 0.45 },
      { x: 0.5, y: 0.73 },
      { x: 0.48, y: 0.85 },
    ],
    "#5E8D72",
  );
  add(
    [
      { x: 0.5, y: 0.67 },
      { x: 0.41, y: 0.6 },
      { x: 0.39, y: 0.66 },
      { x: 0.5, y: 0.72 },
    ],
    "#5E8D72",
  );
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(
      circle(
        0.5 + Math.cos(a) * 0.075,
        0.36 + Math.sin(a) * 0.11,
        0.065,
        0.085,
      ),
      "#E05252",
      4,
    );
  }
  add(circle(0.5, 0.36, 0.04, 0.06), "#D59E42", 5);
  return doc;
}
