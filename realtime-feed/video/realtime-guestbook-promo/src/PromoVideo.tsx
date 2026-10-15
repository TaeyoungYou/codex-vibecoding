import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { staticFile, useVideoConfig } from "remotion";
import { Opening } from "./scenes/Opening";
import { Writing } from "./scenes/Writing";
import { Images } from "./scenes/Images";
import { Drawing } from "./scenes/Drawing";
import { Together } from "./scenes/Together";
import { Closing } from "./scenes/Closing";

export const PromoVideo = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <TransitionSeries>
        <TransitionSeries.Sequence
          name="첫인상"
          durationInFrames={135}
          premountFor={fps}
        >
          <Opening headline={"작은 인사,\n함께 모아요."} premountFor={fps} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence
          name="한 줄 남기기"
          durationInFrames={195}
          premountFor={fps}
        >
          <Writing headline={"이름 정하고,\n한 줄 남기기."} premountFor={fps} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence
          name="글과 이미지"
          durationInFrames={165}
          premountFor={fps}
        >
          <Images
            headline={"글도, 이미지도.\n내 방식대로."}
            premountFor={fps}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence
          name="그림도 인사"
          durationInFrames={165}
          premountFor={fps}
        >
          <Drawing
            headline={"서툰 그림도,\n좋은 인사가 돼요."}
            premountFor={fps}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence
          name="함께 보는 공간"
          durationInFrames={165}
          premountFor={fps}
        >
          <Together
            headline={"새로고침 없이,\n인사가 이어져요."}
            premountFor={fps}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence
          name="방문 유도"
          durationInFrames={150}
          premountFor={fps}
        >
          <Closing
            headline={"오늘의 작은 흔적을\n남겨보세요."}
            cta="인사 남기러 가기"
            url="realtime-feed-henna.vercel.app"
            premountFor={fps}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Audio
        name="원본 음악·효과음 마스터"
        src={staticFile("audio/promo-soundtrack.wav")}
        volume={1}
        durationInFrames={30 * fps}
        premountFor={fps}
      />
    </>
  );
};
