import type { Draft } from "./guestbook";

export const MiB = 1024 * 1024;
export const codePoints = (value: string) => Array.from(value).length;

export function nicknameError(value: string): string | null {
  const count = codePoints(value.trim());
  return count < 2 || count > 16 ? "닉네임을 2~16자로 입력해주세요." : null;
}

export function draftError(draft: Draft): string | null {
  if (codePoints(draft.text) > 1000)
    return "메시지를 1,000자 이내로 줄여주세요.";
  if (!draft.text.trim() && !draft.images.length && !draft.drawing)
    return "메시지, 이미지, 그림 중 하나 이상을 남겨주세요.";
  if (draft.images.length > 5) return "이미지는 최대 5장까지 추가할 수 있어요.";
  if (
    draft.images.some((image) => image.bytes > MiB) ||
    draft.images.reduce((sum, image) => sum + image.bytes, 0) > 5 * MiB
  )
    return "이미지는 장당 1 MiB, 합계 5 MiB 이하여야 해요.";
  if (draft.drawing && draft.drawing.bytes > MiB)
    return "그림 미리보기는 1 MiB 이하여야 해요.";
  return null;
}
