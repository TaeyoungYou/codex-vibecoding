export interface MediaAsset {
  id: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  name?: string;
}

export interface Stroke {
  tool: "pen" | "eraser";
  color: string;
  widthPx: number;
  points: { x: number; y: number }[];
}

export interface StrokeDocument {
  formatVersion: 1;
  width: 900;
  height: 600;
  strokes: Stroke[];
}

export interface Entry {
  id: string;
  authorId: string;
  nickname: string;
  text: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  images: MediaAsset[];
  drawing: MediaAsset | null;
}

export interface EditEntry extends Entry {
  drawingDocument: StrokeDocument | null;
}
export interface Draft {
  text: string;
  images: MediaAsset[];
  drawing: MediaAsset | null;
  drawingDocument: StrokeDocument | null;
}

export interface Profile {
  id: string;
  nickname: string;
}
export interface EntryCursor {
  createdAt: string;
  id: string;
}
export interface EntryPage {
  entries: Entry[];
  nextCursor: EntryCursor | null;
}
export interface SaveEntryInput {
  id: string;
  expectedVersion: number | null;
  text: string;
  imageAssetIds: string[];
  drawing: { previewAssetId: string; strokesJson: string } | null;
}

export const emptyDraft = (): Draft => ({
  text: "",
  images: [],
  drawing: null,
  drawingDocument: null,
});
export const blankDrawing = (): StrokeDocument => ({
  formatVersion: 1,
  width: 900,
  height: 600,
  strokes: [],
});
