import { ImageResponse } from "next/og";

/**
 * Apple touch icon — same monogram as /icon at the 180px size Apple expects.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

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
          background: "#102138",
        }}
      >
        <svg width="128" height="128" viewBox="0 0 40 40">
          <g stroke="rgba(233,201,109,0.45)" strokeWidth="1" strokeLinecap="round">
            <line x1="9" y1="30.5" x2="26" y2="30.5" />
            <line x1="9" y1="34.5" x2="20" y2="34.5" />
          </g>
          <path
            d="M9.5 11.5 H30.5 M20 11.5 V26.5 L24.75 31.25 L30.5 24.5"
            fill="none"
            stroke="#e9c96d"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="30.5" cy="11.5" r="2.6" fill="#6ed6d1" />
          <circle cx="30.5" cy="11.5" r="1.05" fill="#0b1a2e" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
