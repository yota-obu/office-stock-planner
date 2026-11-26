import WidthRun from "./WidthRun.jsx";
import React, { useState } from "react";
import { LibraryBig, Ruler, Trash2 } from "lucide-react";
import ProductArt from "./ProductArt.jsx";
import { products } from "./catalog.js";
import "./width.css";

const format = (n) => n.toLocaleString("ja-JP");

export default function WidthCalculator() {
  const [shelfWidth, setShelfWidth] = useState("1050");
  const [lines, setLines] = useState([{ id: "BCS-300", count: "20" }]);
  const entries = lines.map((line) => ({
    p: products.find((p) => p.id === line.id),
    qty: Number(line.count),
  }));
  const { p, qty } = entries[0];
  const valid = entries.every(
    ({ qty }) => Number.isInteger(qty) && qty >= 1 && qty <= 99999,
  );
  const total = entries.reduce((n, { p, qty }) => n + p.w * qty, 0);
  const width = Number(shelfWidth);
  const validWidth = Number.isFinite(width) && width > 0;
  const perRow = Math.floor(width / p.w);
  const fits = validWidth && entries.every(({ p }) => p.w <= width);
  const remainingProduct = products.find(
    (p) => !lines.some((l) => l.id === p.id),
  );
  const update = (i, patch) =>
    setLines(lines.map((line, j) => (i === j ? { ...line, ...patch } : line)));
  // Fill each row in displayed product order, batching full identical rows.
  let rows = 0,
    space = 0;
  if (valid && fits)
    for (const { p, qty } of entries) {
      const consumed = Math.min(qty, Math.floor(space / p.w));
      space -= consumed * p.w;
      const left = qty - consumed;
      if (left) {
        const cap = Math.floor(width / p.w);
        rows += Math.ceil(left / cap);
        space = width - (((left - 1) % cap) + 1) * p.w;
      }
    }
  return (
    <section className="widthCalc">
      <div className="wcForm">
        <h2>
          <LibraryBig size={19} />
          製品と数量
        </h2>
        <label>
          棚の内幅（mm）
          <input
            className="wcWidth"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            value={shelfWidth}
            onChange={(event) => setShelfWidth(event.target.value)}
          />
        </label>
        {lines.map(({ id, count }, i) => {
          const { p, qty } = entries[i];
          const setId = (id) => update(i, { id });
          const setCount = (count) => update(i, { count });
          return (
            <section className="wcLine" key={i}>
              <div className="wcThumb" aria-hidden="true">
                <ProductArt product={p} />
              </div>
              <label className="wcProduct">
                製品
                <select value={id} onChange={(e) => setId(e.target.value)}>
                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                      disabled={lines.some(
                        (l, j) => j !== i && l.id === product.id,
                      )}
                    >
                      {product.id}　{product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                数量
                <div className="wcQty">
                  <button
                    type="button"
                    aria-label="1個減らす"
                    disabled={qty <= 1}
                    onClick={() => setCount(String(Math.max(1, qty - 1)))}
                  >
                    −
                  </button>
                  <input
                    aria-label="計算する数量"
                    type="number"
                    min="1"
                    max="99999"
                    step="1"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                  <span>個</span>
                  <button
                    type="button"
                    aria-label="1個増やす"
                    disabled={qty >= 99999}
                    onClick={() => setCount(String(Math.min(99999, qty + 1)))}
                  >
                    ＋
                  </button>
                </div>
              </label>
              <small className="wcBackWidth">背幅 {p.w} mm</small>
              {lines.length > 1 && (
                <button
                  className="smallbutton wcRemove"
                  aria-label={id + " を削除"}
                  onClick={() => setLines(lines.filter((_, j) => i !== j))}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </section>
          );
        })}
        <button
          disabled={!remainingProduct}
          className="smallbutton wcAdd"
          onClick={() =>
            setLines([...lines, { id: remainingProduct.id, count: "1" }])
          }
        >
          ＋ 製品を追加
        </button>
      </div>
      <div className="wcResult" aria-live="polite">
        <h2>
          <Ruler size={20} />
          横一列に並べると
        </h2>
        {valid ? (
          <>
            <p className="wcTotal">
              <strong>{format(total)}</strong> mm
            </p>
            <p className="wcEquation">
              {lines.length === 1
                ? "背幅 " + p.w + " mm × " + format(qty) + " 個"
                : lines.length +
                  " 製品・計 " +
                  format(entries.reduce((n, e) => n + e.qty, 0)) +
                  " 個"}{" "}
              ＝ <b>{format(total / 1000)} m</b>
            </p>
            <WidthRun entries={entries} />
            <p className="wcShelfNote">
              {!validWidth ? (
                "棚の内幅に0より大きい数値を入力すると、必要な段数が表示されます。"
              ) : fits && lines.length > 1 ? (
                <>
                  空の棚（内幅 {format(width)} mm）に入力順で詰めると{" "}
                  <b>{format(rows)} 段</b>を使用します。
                </>
              ) : fits ? (
                <>
                  内幅 {format(width)} mm では、1段に <b>{format(perRow)} 個</b>
                  収納できます。{format(qty)} 個には{" "}
                  <b>{format(Math.ceil(qty / perRow))} 段</b>必要です。
                </>
              ) : (
                "入力した棚幅を超える製品があります。"
              )}
            </p>
          </>
        ) : (
          <p className="wcInvalid">数量は1〜99,999の整数で入力してください。</p>
        )}
      </div>
    </section>
  );
}
