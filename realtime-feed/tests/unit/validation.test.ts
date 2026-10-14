import { describe, expect, it } from "vitest";
import { emptyDraft } from "../../src/domain/guestbook";
import {
  codePoints,
  draftError,
  nicknameError,
  MiB,
} from "../../src/domain/validation";

describe("guestbook input boundaries", () => {
  it("counts Unicode code points without splitting emoji or trimming during composition", () => {
    expect(codePoints("🙂".repeat(1000))).toBe(1000);
    expect(nicknameError(" 🙂🙂 ")).toBeNull();
    expect(nicknameError("가")).not.toBeNull();
    expect(nicknameError("가".repeat(16))).toBeNull();
    expect(nicknameError("가".repeat(17))).not.toBeNull();
    expect(draftError({ ...emptyDraft(), text: "🙂".repeat(1000) })).toBeNull();
    expect(
      draftError({ ...emptyDraft(), text: "🙂".repeat(1001) }),
    ).not.toBeNull();
  });
  it("allows image-only content and exact limits, rejects empty or oversized content", () => {
    const image = {
      id: "a",
      url: "data:image/webp;base64,",
      width: 1,
      height: 1,
      bytes: MiB,
    };
    expect(draftError(emptyDraft())).not.toBeNull();
    expect(draftError({ ...emptyDraft(), text: "   \n " })).not.toBeNull();
    expect(
      draftError({ ...emptyDraft(), images: Array(5).fill(image) }),
    ).toBeNull();
    expect(
      draftError({ ...emptyDraft(), images: Array(6).fill(image) }),
    ).not.toBeNull();
    expect(
      draftError({ ...emptyDraft(), images: [{ ...image, bytes: MiB + 1 }] }),
    ).not.toBeNull();
    expect(draftError({ ...emptyDraft(), drawing: image })).toBeNull();
  });
});
