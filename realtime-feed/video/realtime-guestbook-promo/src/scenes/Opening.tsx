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
import { smooth } from "../theme";

const OpeningInner = ({
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
        eyebrow="작은 인사가 모이는 곳"
        supporting={"글도, 이미지도, 그림도.\n당신의 방식으로 남겨보세요."}
        size={120}
        top={320}
      />
      <CanvasImage
        name="방명록 카드"
        src={staticFile("images/hero-background-v2.png")}
        premountFor={fps}
        style={{
          position: "absolute",
          left: 808,
          top: 295,
          width: 972,
          height: 547,
          opacity: interpolate(frame, [0, 20], [0.7, 1], smooth),
          scale: interpolate(frame, [0, 134], [0.97, 1.025], {
            ...smooth,
            output: "perceptual-scale",
          }),
          translate: interpolate(
            frame,
            [0, 90],
            ["12px 20px", "0px 0px"],
            smooth,
          ),
        }}
      />
    </Frame>
  );
};

const schema = {
  headline: {
    type: "text-content",
    default: "작은 인사,\n함께 모아요.",
    description: "첫 제목",
  },
} as const satisfies InteractivitySchema;
export const Opening = Interactive.withSchema({
  Component: OpeningInner,
  componentName: "<Opening>",
  schema,
  wrapInSequence: true,
});
