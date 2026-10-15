import { Composition, Folder } from "remotion";
import { PromoVideo } from "./PromoVideo";
import { Opening } from "./scenes/Opening";
import { Writing } from "./scenes/Writing";
import { Images } from "./scenes/Images";
import { Drawing } from "./scenes/Drawing";
import { Together } from "./scenes/Together";
import { Closing } from "./scenes/Closing";

export const RemotionRoot = () => (
  <>
    <Composition
      id="RealtimeGuestbookPromo"
      component={PromoVideo}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
    <Folder name="Scenes">
      <Composition
        id="Opening"
        component={Opening}
        durationInFrames={135}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ headline: "작은 인사,\n함께 모아요." }}
      />
      <Composition
        id="Writing"
        component={Writing}
        durationInFrames={195}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ headline: "이름 정하고,\n한 줄 남기기." }}
      />
      <Composition
        id="Images"
        component={Images}
        durationInFrames={165}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ headline: "글도, 이미지도.\n내 방식대로." }}
      />
      <Composition
        id="Drawing"
        component={Drawing}
        durationInFrames={165}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ headline: "서툰 그림도,\n좋은 인사가 돼요." }}
      />
      <Composition
        id="Together"
        component={Together}
        durationInFrames={165}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ headline: "새로고침 없이,\n인사가 이어져요." }}
      />
      <Composition
        id="Closing"
        component={Closing}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          headline: "오늘의 작은 흔적을\n남겨보세요.",
          cta: "인사 남기러 가기",
          url: "realtime-feed-henna.vercel.app",
        }}
      />
    </Folder>
  </>
);
