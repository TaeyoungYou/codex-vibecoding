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

const ImagesInner = ({
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
        eyebrow="02 / 좋아하는 순간을 함께"
        supporting={
          "짧은 이야기에도, 좋아하는 이미지에도\n당신의 마음이 담겨요."
        }
        size={96}
        top={350}
        width={690}
      />
      <Interactive.Div
        name="이미지 게시물"
        premountFor={fps}
        style={{
          position: "absolute",
          left: 866,
          top: 190,
          width: 910,
          height: 738,
          translate: interpolate(
            frame,
            [0, 26],
            ["28px 0px", "0px 0px"],
            smooth,
          ),
        }}
      >
        <CanvasImage
          name="풍경 이미지 카드 원본 영역"
          src={staticFile("images/hero-background-v2.png")}
          premountFor={fps}
          cropLeft={0.575}
          cropRight={0.015}
          cropTop={0.055}
          cropBottom={0.315}
          style={{
            position: "absolute",
            width: 2100,
            height: 1181.94,
            left: -1207.5,
            top: -65.01,
            scale: interpolate(frame, [0, 164], [0.985, 1.015], {
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
    default: "글도, 이미지도.\n내 방식대로.",
    description: "이미지 장면 문구",
  },
} as const satisfies InteractivitySchema;
export const Images = Interactive.withSchema({
  Component: ImagesInner,
  componentName: "<Images>",
  schema,
  wrapInSequence: true,
});
