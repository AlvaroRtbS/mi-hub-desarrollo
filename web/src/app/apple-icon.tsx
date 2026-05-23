import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
          color: "white",
          fontSize: 90,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: -3,
        }}
      >
        mh
      </div>
    ),
    { ...size }
  );
}
