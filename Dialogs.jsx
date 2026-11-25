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
  Ruler,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import ProductArt from "./ProductArt.jsx";
import { products } from "./catalog.js";
import {
  add,
  byId,
  limits,
  move,
  remove,
  resize,
  summarize,
} from "./engine.js";
import "./dialogs.css";

const format = (value) => value.toLocaleString("ja-JP");
const money = (value) => "¥" + format(value);
const names = {
  settings: "棚の設定",
  product: "製品の詳細",
  employees: "社員数から必要数を算出",
  estimate: "見積もり",
  items: "内容品の集計",
};
const symbols = {
  settings: Settings2,
  product: Box,
  employees: Users,
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
function Settings({ plan, accept }) {
  const [draft, setDraft] = useState(plan.config);
  const [clear, setClear] = useState(false);
  const keys = [
    ["width", "棚の内幅", "mm"],
    ["depth", "棚の内奥行", "mm"],
    ["height", "収納部の合計内高", "mm"],
    ["levels", "段数", "段"],
  ];
  return (
    <form
      className="kd-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const source = clear
          ? { ...plan, rows: plan.rows.map(() => []) }
          : plan;
        accept(resize(source, draft), "棚の設定を更新しました");
      }}
    >
      <p>
        棚板の厚みを除いた内寸を入力してください。各段の高さは均等に配分します。
      </p>
      <div className="kd-grid">
        {keys.map(([key, label, unit]) => (
          <NumberField
            key={key}
            label={label}
            unit={unit}
            min={limits[key][0]}
            max={limits[key][1]}
            value={draft[key]}
            onChange={(v) =>
              setDraft({ ...draft, [key]: v === "" ? "" : Number(v) })
            }
          />
        ))}
      </div>
      <div className="kd-callout">
        <Ruler size={20} />
        <span>
          1段あたりの内高{" "}
          <strong>
            {draft.levels > 0
              ? format(Math.round((draft.height / draft.levels) * 10) / 10)
              : "—"}{" "}
            mm
          </strong>
        </span>
      </div>
      {plan.rows.some((row) => row.length > 0) && (
        <label className="kd-check">
          <input
            type="checkbox"
            checked={clear}
            onChange={(e) => setClear(e.target.checked)}
          />
          配置済みの製品をすべて取り出す
        </label>
      )}
      <button className="kd-primary" type="submit">
        <Check size={17} />
        {clear ? "棚を空にして設定を適用" : "設定を適用"}
      </button>
    </form>
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
              <span>{name}</span>
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
    </div>
  );
}
function Employees({ plan, accept }) {
  const [staff, setStaff] = useState("10");
  const [rate, setRate] = useState("1");
  const [id, setId] = useState(products[0]?.id);
  const p = byId(id);
  const count = Number(staff) * Number(rate);
  const valid = [staff, rate].every(
    (v) =>
      Number.isSafeInteger(Number(v)) && Number(v) > 0 && Number(v) <= 9999,
  );
  const existing = plan.rows.flat().filter((value) => value === id).length;
  const shortage = valid ? Math.max(0, count - existing) : 0;
  return (
    <form
      className="kd-stack"
      onSubmit={(e) => {
        e.preventDefault();
        accept(add(plan, id, shortage), shortage + "セットを追加しました");
      }}
    >
      <p>
        対象製品を社員1人に何セット配るか指定すると、現在の収納数を差し引いた不足数を計算できます。
      </p>
      <Field label="対象製品">
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}（{product.id}）
            </option>
          ))}
        </select>
      </Field>
      <div className="kd-grid">
        <NumberField
          label="社員数"
          unit="人"
          value={staff}
          onChange={setStaff}
        />
        <NumberField
          label="1人あたりの配布数"
          unit="セット"
          value={rate}
          onChange={setRate}
        />
      </div>
      <div className="kd-metrics">
        {[
          ["必要数", valid ? count : null],
          ["収納済み", existing],
          ["不足数", valid ? shortage : null],
        ].map(([k, v]) => (
          <div key={k}>
            <small>{k}</small>
            <strong>{v === null ? "—" : format(v)}</strong>
            <small>セット</small>
          </div>
        ))}
      </div>
      <div className="kd-line">
        <span>追加分の概算（税込）</span>
        <b>{valid ? money(shortage * p.price) : "—"}</b>
      </div>
      <button
        className="kd-primary"
        type="submit"
        disabled={!valid || !shortage}
      >
        <Plus size={16} />
        {valid && !shortage ? "必要数を収納済み" : "不足分を棚に追加"}
      </button>
    </form>
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
  const list = summary.items.filter((item) => item.name.includes(query.trim()));
  const units = new Map(
    summary.lines.flatMap(({ product: p }) => Object.entries(p.units || {})),
  );
  return (
    <div className="kd-stack">
      <div className="kd-total">
        <span>収納中の全セットの内容品</span>
        <strong>
          {format(summary.itemCount)} <small>点</small>
        </strong>
        <small>
          {summary.items.length} 種類 ・ {format(summary.count)} セット分
        </small>
      </div>
      <label className="kd-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="内容品を検索"
          placeholder="内容品名で検索"
        />
      </label>
      <div>
        {list.map(({ name, count }) => (
          <div className="kd-line" key={name}>
            <span>{name}</span>
            <b>
              {format(count)} {units.get(name) || "点"}
            </b>
          </div>
        ))}
        {!list.length && <p>該当する内容品はありません。</p>}
      </div>
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
        {dialog.type === "settings" ? (
          <Settings plan={plan} accept={accept} />
        ) : dialog.type === "product" ? (
          <Product dialog={dialog} plan={plan} accept={accept} />
        ) : dialog.type === "employees" ? (
          <Employees plan={plan} accept={accept} />
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
