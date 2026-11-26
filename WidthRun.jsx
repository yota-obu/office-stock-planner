import React, { useLayoutEffect, useRef, useState } from "react";
import ProductArt from "./ProductArt.jsx";
import "./width-run.css";

import WidthComparison, { references } from "./WidthComparison.jsx";
const format = (value) => value.toLocaleString("ja-JP");

export default function WidthRun({ entries }) {
  const total = entries.reduce((n, { p, qty }) => n + p.w * qty, 0);
  const [choice, setChoice] = useState("auto");
  const closest = references.reduce((a, b) =>
    Math.abs(Math.log(total / a.width)) <= Math.abs(Math.log(total / b.width))
      ? a
      : b,
  );
  const reference = references.find((r) => r.kind === choice) ?? closest;
  const scale = Math.min(
    0.34,
    180 / { paper: 297, desk: 700, bus: 3100, track: 9500 }[reference.kind],
  );
  const viewport = useRef(null);
  const [view, setView] = useState({ width: 0, left: 0 });
  useLayoutEffect(() => {
    const node = viewport.current;
    function measure() {
      setView({ width: node.clientWidth, left: node.scrollLeft });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    node.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", measure);
    };
  }, []);
  let length = 0,
    count = 0;
  const groups = entries.map(({ p, qty }) => {
    const group = { p, qty, start: length, first: count, width: p.w * scale };
    length += group.width * qty;
    count += qty;
    return group;
  });
  // Keep the scrollbar within browser layout limits, even for a run of millions of sets.
  length = Math.max(length, reference.width * scale);
  const track = Math.min(length, 4000000);
  const left = Math.max(
    0,
    Math.min(
      length - view.width,
      (view.left * Math.max(0, length - view.width)) /
        Math.max(1, track - view.width),
    ),
  );
  const visible = [];
  for (const group of groups) {
    const first = Math.max(0, Math.floor((left - group.start) / group.width));
    const end = Math.min(
      group.qty,
      Math.ceil((left + view.width - group.start) / group.width),
    );
    for (let i = first; i < end; i++) {
      const index = group.first + i + 1;
      visible.push({
        index,
        p: group.p,
        x: group.start + i * group.width - left,
        width: group.width,
      });
    }
  }
  return (
    <div className="widthRun">
      <label className="comparisonChoice">
        同じ縮尺で比較
        <select
          value={choice}
          onChange={(event) => {
            setChoice(event.target.value);
            viewport.current.scrollLeft = 0;
          }}
        >
          <option value="auto">自動（{closest.name}）</option>
          {references.map((r) => (
            <option key={r.kind} value={r.kind}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <div
        className="widthRunViewport"
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label="製品の並び。左右の矢印キーでスクロール"
        onKeyDown={(event) => {
          const node = viewport.current;
          if (event.key === "End" || event.key === "Home") {
            event.preventDefault();
            node.scrollLeft = event.key === "End" ? node.scrollWidth : 0;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const logicalStep = Math.max(30, view.width / 3);
            node.scrollLeft +=
              (event.key === "ArrowLeft" ? -1 : 1) *
              Math.max(
                1,
                logicalStep *
                  Math.min(
                    1,
                    (track - view.width) / Math.max(1, length - view.width),
                  ),
              );
          }
        }}
      >
        <div className="widthRunTrack" style={{ width: track }}>
          <div className="widthRunWindow" style={{ width: view.width }}>
            <div
              className="productLane"
              style={{
                height: Math.max(...entries.map(({ p }) => p.h)) * scale + 8,
              }}
            >
              {visible.map(({ index, p, x, width }) => (
                <div
                  key={index}
                  data-position={index}
                  title={format(index) + "個目 " + p.name}
                  style={{ left: x, width, height: p.h * scale }}
                >
                  <ProductArt product={p} spine />
                </div>
              ))}
            </div>
            <p className="comparisonCaption">
              {reference.name} · {format(reference.width)} mm
            </p>
            <WidthComparison reference={reference} scale={scale} left={left} />
          </div>
        </div>
      </div>
      {visible.length > 0 && (
        <small>
          {format(visible[0].index)}〜{format(visible.at(-1).index)} 個目 / 全{" "}
          {format(count)} 個
        </small>
      )}
    </div>
  );
}
