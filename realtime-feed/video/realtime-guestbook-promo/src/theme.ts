import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

await Promise.all([
  loadFont({
    family: "Pretendard",
    url: staticFile("fonts/PretendardVariable.woff2"),
    weight: "100 900",
  }),
  loadFont({
    family: "Inter",
    url: staticFile("fonts/InterVariable.woff2"),
    weight: "100 900",
  }),
]);

export const theme = {
  background: "#FFFFFF",
  foreground: "#171717",
  muted: "#737373",
  border: "#E5E5E5",
  font: "Pretendard, Inter, sans-serif",
  latin: "Inter, Pretendard, sans-serif",
};

export const smooth = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
