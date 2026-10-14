import type { EditEntry } from "@/domain/guestbook";
import { flowerDrawing } from "@/features/drawing/document";
import { drawingPreview } from "@/features/drawing/render";

export function sampleEntries(): EditEntry[] {
  const now = Date.now();
  const entry = (
    id: string,
    nickname: string,
    text: string,
    minutes: number,
  ): EditEntry => ({
    id,
    nickname,
    text,
    authorId: `sample-${id}`,
    version: 1,
    createdAt: new Date(now - minutes * 60000).toISOString(),
    updatedAt: new Date(now - minutes * 60000).toISOString(),
    images: [],
    drawing: null,
    drawingDocument: null,
  });
  const walk = entry(
    "walk",
    "오후산책",
    "별일 없는 하루도 기록해두면 조금 특별해지는 것 같아요.\n들렀다 갑니다. 오늘도 좋은 하루 보내세요.",
    8,
  );
  const mountain = entry(
    "mountain",
    "초록",
    "주말에 걷고 싶은 풍경을 엽서처럼 그려봤어요.\n가끔은 조금 느리게 가도 괜찮겠죠.",
    34,
  );
  mountain.images = [
    {
      id: "sample-landscape",
      url: "/samples/landscape.svg",
      width: 1200,
      height: 720,
      bytes: 1240,
    },
  ];
  const flower = entry(
    "flower",
    "연필",
    "지나가는 분들께 작은 꽃 한 송이.",
    92,
  );
  flower.drawingDocument = flowerDrawing();
  flower.drawing = drawingPreview(flower.drawingDocument);
  const hello = entry(
    "hello",
    "느린우체통",
    "글로 남겨도 좋고, 그림으로 남겨도 좋고.\n서로 다른 인사가 모이는 이 공간이 마음에 들어요.",
    185,
  );
  return [walk, mountain, flower, hello];
}
