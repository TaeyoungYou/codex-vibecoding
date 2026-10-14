import { it, expect } from "vitest";
import { inspectWebp } from "../../supabase/functions/_shared/webp";
function header(width: number, height: number, animated = false) {
  const bytes = new Uint8Array(44),
    view = new DataView(bytes.buffer);
  const tag = (offset: number, value: string) =>
    [...value].forEach((c, i) => {
      bytes[offset + i] = c.charCodeAt(0);
    });
  tag(0, "RIFF");
  view.setUint32(4, 36, true);
  tag(8, "WEBP");
  tag(12, "VP8X");
  view.setUint32(16, 10, true);
  bytes[20] = animated ? 2 : 0;
  bytes[24] = (width - 1) & 255;
  bytes[25] = (width - 1) >> 8;
  bytes[27] = (height - 1) & 255;
  bytes[28] = (height - 1) >> 8;
  tag(30, "VP8L");
  view.setUint32(34, 5, true);
  bytes[38] = 0x2f;
  view.setUint32(39, ((height - 1) << 14) | (width - 1), true);
  return bytes;
}
it("reads static WebP dimensions and rejects animation, oversize and truncated data", () => {
  expect(inspectWebp(header(900, 600))).toEqual({
    width: 900,
    height: 600,
    bytes: 44,
  });
  expect(() => inspectWebp(header(1601, 600))).toThrow();
  expect(() => inspectWebp(header(900, 600, true))).toThrow();
  expect(() => inspectWebp(header(900, 600).slice(0, 40))).toThrow();
  expect(() => inspectWebp(new Uint8Array(1048577))).toThrow();
});
