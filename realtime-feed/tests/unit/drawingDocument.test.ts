import { describe, expect, it } from "vitest";
import {
  flowerDrawing,
  parseDrawing,
  serializeDrawing,
} from "../../src/features/drawing/document";

describe("editable drawing contract", () => {
  it("round-trips the ordered strokes, tools and coordinates", () => {
    const document = flowerDrawing();
    document.strokes.push({
      tool: "eraser",
      color: "#171717",
      widthPx: 8,
      points: [{ x: 0, y: 1 }],
    });
    expect(parseDrawing(serializeDrawing(document))).toEqual(document);
  });
  it("rejects oversized, malformed and out-of-bounds documents", () => {
    const doc = flowerDrawing();
    expect(() => parseDrawing(" ".repeat(524289))).toThrow("512 KiB");
    expect(() => parseDrawing("{")).toThrow();
    expect(() =>
      parseDrawing(JSON.stringify({ ...doc, width: 901 })),
    ).toThrow();
    doc.strokes[0].points[0].x = 1.1;
    expect(() => serializeDrawing(doc)).toThrow();
  });
});
