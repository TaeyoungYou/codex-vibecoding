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

const DrawingInner = ({
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
        eyebrow="03 / 그림으로도 전해요"
        supporting={
          "멋진 작품이 아니어도 괜찮아요.\n작은 꽃 한 송이도 좋은 인사니까요."
        }
        size={84}
        top={350}
        width={710}
      />
      <Interactive.Div
        name="꽃 그림 게시물"
        premountFor={fps}
        style={{
          position: "absolute",
          left: 964,
          top: 260,
          width: 730,
          height: 560,
          opacity: interpolate(frame, [0, 22], [0.75, 1], smooth),
          translate: interpolate(
            frame,
            [0, 50],
            ["0px 24px", "0px 0px"],
            smooth,
          ),
        }}
      >
        <CanvasImage
          name="그림 카드 원본 영역"
          src={staticFile("images/hero-background-v2.png")}
          premountFor={fps}
          cropLeft={0.045}
          cropRight={0.58}
          cropTop={0.45}
          cropBottom={0.04}
          style={{
            position: "absolute",
            width: 1950,
            height: 1097.6,
            left: -87.75,
            top: -493.92,
            scale: interpolate(frame, [0, 164], [0.99, 1.018], {
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
    default: "서툰 그림도,\n좋은 인사가 돼요.",
    description: "그림 장면 문구",
  },
} as const satisfies InteractivitySchema;
export const Drawing = Interactive.withSchema({
  Component: DrawingInner,
  componentName: "<Drawing>",
  schema,
  wrapInSequence: true,
});
