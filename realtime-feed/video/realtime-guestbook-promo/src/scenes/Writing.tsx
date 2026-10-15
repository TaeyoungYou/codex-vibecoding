import type { CSSProperties } from "react";
import {
  CanvasImage,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Frame, Copy } from "../components/Frame";
import { smooth, theme } from "../theme";

const WritingInner = ({
  headline,
  style,
}: {
  headline: string;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Frame style={style}>
      <Copy
        headline={headline}
        eyebrow="01 / 마음을 적어요"
        supporting={
          "닉네임 하나로 가볍게 시작하고,\n오늘의 이야기를 한 줄 남겨요."
        }
        size={96}
        top={350}
        width={620}
      />
      <Interactive.Div
        name="실제 작성 장면"
        premountFor={fps}
        className="Promo__ImageFrame"
        style={{
          position: "absolute",
          left: 800,
          top: 174,
          width: 1008,
          height: 756,
          overflow: "hidden",
          borderRadius: 24,
          border: `1px solid ${theme.border}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.07)",
        }}
      >
        <CanvasImage
          name="작성 모달과 키보드"
          src={staticFile("images/leaving-a-note-v2.png")}
          premountFor={fps}
          style={{
            width: 1008,
            height: 756,
            scale: interpolate(frame, [0, 194], [1, 1.035], {
              ...smooth,
              output: "perceptual-scale",
            }),
          }}
        />
      </Interactive.Div>
    </Frame>
  );
};

const schema = {
  headline: {
    type: "text-content",
    default: "이름 정하고,\n한 줄 남기기.",
    description: "작성 장면 문구",
  },
} as const satisfies InteractivitySchema;
export const Writing = Interactive.withSchema({
  Component: WritingInner,
  componentName: "<Writing>",
  schema,
  wrapInSequence: true,
});
