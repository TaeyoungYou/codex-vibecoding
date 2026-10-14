import type {
  Entry,
  EntryPage,
  MediaAsset,
  Profile,
  EditEntry,
} from "@/domain/guestbook";
import { parseDrawing } from "@/features/drawing/document";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid response");
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid response");
  return value;
}
function positive(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    throw new Error("invalid response");
  return value;
}
function media(value: unknown): MediaAsset {
  const v = record(value);
  const url = string(v.url);
  if (!/^https?:\/\//.test(url)) throw new Error("invalid media URL");
  return {
    id: string(v.id),
    url,
    width: positive(v.width),
    height: positive(v.height),
    bytes: positive(v.bytes),
  };
}
export function parseEntry(value: unknown): Entry {
  const v = record(value);
  if (!Array.isArray(v.images) || v.images.length > 5)
    throw new Error("invalid response");
  const createdAt = string(v.createdAt),
    updatedAt = string(v.updatedAt);
  if (
    !Number.isFinite(Date.parse(createdAt)) ||
    !Number.isFinite(Date.parse(updatedAt))
  )
    throw new Error("invalid dates");
  return {
    id: string(v.id),
    authorId: string(v.authorId),
    nickname: string(v.nickname),
    text: string(v.text),
    version: positive(v.version),
    createdAt,
    updatedAt,
    images: v.images.map(media),
    drawing: v.drawing === null ? null : media(v.drawing),
  };
}
export function parseEditEntry(value: unknown): EditEntry {
  const v = record(value);
  const entry = parseEntry(value);
  const drawingDocument =
    v.strokesJson === null ? null : parseDrawing(string(v.strokesJson));
  if (!!entry.drawing !== !!drawingDocument)
    throw new Error("missing drawing data");
  return { ...entry, drawingDocument };
}
export function parseProfile(value: unknown): Profile {
  const v = record(value);
  return { id: string(v.id), nickname: string(v.nickname) };
}
export function parsePage(value: unknown): EntryPage {
  const v = record(value);
  if (!Array.isArray(v.entries)) throw new Error("invalid response");
  const cursor = v.nextCursor === null ? null : record(v.nextCursor);
  return {
    entries: v.entries.map(parseEntry),
    nextCursor: cursor
      ? { id: string(cursor.id), createdAt: string(cursor.createdAt) }
      : null,
  };
}
