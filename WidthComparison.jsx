import React from "react";
import "./width-comparison.css";

export const references = [
  { name: "A4用紙の短辺", width: 210, height: 297, kind: "paper" },
  { name: "フルサイズキーボード", width: 440, height: 145, kind: "keyboard" },
  { name: "デスクモニター", width: 610, height: 425, kind: "monitor" },
  { name: "長机の幅", width: 1800, height: 700, kind: "desk" },
  { name: "壁掛けホワイトボード", width: 3600, height: 1200, kind: "board" },
  { name: "バスの全長", width: 12000, height: 3520, kind: "bus" },
];

function Illustration({ kind }) {
  if (kind === "bus")
    return <img src={import.meta.env.BASE_URL + "width-city-bus.svg"} alt="" />;
  const drawings = {
    paper: (
      <>
        <path fill="#fdfbf3" d="M45 4h44l12 12v60H45z" />
        <path fill="#e7d7b5" d="M89 4v13h12" />
        <path d="M53 30h38m-38 8h32m-32 8h38m-38 8h23" stroke="#b5c5b9" />
      </>
    ),
    desk: (
      <>
        <path fill="#9eaea6" d="M16 39h5v31h-5zm99 0h5v31h-5z" />
        <path fill="#dcb88c" d="m11 31 11-10h97l11 10v8H11z" />
        <path d="M12 32h117m-106 20h91" />
      </>
    ),
    keyboard: (
      <>
        <rect width="220" height="72" rx="5" fill="#344740" />
        <g fill="#e7e8dd" stroke="none">
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 22 }, (_, col) =>
              row === 4 && col >= 3 && col <= 10 ? null : (
                <rect
                  key={row + "-" + col}
                  x={4 + col * 9.7}
                  y={5 + row * 12.6}
                  width="8"
                  height="9.8"
                  rx="1.4"
                />
              ),
            ),
          )}
          <rect x="33" y="55.4" width="76" height="9.8" rx="1.4" />
        </g>
      </>
    ),
    monitor: (
      <>
        <path d="M103 116h14l3 26 18 4v4H82v-4l18-4z" fill="#99a8a4" />
        <rect width="220" height="124" rx="4" fill="#283e39" />
        <rect x="5" y="5" width="210" height="111" rx="2" fill="#9ebdb8" />
        <path
          d="M6 104 60 58l43 35 35-48 76 68H6z"
          stroke="none"
          fill="#799c91"
        />
        <circle cx="167" cy="33" r="13" fill="#eee0bc" stroke="none" />
      </>
    ),
    board: (
      <>
        <rect width="300" height="100" rx="2" fill="#adbbb7" />
        <rect x="3" y="3" width="294" height="93" fill="#fafcf7" />
        <path
          d="M14 17h76m-76 7h42m93 35 17-12 20 3 26-24"
          fill="none"
          stroke="#728f9b"
        />
        <rect x="96" y="94" width="108" height="5" fill="#aab6b0" />
        <path d="M109 93h13m5 0h13" stroke="#486f80" strokeWidth="3" />
      </>
    ),
  };
  return (
    <svg
      viewBox={
        {
          paper: "45 4 56 72",
          desk: "11 21 119 49",
          keyboard: "0 0 220 72",
          monitor: "0 0 220 150",
          board: "0 0 300 100",
        }[kind]
      }
      preserveAspectRatio="none"
      aria-hidden="true"
      stroke="#405b50"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {drawings[kind]}
    </svg>
  );
}

export default function WidthComparison({ reference, scale, left }) {
  const height = reference.height * scale;
  return (
    <div className="comparisonLane" style={{ height }}>
      <div
        className="comparisonObject"
        style={{ left: -left, width: reference.width * scale, height }}
      >
        <Illustration kind={reference.kind} />
      </div>
    </div>
  );
}
