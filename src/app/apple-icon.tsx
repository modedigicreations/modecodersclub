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
          background: "linear-gradient(140deg, #ff9a38, #e5b844 40%, #0e9b71)",
          color: "white",
          fontFamily: "monospace",
          fontSize: 72,
          fontWeight: 800,
        }}
      >
        {"</>"}
      </div>
    ),
    { ...size },
  );
}
