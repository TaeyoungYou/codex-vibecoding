import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme, smooth } from "../theme";

export const Frame = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <AbsoluteFill
    className="Promo__Frame"
    style={{
      backgroundColor: theme.background,
      color: theme.foreground,
      fontFamily: theme.font,
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      className="Promo__Brand"
      style={{
        position: "absolute",
        left: 144,
        top: 120,
        display: "flex",
        alignItems: "center",
        gap: 20,
        zIndex: 10,
      }}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <rect width="56" height="56" rx="13" fill="#171717" />
        <path
          d="M21 16h-3a3 3 0 0 0-3 3v19a3 3 0 0 0 3 3h19a3 3 0 0 0 3-3v-9M24 16h8M20 23h5M20 30h3M30 32l-5 1 1-5 13-13a3 3 0 0 1 4 4Z"
          stroke="white"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          fontFamily: theme.latin,
          fontSize: 36,
          fontWeight: 650,
          letterSpacing: "-1px",
        }}
      >
        Realtime Guestbook
      </span>
    </div>
    {children}
  </AbsoluteFill>
);

export const Copy = ({
  headline,
  eyebrow,
  supporting,
  size = 96,
  left = 144,
  top = 350,
  width = 690,
}: {
  headline: string;
  eyebrow: string;
  supporting?: string;
  size?: number;
  left?: number;
  top?: number;
  width?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Interactive.Div
      name="장면 문구"
      premountFor={fps}
      className="Promo__Copy"
      style={{
        position: "absolute",
        left,
        top,
        width,
        zIndex: 4,
        opacity: interpolate(frame, [0, 16], [0, 1], smooth),
        translate: interpolate(frame, [0, 22], ["0px 24px", "0px 0px"], smooth),
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "3px",
          color: theme.muted,
          marginBottom: 30,
        }}
      >
        {eyebrow}
      </div>
      <div
        className="Promo__Headline"
        style={{
          fontSize: size,
          fontWeight: 700,
          letterSpacing: "-4px",
          lineHeight: 1.19,
          whiteSpace: "pre-line",
          wordBreak: "keep-all",
        }}
      >
        {headline}
      </div>
      {supporting ? (
        <div
          className="Promo__Supporting"
          style={{
            fontSize: 34,
            color: "#525252",
            marginTop: 36,
            lineHeight: 1.65,
            whiteSpace: "pre-line",
            letterSpacing: "-0.5px",
          }}
        >
          {supporting}
        </div>
      ) : null}
    </Interactive.Div>
  );
};
