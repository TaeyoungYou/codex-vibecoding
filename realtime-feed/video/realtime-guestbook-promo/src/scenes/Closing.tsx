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

const ClosingInner = ({
  headline,
  cta,
  url,
  style,
}: {
  headline: string;
  cta: string;
  url: string;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Frame style={style}>
      <Copy
        headline={headline}
        eyebrow="당신의 인사를 기다릴게요"
        size={94}
        top={285}
        width={1560}
      />
      <CanvasImage
        name="마지막 제품 목업"
        src={staticFile("images/portfolio-guestbook.png")}
        premountFor={fps}
        style={{
          position: "absolute",
          left: 912,
          top: 485,
          width: 864,
          height: 485.7,
          scale: interpolate(frame, [0, 60], [0.96, 1], {
            ...smooth,
            output: "perceptual-scale",
          }),
          translate: interpolate(
            frame,
            [0, 60],
            ["0px 14px", "0px 0px"],
            smooth,
          ),
        }}
      />
      <Interactive.Div
        name="방문 안내"
        premountFor={fps}
        className="Promo__CTA"
        style={{
          position: "absolute",
          left: 144,
          top: 660,
          width: 672,
          opacity: interpolate(frame, [12, 42], [0, 1], smooth),
          translate: interpolate(
            frame,
            [12, 42],
            ["0px 16px", "0px 0px"],
            smooth,
          ),
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 28,
            padding: "28px 36px",
            backgroundColor: "#171717",
            color: "white",
            borderRadius: 14,
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: "-1.5px",
          }}
        >
          {cta}
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14m-6-6 6 6-6 6"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          style={{
            fontFamily: theme.latin,
            fontSize: 32,
            color: "#525252",
            marginTop: 30,
            letterSpacing: "-0.4px",
          }}
        >
          {url}
        </div>
      </Interactive.Div>
    </Frame>
  );
};

const schema = {
  headline: {
    type: "text-content",
    default: "오늘의 작은 흔적을\n남겨보세요.",
    description: "마지막 제목",
  },
  cta: {
    type: "text-content",
    default: "인사 남기러 가기",
    description: "방문 안내",
  },
  url: {
    type: "text-content",
    default: "realtime-feed-henna.vercel.app",
    description: "서비스 주소",
  },
} as const satisfies InteractivitySchema;
export const Closing = Interactive.withSchema({
  Component: ClosingInner,
  componentName: "<Closing>",
  schema,
  wrapInSequence: true,
});
