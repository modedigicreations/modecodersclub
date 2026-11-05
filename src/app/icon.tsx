import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 18,
          background: "linear-gradient(140deg, #ff9a38, #e5b844 40%, #0e9b71)",
          color: "white",
          fontFamily: "monospace",
          fontSize: 26,
          fontWeight: 800,
        }}
      >
        {"</>"}
      </div>
    ),
    { ...size },
  );
}
