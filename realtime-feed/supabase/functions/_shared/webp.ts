// Read the first image frame's dimensions without trusting browser-supplied
// metadata. Animation is deliberately rejected for this static image product.
export function inspectWebp(bytes: Uint8Array): {
  width: number;
  height: number;
  bytes: number;
} {
  if (bytes.length < 20 || bytes.length > 1048576)
    throw new Error("invalid size");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (
    tag(0) !== "RIFF" ||
    tag(8) !== "WEBP" ||
    view.getUint32(4, true) + 8 !== bytes.length
  )
    throw new Error("invalid WebP");
  const u24 = (offset: number) =>
    bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
  let dimensions: { width: number; height: number } | null = null;
  let frame = false;
  let offset = 12;
  for (; offset + 8 <= bytes.length;) {
    const kind = tag(offset),
      size = view.getUint32(offset + 4, true),
      start = offset + 8;
    if (start + size > bytes.length) throw new Error("truncated WebP");
    if (kind === "ANIM" || kind === "ANMF") throw new Error("animated WebP");
    if (kind === "VP8X") {
      if (size !== 10 || bytes[start] & 2)
        throw new Error("animated or invalid WebP");
      dimensions = { width: 1 + u24(start + 4), height: 1 + u24(start + 7) };
    } else if (kind === "VP8 ") {
      if (
        size < 10 ||
        bytes[start] & 1 ||
        bytes[start + 3] !== 0x9d ||
        bytes[start + 4] !== 0x01 ||
        bytes[start + 5] !== 0x2a
      )
        throw new Error("invalid VP8");
      const actual = {
        width: view.getUint16(start + 6, true) & 0x3fff,
        height: view.getUint16(start + 8, true) & 0x3fff,
      };
      if (
        dimensions &&
        (actual.width !== dimensions.width ||
          actual.height !== dimensions.height)
      )
        throw new Error("dimension mismatch");
      dimensions = actual;
      frame = true;
    } else if (kind === "VP8L") {
      if (size < 5 || bytes[start] !== 0x2f) throw new Error("invalid VP8L");
      const bits = view.getUint32(start + 1, true);
      const actual = {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      };
      if (
        dimensions &&
        (actual.width !== dimensions.width ||
          actual.height !== dimensions.height)
      )
        throw new Error("dimension mismatch");
      dimensions = actual;
      frame = true;
    }
    offset = start + size + (size % 2);
    if (offset > bytes.length) throw new Error("invalid padding");
  }
  if (
    offset !== bytes.length ||
    !frame ||
    !dimensions ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    Math.max(dimensions.width, dimensions.height) > 1600
  )
    throw new Error("invalid dimensions");
  return { ...dimensions, bytes: bytes.length };
}
