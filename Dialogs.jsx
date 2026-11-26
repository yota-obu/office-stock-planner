import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Box,
  Calculator,
  Check,
  ClipboardList,
  Download,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import ProductArt from "./ProductArt.jsx";
import {
  add,
  byId,
  move,
  remove,
  summarize,
  summarizeContents,
} from "./engine.js";
import { itemDescription } from "./content-info.js";
import "./dialogs.css";

const format = (value) => value.toLocaleString("ja-JP");
const money = (value) => "¥" + format(value);
const names = {
  product: "製品の詳細",
  estimate: "見積もり",
  items: "内容品の集計",
};
const symbols = {
  product: Box,
  estimate: ClipboardList,
  items: Package,
};
function Field({ label, children }) {
  return (
    <label className="kd-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function NumberField({ value, onChange, label, unit, min = 1, max = 9999 }) {
  return (
    <Field label={label}>
      <span className="kd-number">
        <input
          type="number"
          aria-label={label}
          required
          min={min}
          max={max}
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span>{unit}</span>
      </span>
    </Field>
  );
}
function Destination({ plan, value, onChange, auto = true }) {
  return (
    <Field label="収納先">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {auto && <option value="">空いている段に自動配置</option>}
        {plan.rows.map((_, i) => (
          <option key={i} value={i}>
            {i + 1} 段目
          </option>
        ))}
      </select>
    </Field>
  );
}
function Product({ dialog, plan, accept }) {
  const p = byId(dialog.id);
  const placed = Number.isInteger(dialog.row) && Number.isInteger(dialog.index);
  const [dest, setDest] = useState(placed ? String(dialog.row) : "");
  const [qty, setQty] = useState(String(dialog.qty || 1));
  if (!p) return <p>製品が見つかりません。</p>;
  return (
    <div className="kd-stack">
      <div className="kd-product">
        <div className="kd-art">
          <ProductArt product={p} />
        </div>
        <div>
          <small>
            {p.id}
            {p.discontinued && " ・ 販売終了品"}
          </small>
          <h3>{p.name}</h3>
          <p>
            {money(p.price)} <small>税込 / セット</small>
          </p>
        </div>
      </div>
      <div className="kd-spec">
        {[
          ["背幅", p.w],
          ["高さ", p.h],
          ["奥行", p.d],
        ].map(([k, v]) => (
          <div key={k}>
            <small>{k}</small>
            <strong>
              {v} <small>mm</small>
            </strong>
          </div>
        ))}
      </div>
      <details className="kd-details">
        <summary>
          セット内容 <small>{p.items.length}種類</small>
        </summary>
        <div>
          {p.items.map(([name, n]) => (
            <div className="kd-line" key={name}>
              <span>
                {name}
                <small>{itemDescription(name)}</small>
              </span>
              <b>
                {format(n)} {p.units?.[name] || "点"}
              </b>
            </div>
          ))}
        </div>
      </details>
      <a className="kd-link" href={p.url} target="_blank" rel="noreferrer">
        公式の製品情報 <ArrowUpRight size={14} />
      </a>
      {!dialog.readOnly && (
        <form
          className="kd-stack kd-section"
          onSubmit={(e) => {
            e.preventDefault();
            if (placed)
              accept(
                move(plan, dialog.row, dialog.index, Number(dest)),
                "製品を移動しました",
              );
            else
              accept(
                add(plan, p.id, Number(qty), dest === "" ? null : Number(dest)),
                qty + "セットを棚に追加しました",
              );
          }}
        >
          <div className={placed ? "" : "kd-grid kd-split"}>
            {!placed && (
              <NumberField
                label="数量"
                unit="セット"
                value={qty}
                onChange={setQty}
              />
            )}
            <Destination
              auto={!placed}
              plan={plan}
              value={dest}
              onChange={setDest}
            />
          </div>
          <button
            type="submit"
            className="kd-primary"
            disabled={placed && Number(dest) === dialog.row}
          >
            {placed ? <Check size={17} /> : <Plus size={17} />}{" "}
            {placed ? "指定した段へ移動" : "棚に追加"}
          </button>
          {placed && (
            <button
              type="button"
              className="kd-quiet"
              onClick={() =>
                accept(
                  remove(plan, dialog.row, dialog.index),
                  "製品を棚から取り出しました",
                )
              }
            >
              <Trash2 size={15} />
              棚から取り出す
            </button>
          )}
        </form>
      )}
    </div>
  );
}
function exportEstimate(summary) {
  const rows = [
    ["製品名", "品番", "税込単価（円）", "セット数", "税込小計（円）"],
    ...summary.lines.map(({ product: p, count }) => [
      p.name,
      p.id,
      p.price,
      count,
      p.price * count,
    ]),
    ["総額", "", "", summary.count, summary.price],
  ];
  const csv = rows
    .map((row) =>
      row.map((val) => '"' + String(val).replaceAll('"', '""') + '"').join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "防災備蓄_概算見積.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Report({ plan, mode }) {
  const summary = summarize(plan);
  const [query, setQuery] = useState("");
  if (mode === "estimate")
    return (
      <div className="kd-stack">
        <div className="kd-total">
          <span>概算合計（税込）</span>
          <strong>{money(summary.price)}</strong>
          <small>
            {summary.lines.length} 製品 ・ {format(summary.count)} セット
          </small>
        </div>
        {summary.lines.map(({ product: p, count }) => (
          <div className="kd-line" key={p.id}>
            <div>
              <b>{p.name}</b>
              <small>
                {p.id} ・ {money(p.price)} × {count}
              </small>
            </div>
            <strong>{money(p.price * count)}</strong>
          </div>
        ))}
        <p>
          掲載時の税込単価で試算しています。送料は別途かかります。
          {summary.lines.some(({ product }) => product.discontinued) &&
            "販売終了品には最終掲載価格を使用しています。"}
        </p>
        <button className="kd-primary" onClick={() => exportEstimate(summary)}>
          <Download size={17} />
          見積もりをCSVで保存
        </button>
      </div>
    );
  const term = query.trim().toLowerCase();
  const groups = summarizeContents(plan)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        [group.label, item.name, item.description].some((value) =>
          value.toLowerCase().includes(term),
        ),
      ),
    }))
    .filter((group) => group.items.length);
  return (
    <div className="kd-stack">
      <div className="kd-total">
        <span>収納中の全セットの内容品</span>
        <strong>
          {format(summary.itemCount)} <small>点</small>
        </strong>
        <small>
          {summary.items.length} 種類 ・ {format(summary.count)}{" "}
          セット分（同梱単位）
        </small>
      </div>
      <label className="kd-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="内容品を検索"
          placeholder="用途・内容品名で検索"
        />
      </label>
      {groups.map((group) => (
        <details
          className="kd-content-group"
          key={group.key + ":" + term}
          open={term ? true : undefined}
        >
          <summary>
            <strong>{group.label}</strong>
            <b>
              {format(group.count)} {group.unit}
            </b>
          </summary>
          <p>{group.description}</p>
          {group.items.map((item) => (
            <div className="kd-line" key={item.name}>
              <span>
                {item.name}
                <small>{item.description}</small>
              </span>
              <b>
                {format(item.count)} {item.unit}
              </b>
            </div>
          ))}
        </details>
      ))}
      {!groups.length && (
        <p>
          {summary.count
            ? "該当する内容品はありません。"
            : "棚に製品を追加すると、用途ごとの備蓄量を確認できます。"}
        </p>
      )}
    </div>
  );
}

function ActiveDialog({ dialog, onClose, plan, onChange, onNotify }) {
  const [error, setError] = useState("");
  const modal = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = modal.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus?.();
    };
  }, []);
  function accept(result, message) {
    if (result.error) {
      setError(result.error);
      return;
    }
    onChange(result.plan);
    onNotify?.(message);
    onClose();
  }
  const Icon = symbols[dialog.type] || Calculator;
  return (
    <dialog
      ref={modal}
      className="kd-dialog"
      aria-labelledby="kd-title"
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const { left, right, top, bottom } =
            e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < left ||
            e.clientX > right ||
            e.clientY < top ||
            e.clientY > bottom
          )
            onClose();
        }
      }}
    >
      <div className="kd-head">
        <span className="kd-symbol">
          <Icon size={20} />
        </span>
        <h2 id="kd-title">{names[dialog.type]}</h2>
        <button type="button" aria-label="閉じる" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="kd-body">
        {dialog.type === "product" ? (
          <Product dialog={dialog} plan={plan} accept={accept} />
        ) : (
          <Report plan={plan} mode={dialog.type} />
        )}
        {error && (
          <div role="alert" className="kd-error">
            {error}
          </div>
        )}
      </div>
    </dialog>
  );
}
export default function Dialogs(props) {
  if (!props.dialog) return null;
  return (
    <ActiveDialog
      key={[
        props.dialog.type,
        props.dialog.id,
        props.dialog.row,
        props.dialog.index,
      ].join("-")}
      {...props}
    />
  );
}
