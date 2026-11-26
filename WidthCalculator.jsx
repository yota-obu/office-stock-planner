import React, { useState } from "react";
import { ArrowRight, LibraryBig, Ruler } from "lucide-react";
import ProductArt from "./ProductArt.jsx";
import { products } from "./catalog.js";
import "./width.css";

const format = (n) => n.toLocaleString("ja-JP");

export default function WidthCalculator({ plan, onShelf }) {
  const [id, setId] = useState("BCS-300");
  const [count, setCount] = useState("20");
  const p = products.find((product) => product.id === id);
  const qty = Number(count);
  const valid = Number.isInteger(qty) && qty >= 1 && qty <= 99999;
  const total = p.w * qty;
  const { width, height, levels, depth } = plan.config;
  const perRow = Math.floor(width / p.w);
  const fits = p.h <= height / levels && p.d <= depth && perRow > 0;
  return (
    <section className="widthCalc">
      <div className="wcForm">
        <h2>
          <LibraryBig size={19} />
          製品と数量
        </h2>
        <label>
          製品
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
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
        <div className="wcSpec">
          <div>
            <ProductArt product={p} />
          </div>
          <p>
            <b>{p.id}</b>
            <br />
            {p.name}
            <br />
            <small>
              背幅 {p.w} × 高さ {p.h} × 奥行 {p.d} mm
            </small>
          </p>
        </div>
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
              背幅 {p.w} mm × {format(qty)} 個 ＝{" "}
              <b>{format(total / 1000)} m</b>
            </p>
            <div className="wcDrawing" aria-hidden="true">
              {Array.from({ length: Math.min(qty, 24) }, (_, i) => (
                <div key={p.id + i} style={{ aspectRatio: p.w + "/" + p.h }}>
                  <ProductArt product={p} spine />
                </div>
              ))}
              {qty > 24 && <small>…</small>}
            </div>
            <p className="wcShelfNote">
              {fits ? (
                <>
                  今の棚（内幅 {format(width)} mm）には、1段に{" "}
                  <b>{format(perRow)} 個</b>収納できます。{format(qty)} 個には{" "}
                  <b>{format(Math.ceil(qty / perRow))} 段</b>必要です。
                </>
              ) : (
                "この製品は現在の棚の内寸に収まりません。棚の設定を確認してください。"
              )}
            </p>
            <button className="smallbutton" onClick={onShelf}>
              棚の配置を確認
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <p className="wcInvalid">数量は1〜99,999の整数で入力してください。</p>
        )}
      </div>
    </section>
  );
}
