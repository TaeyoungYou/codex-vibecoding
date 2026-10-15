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

const TogetherInner = ({
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
        eyebrow="04 / 함께 보는 방명록"
        supporting={
          "서로 다른 오늘이 한곳에 모이고,\n작은 인사가 또 다른 인사로 이어져요."
        }
        size={92}
        top={350}
        width={730}
      />
      <CanvasImage
        name="완성된 방명록 전경"
        src={staticFile("images/portfolio-guestbook.png")}
        premountFor={fps}
        style={{
          position: "absolute",
          left: 816,
          top: 320,
          width: 992,
          height: 557.7,
          scale: interpolate(frame, [0, 164], [1.025, 1], {
            ...smooth,
            output: "perceptual-scale",
          }),
          translate: interpolate(
            frame,
            [0, 164],
            ["16px 0px", "0px 0px"],
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
    default: "새로고침 없이,\n인사가 이어져요.",
    description: "함께 보는 공간 문구",
  },
} as const satisfies InteractivitySchema;
export const Together = Interactive.withSchema({
  Component: TogetherInner,
  componentName: "<Together>",
  schema,
  wrapInSequence: true,
});
