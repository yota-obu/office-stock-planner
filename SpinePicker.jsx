import React, { useLayoutEffect, useRef } from "react";
import ProductArt from "./ProductArt.jsx";
import "./spine-picker.css";

export default function SpinePicker({
  row,
  index,
  items,
  lookup,
  selection,
  toggle,
  close,
}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog.showModal();
    dialog.querySelector('[data-current="true"]').focus();
    return () => {
      dialog.close();
      trigger?.focus({ preventScroll: true });
    };
  }, []);
  const start = Math.max(0, index - 2);
  return (
    <dialog
      ref={ref}
      className="spine-picker"
      aria-labelledby="spine-picker-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <h2 id="spine-picker-title">背表紙を拡大して選択</h2>
      <p>タップした位置の周辺です。移動したい箱を選んでください。</p>
      <div className="spine-options">
        {items.slice(start, index + 3).map((id, offset) => {
          const position = start + offset;
          const pressed = selection.some(
            (v) => v.row === row && v.index === position,
          );
          return (
            <button
              key={position}
              data-current={position === index}
              aria-pressed={pressed}
              aria-label={`左から${position + 1}箱目 ${lookup[id].name}`}
              onClick={() => toggle(row, position)}
            >
              <span className="spine-sample">
                <ProductArt product={lookup[id]} spine />
              </span>
              <strong>{position + 1}箱目</strong>
              <small>{id}</small>
              <span>{pressed ? "✓ 選択中" : "選択"}</span>
            </button>
          );
        })}
      </div>
      <button className="primary" onClick={close}>
        棚に戻る
      </button>
    </dialog>
  );
}
