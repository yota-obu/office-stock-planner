import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Warehouse,
  LibraryBig,
  UsersRound,
  ReceiptText,
  PanelTop,
  Box,
  Boxes,
  ChartNoAxesColumnIncreasing,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  MousePointer2,
  Move,
  GripVertical,
  Maximize,
  RotateCcw,
  CircleHelp,
  Check,
  Menu,
  X,
  Layers3,
  BookmarkCheck,
  LayoutDashboard,
  Info,
} from "lucide-react";
import { products } from "./catalog.js";
import { initialPlan, add, move, summarize, isValidPlan } from "./engine.js";
import Dialogs from "./Dialogs.jsx";
import ProductArt from "./ProductArt.jsx";
import "./style.css";

const key = "kokobo-shelf-v1";
const lookup = Object.fromEntries(products.map((p) => [p.id, p]));
const money = (n) => n.toLocaleString("ja-JP");
function readPlan() {
  try {
    const p = JSON.parse(localStorage.getItem(key));
    if (p && isValidPlan(p)) return p;
  } catch {}
  return initialPlan();
}
function Logo() {
  return (
    <div className="brand">
      <svg width="32" height="35" viewBox="0 0 32 35" aria-hidden="true">
        <path d="M2 9 16 1 30 9 16 17Z" fill="#e9ab62" />
        <path d="m2 12 12 7v14L2 26Z" fill="#f8cb95" />
        <path d="m18 19 12-7v14l-12 7Z" fill="#c68d4a" />
      </svg>
      <span>
        KOKOBO<small>備蓄プランナー</small>
      </span>
    </div>
  );
}
function App() {
  const [plan, setPlan] = useState(readPlan),
    [dialog, D] = useState(null),
    [page, P] = useState("shelf"),
    [query, Q] = useState(""),
    [cat, C] = useState("すべて"),
    [zoom, Z] = useState(1),
    [hover, H] = useState(null),
    [toast, T] = useState(""),
    [nav, N] = useState(false),
    [full, F] = useState(false),
    [saved, S] = useState(true);
  const timer = useRef();
  function notify(v) {
    T(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => T(""), 3200);
  }
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(plan));
      S(true);
    } catch {
      S(false);
    }
  }, [plan]);
  useEffect(() => {
    function esc(e) {
      if (e.key === "Escape") {
        F(false);
        N(false);
        D(null);
      }
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);
  const stats = summarize(plan),
    cfg = plan.config,
    visible = products.filter(
      (p) =>
        (cat === "すべて" || p.category === cat) &&
        [p.id, p.name, p.category, ...p.items.map((x) => x[0])]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    );
  function commit(result, message) {
    if (result.error) {
      notify(result.error);
      return;
    }
    setPlan(result.plan);
    notify(message);
  }
  function drag(e, data) {
    e.dataTransfer.setData("application/x-kokobo", JSON.stringify(data));
    e.dataTransfer.effectAllowed = data.row == null ? "copy" : "move";
  }
  function drop(e, row, index = null) {
    e.preventDefault();
    H(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/x-kokobo"));
      commit(
        data.row == null
          ? add(plan, data.id, 1, row)
          : move(plan, data.row, data.index, row, index),
        "配置を更新しました",
      );
    } catch {}
  }
  function navigate(id) {
    N(false);
    if (id === "shelf" || id === "catalog") {
      P(id);
    } else D({ type: id });
  }
  const links = [
    ["shelf", PanelTop, "棚シミュレーター"],
    ["catalog", LibraryBig, "製品カタログ"],
    ["employees", UsersRound, "社員数から試算"],
    ["estimate", ReceiptText, "見積もり・集計"],
  ];
  const catalog = (
    <section className={"catalog panel " + (page === "catalog" ? "wide" : "")}>
      <div className="panelheading">
        <h2>
          <LibraryBig />
          製品カタログ
        </h2>
        <span className="tinycount">{products.length} 製品</span>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={16} />
          <input
            placeholder="製品名・品番・内容物で検索"
            value={query}
            onChange={(e) => Q(e.target.value)}
          />
        </label>
        <label className="category">
          <SlidersHorizontal size={14} />
          <select
            aria-label="カテゴリー"
            value={cat}
            onChange={(e) => C(e.target.value)}
          >
            {["すべて", ...new Set(products.map((x) => x.category))].map(
              (c) => (
                <option value={c} key={c}>
                  {c === "すべて" ? "すべてのカテゴリー" : c}
                </option>
              ),
            )}
          </select>
          <ChevronDown size={13} />
        </label>
      </div>
      <div className="productlist">
        {visible.map((p) => (
          <article
            draggable
            onDragStart={(e) => drag(e, { id: p.id })}
            key={p.id}
            className="product"
          >
            <button
              className="productopen"
              onClick={() => D({ type: "product", id: p.id })}
            >
              <span className="thumb">
                <ProductArt product={p} />
              </span>
              <span className="productcopy">
                <small>{p.id}</small>
                <strong>{p.name}</strong>
                <b>¥{money(p.price)}</b>
              </span>
            </button>
            <button
              className="quickadd"
              title={p.name + "の数量を選んで追加"}
              aria-label={p.name + "の数量を選んで追加"}
              onClick={() => D({ type: "product", id: p.id })}
            >
              <Plus size={15} />
            </button>
          </article>
        ))}
        {!visible.length && <p className="empty">該当する製品がありません。</p>}
      </div>
    </section>
  );
  return (
    <div className="app">
      {nav && (
        <button
          className="veil"
          aria-label="メニューを閉じる"
          onClick={() => N(false)}
        />
      )}
      <aside className={nav ? "open" : ""}>
        <Logo />
        <nav>
          {links.map(([id, I, label]) => (
            <button
              key={id}
              className={
                dialog?.type === id || (!dialog && page === id) ? "active" : ""
              }
              onClick={() => navigate(id)}
            >
              <I size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebarfoot">
          <button
            onClick={() => {
              N(false);
              D({ type: "help" });
            }}
          >
            <CircleHelp size={17} />
            使い方ガイド
          </button>
          <span>KING JIM 製品対応</span>
        </div>
      </aside>
      <main>
        <header>
          <button
            className="menubtn"
            aria-label="メニュー"
            onClick={() => N(true)}
          >
            <Menu />
          </button>
          <LayoutDashboard size={15} />
          <span>ワークスペース</span>
          <ChevronRight size={13} />
          <b>{page === "shelf" ? "棚シミュレーター" : "製品カタログ"}</b>
          <div className="save">
            <i />
            {saved ? "端末に自動保存" : "端末への保存に失敗"}
          </div>
        </header>
        <div className="body">
          <div className="title">
            <div>
              <h1>{page === "shelf" ? "棚シミュレーター" : "製品カタログ"}</h1>
              <p>
                {page === "shelf"
                  ? "防災セットを棚に配置して、備蓄スペースと費用を確認しましょう。"
                  : "製品の仕様やセット内容を確認して、棚に追加できます。"}
              </p>
            </div>
            <button className="primary" onClick={() => D({ type: "estimate" })}>
              <ReceiptText size={17} />
              見積もりを確認
            </button>
          </div>
          {page === "catalog" ? (
            catalog
          ) : (
            <>
              <div className="metrics">
                {[
                  [
                    Box,
                    "収納セット数",
                    stats.count,
                    "セット",
                    "blue",
                    "estimate",
                  ],
                  [
                    ChartNoAxesColumnIncreasing,
                    "棚の使用率",
                    stats.fill,
                    "%",
                    "green",
                    "settings",
                  ],
                  [
                    ReceiptText,
                    "概算見積もり",
                    "¥" + money(stats.price),
                    "",
                    "orange",
                    "estimate",
                  ],
                  [
                    Boxes,
                    "内容物合計",
                    stats.items.reduce((a, b) => a + b.count, 0),
                    "点",
                    "purple",
                    "items",
                  ],
                ].map(([I, label, value, unit, color, target]) => (
                  <button key={label} onClick={() => D({ type: target })}>
                    <span className={"metricicon " + color}>
                      <I size={18} />
                    </span>
                    <span className="metriclabel">{label}</span>
                    <strong>
                      {value} <small>{unit}</small>
                    </strong>
                  </button>
                ))}
              </div>
              <div className="work">
                <section
                  className={"panel canvaspanel " + (full ? "fullscreen" : "")}
                >
                  <div className="panelheading">
                    <h2>
                      <PanelTop />
                      棚プレビュー
                    </h2>
                    <button
                      className="smallbutton"
                      onClick={() => D({ type: "settings" })}
                    >
                      <SlidersHorizontal size={14} />
                      棚の設定
                    </button>
                  </div>
                  <div className="canvas">
                    <div className="viewtag">
                      <i />
                      正面図
                    </div>
                    <button
                      className="expand"
                      title="表示切替"
                      onClick={() => F(!full)}
                    >
                      {full ? <X size={16} /> : <Maximize size={16} />}
                    </button>
                    <div className="shelfscroll">
                      <div
                        className="diagram"
                        style={{
                          "--ratio": cfg.width / cfg.height,
                          "--zoom": zoom,
                        }}
                      >
                        <div className="widthmeasure">
                          <span>{money(cfg.width)} mm</span>
                        </div>
                        <div className="rack">
                          {plan.rows.map((row, i) => (
                            <div
                              key={i}
                              className={"bay " + (hover === i ? "over" : "")}
                              onDragOver={(e) => {
                                e.preventDefault();
                                H(i);
                              }}
                              onDragLeave={() => H(null)}
                              onDrop={(e) => drop(e, i)}
                            >
                              <span className="rownum">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <div className="shelfinside">
                                {row.map((id, j) => {
                                  const p = lookup[id];
                                  return (
                                    <button
                                      key={j}
                                      className="spine"
                                      onDrop={(e) => {
                                        e.stopPropagation();
                                        drop(e, i, j);
                                      }}
                                      draggable
                                      onDragStart={(e) =>
                                        drag(e, { row: i, index: j })
                                      }
                                      title={p.name}
                                      onClick={() =>
                                        D({
                                          type: "product",
                                          id,
                                          row: i,
                                          index: j,
                                        })
                                      }
                                      style={{
                                        width: (p.w / cfg.width) * 100 + "%",
                                        height:
                                          (p.h / (cfg.height / cfg.levels)) *
                                            100 +
                                          "%",
                                      }}
                                    >
                                      <ProductArt product={p} spine />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="heightmeasure">
                          <span>{money(cfg.height)} mm</span>
                        </div>
                      </div>
                    </div>
                    <div className="zoom">
                      <button
                        title="縮小"
                        disabled={zoom <= 0.6}
                        onClick={() =>
                          Z((v) => Math.max(0.6, +(v - 0.1).toFixed(1)))
                        }
                      >
                        <Minus size={13} />
                      </button>
                      <button title="標準倍率" onClick={() => Z(1)}>
                        {Math.round(zoom * 100)}%
                      </button>
                      <button
                        title="拡大"
                        disabled={zoom >= 1.5}
                        onClick={() =>
                          Z((v) => Math.min(1.5, +(v + 0.1).toFixed(1)))
                        }
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="canvasfoot">
                    <span>
                      <Layers3 size={15} />
                      {cfg.levels}段ラック
                    </span>
                    <span>
                      幅 {cfg.width} × 高さ {cfg.height} × 奥行 {cfg.depth} mm
                    </span>
                  </div>
                  <div className="tip">
                    <MousePointer2 size={16} />
                    製品をドラッグ＆ドロップして、好きな段に配置できます。
                  </div>
                  <div className="capacity">
                    <div className="capacitytitle">
                      <h3>各段の空きスペース</h3>
                      <button
                        onClick={() => D({ type: "clear" })}
                        disabled={!stats.count}
                      >
                        <RotateCcw size={12} />
                        棚を空にする
                      </button>
                    </div>
                    {plan.rows.map((row, i) => {
                      const used = row.reduce((n, id) => n + lookup[id].w, 0);
                      return (
                        <div className="capacityrow" key={i}>
                          <b>{i + 1} 段目</b>
                          <div>
                            <i
                              style={{ width: (used / cfg.width) * 100 + "%" }}
                            />
                          </div>
                          <span>
                            残り <strong>{money(cfg.width - used)}</strong> mm
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
                {catalog}
              </div>
            </>
          )}
        </div>
      </main>
      {dialog?.type === "clear" ? (
        <div className="helpback">
          <section role="alertdialog" aria-modal="true" className="help">
            <h2>棚を空にしますか？</h2>
            <p>
              配置中の{stats.count}
              セットをすべて取り出します。棚の寸法と段数は引き続き使えます。
            </p>
            <button autoFocus className="smallbutton" onClick={() => D(null)}>
              キャンセル
            </button>
            <button
              className="primary"
              onClick={() => {
                setPlan({ ...plan, rows: plan.rows.map(() => []) });
                D(null);
                notify("棚を空にしました");
              }}
            >
              すべて取り出す
            </button>
          </section>
        </div>
      ) : dialog?.type === "help" ? (
        <div className="helpback" onClick={() => D(null)}>
          <section className="help" role="dialog" aria-modal="true">
            <h2>使い方ガイド</h2>
            <p>
              「棚の設定」で内寸と段数を指定します。カタログから棚に製品をドラッグするか、＋ボタンで数量を選んで追加してください。
            </p>
            <p>
              配置済みの製品をクリックすると詳細と削除操作が表示されます。「見積もり・集計」で金額と内訳を確認できます。
            </p>
            <button className="primary" autoFocus onClick={() => D(null)}>
              閉じる
            </button>
          </section>
        </div>
      ) : (
        <Dialogs
          dialog={dialog}
          onClose={() => D(null)}
          plan={plan}
          onChange={setPlan}
          onNotify={notify}
        />
      )}
      <div role="status" className={"toast " + (toast ? "shown" : "")}>
        {toast}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
