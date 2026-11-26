import React from "react";
import "./width-comparison.css";

export const references = [
  { name: "A4用紙の短辺", width: 210, kind: "paper" },
  { name: "長机の幅", width: 1800, kind: "desk" },
  { name: "バスの全長", width: 12000, kind: "bus" },
  { name: "陸上トラックの直線走路", width: 100000, kind: "track" },
];

function Illustration({ kind }) {
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
    bus: (
      <>
        <rect x="7" y="23" width="130" height="40" rx="8" fill="#e0b77d" />
        <rect x="12" y="28" width="118" height="17" rx="3" fill="#c7dbd9" />
        <path d="M30 28v17m18-17v17m18-17v17m18-17v17m18-17v17m12-17v33M9 51h102" />
        <g fill="#475751">
          <circle cx="32" cy="62" r="8" />
          <circle cx="111" cy="62" r="8" />
        </g>
        <g fill="#e1dfcf">
          <circle cx="32" cy="62" r="3" />
          <circle cx="111" cy="62" r="3" />
        </g>
      </>
    ),
    track: (
      <>
        <path fill="#c88970" d="M5 58 30 23h109l-25 35z" />
        <path
          stroke="#fff2d9"
          d="M12 48h109M20 36h109M35 25 14 56m111-31-22 31"
        />
      </>
    ),
  };
  return (
    <svg
      viewBox={
        {
          paper: "45 4 56 72",
          desk: "11 21 119 49",
          bus: "7 23 130 47",
          track: "5 23 134 35",
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
  const height =
    { paper: 297, desk: 700, bus: 3100, track: 9500 }[reference.kind] * scale;
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
