import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  FileText,
  Trash2,
  Undo2,
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
import { initialPlan, add, summarize, isValidPlan } from "./engine.js";
import Dialogs from "./Dialogs.jsx";
import ProductArt from "./ProductArt.jsx";
import "./style.css";

const key = "kokobo-shelf-v1";
const lookup = Object.fromEntries(products.map((p) => [p.id, p]));
const money = (n) => n.toLocaleString("ja-JP");
function readPlan() {
  try {
    const p = JSON.parse(localStorage.getItem(key));
    if (p && isValidPlan(p)) return { plan: p };
    if (p?.rows?.flat().includes("SYS-200") && p.config.depth < 222) {
      const repaired = { ...p, config: { ...p.config, depth: 222 } };
      if (isValidPlan(repaired))
        return {
          plan: repaired,
          notice:
            "車載セットの背表紙を正面に向けたため、保存済みの棚の奥行を " +
            p.config.depth +
            " mm から 222 mm に調整しました。実際の棚に合わせてご確認ください。",
        };
    }
  } catch {}
  return { plan: initialPlan() };
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
  const [loaded] = useState(readPlan);
  const [notice, setNotice] = useState(loaded.notice);
  const [plan, setPlan] = useState(loaded.plan),
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
  const timer = useRef(),
    history = useRef([]),
    ghost = useRef(null);
  const [quantities, setQuantities] = useState({}),
    [dragging, setDragging] = useState(null),
    [making, setMaking] = useState(false);
  function changePlan(next) {
    history.current = [...history.current.slice(-49), plan];
    setPlan(next);
  }
  function undo() {
    const previous = history.current.pop();
    if (previous) {
      setPlan(previous);
      notify("ひとつ前の状態に戻しました");
    }
  }
  function quantity(id) {
    return Number(quantities[id]) || 1;
  }
  function setQuantity(id, n) {
    setQuantities((q) => ({
      ...q,
      [id]:
        n === "" ? "" : Math.max(1, Math.min(9999, Math.trunc(Number(n) || 1))),
    }));
  }
  async function proposal() {
    setMaking(true);
    try {
      const { createProposal } = await import("./proposal.js");
      await createProposal(plan);
      notify("A4提案書を作成しました");
    } catch {
      notify("提案書を作成できませんでした。もう一度お試しください。");
    } finally {
      setMaking(false);
    }
  }
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
    changePlan(result.plan);
    notify(message);
  }
  function dragPayload(data) {
    const id = data.id ?? plan.rows[data.row][data.index];
    const indices =
      data.row == null
        ? []
        : plan.rows[data.row]
            .map((v, i) => (v === id ? i : -1))
            .filter((i) => i >= 0);
    const selected =
      data.row == null
        ? []
        : [data.index, ...indices.filter((i) => i !== data.index)].slice(
            0,
            quantity(id),
          );
    return {
      ...data,
      id,
      selected,
      qty: data.row == null ? quantity(id) : selected.length,
    };
  }
  const touch = useRef(null),
    suppressClick = useRef(false);
  function touchStart(e, data) {
    if (
      (e.pointerType !== "touch" && e.pointerType !== "pen") ||
      !e.isPrimary ||
      page !== "shelf"
    )
      return;
    touch.current = {
      data: dragPayload(data),
      x: e.clientX,
      y: e.clientY,
      active: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function touchMove(e) {
    const gesture = touch.current;
    if (!gesture) return;
    if (!gesture.active) {
      if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) < 8) return;
      gesture.active = true;
      flushSync(() => setDragging(gesture.data));
    }
    ghost.current.style.left = e.clientX + 12 + "px";
    ghost.current.style.top = e.clientY - 30 + "px";
    const bay = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest(".bay");
    H(bay ? Number(bay.dataset.row) : null);
    if (e.clientY < 70) window.scrollBy(0, -20);
    if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 20);
  }
  function touchEnd(e) {
    const gesture = touch.current;
    touch.current = null;
    if (!gesture?.active) return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const bay = target?.closest(".bay");
    const spine = target?.closest(".spine");
    if (bay)
      drop(
        e,
        Number(bay.dataset.row),
        spine ? Number(spine.dataset.index) : null,
      );
    else if (target && !target.closest(".rack")) dropOutside(e, true);
    setDragging(null);
    H(null);
  }
  function drag(e, data) {
    const payload = dragPayload(data);
    flushSync(() => setDragging(payload));
    e.dataTransfer.setData("application/x-kokobo", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = data.row == null ? "copy" : "move";
    ghost.current.style.left = e.clientX + "px";
    ghost.current.style.top = e.clientY + "px";
    e.dataTransfer.setDragImage(ghost.current, 10, 18);
    requestAnimationFrame(() => {
      if (ghost.current) ghost.current.style.left = "-9000px";
    });
  }
  function withoutDragged(data) {
    return {
      ...plan,
      rows: plan.rows.map((row, i) =>
        i === data.row ? row.filter((_, j) => !data.selected.includes(j)) : row,
      ),
    };
  }
  function drop(e, row, index = null) {
    e.preventDefault();
    e.stopPropagation();
    H(null);
    const data = dragging;
    if (!data) return;
    setDragging(null);
    const base = data.row == null ? plan : withoutDragged(data);
    const result = add(base, data.id, data.qty, row);
    if (!result.error && index !== null) {
      const target = result.plan.rows[row];
      const group = target.splice(target.length - data.qty);
      const offset =
        data.row === row ? data.selected.filter((i) => i < index).length : 0;
      target.splice(index - offset, 0, ...group);
    }
    commit(result, data.qty + "セットを配置しました");
  }
  function dropOutside(e, fromTouch = false) {
    if (!dragging || (!fromTouch && e.target.closest(".rack"))) return;
    e.preventDefault();
    if (dragging.row != null) {
      changePlan(withoutDragged(dragging));
      notify(dragging.qty + "セットを棚から取り出しました");
    }
    setDragging(null);
    H(null);
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
              onClick={() =>
                D({ type: "product", id: p.id, qty: quantity(p.id) })
              }
            >
              <span
                className="thumb"
                onPointerDown={(e) => touchStart(e, { id: p.id })}
              >
                <ProductArt product={p} />
              </span>
              <span className="productcopy">
                <small>{p.id}</small>
                <strong>{p.name}</strong>
                <b>¥{money(p.price)}</b>
              </span>
            </button>
            <div className="qtytools">
              <div className="qtystep">
                <button
                  aria-label={p.name + "の数量を減らす"}
                  disabled={quantity(p.id) <= 1}
                  onClick={() => setQuantity(p.id, quantity(p.id) - 1)}
                >
                  −
                </button>
                <input
                  aria-label={p.name + "のドラッグ数量"}
                  type="number"
                  min="1"
                  max="9999"
                  value={quantities[p.id] ?? 1}
                  onChange={(e) => setQuantity(p.id, e.target.value)}
                  onBlur={() => setQuantity(p.id, quantity(p.id))}
                />
                <button
                  aria-label={p.name + "の数量を増やす"}
                  onClick={() => setQuantity(p.id, quantity(p.id) + 1)}
                >
                  ＋
                </button>
              </div>
              <button
                className="quickadd"
                title={p.name + "の数量を選んで追加"}
                aria-label={p.name + "の数量を選んで追加"}
                onClick={() =>
                  D({ type: "product", id: p.id, qty: quantity(p.id) })
                }
              >
                棚に追加
              </button>
            </div>
          </article>
        ))}
        {!visible.length && <p className="empty">該当する製品がありません。</p>}
      </div>
    </section>
  );
  return (
    <div
      className="app"
      onPointerMove={touchMove}
      onPointerUp={touchEnd}
      onPointerCancel={() => {
        if (touch.current) {
          touch.current = null;
          setDragging(null);
          H(null);
        }
      }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragEnd={() => {
        setDragging(null);
        H(null);
      }}
      onDragOver={(e) => {
        if (dragging?.row != null) e.preventDefault();
      }}
      onDrop={dropOutside}
    >
      {dragging && (
        <div ref={ghost} className="dragghost" aria-hidden="true">
          <div
            style={{
              width: (92 * lookup[dragging.id].w) / lookup[dragging.id].h,
              height: 92,
            }}
          >
            <ProductArt product={lookup[dragging.id]} spine />
          </div>
          <b>×{dragging.qty}</b>
        </div>
      )}
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
          {notice && (
            <div className="migration" role="status">
              <Info size={16} />
              <span>{notice}</span>
              <button
                aria-label="お知らせを閉じる"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
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
                  <div className="shelftools">
                    <button onClick={undo} disabled={!history.current.length}>
                      <Undo2 size={14} />
                      ひとつ前に戻る
                    </button>
                    <button
                      onClick={() => D({ type: "clear" })}
                      disabled={!stats.count}
                    >
                      <Trash2 size={14} />
                      棚を空にする
                    </button>
                    <button
                      className="proposal"
                      onClick={proposal}
                      disabled={making}
                    >
                      <FileText size={14} />
                      {making ? "作成中…" : "提案書を作成"}
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
                              data-row={i}
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
                                      data-index={j}
                                      onPointerDown={(e) =>
                                        touchStart(e, { row: i, index: j })
                                      }
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
                    {dragging?.row != null
                      ? "棚の外で離すと取り出します。"
                      : "商品欄で数量を選び、棚にドラッグ。棚の外で離すと取り出せます。"}
                  </div>
                  <div className="capacity">
                    <div className="capacitytitle">
                      <h3>各段の空きスペース</h3>
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
                changePlan({ ...plan, rows: plan.rows.map(() => []) });
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
              「棚の設定」で内寸と段数を指定します。商品欄の＋・−で数量を選んで、製品の絵を棚にドラッグしてください。数字を直接入力することもできます。
            </p>
            <p>
              棚の製品をドラッグすると、同じ段の同じ製品を指定個数までまとめて動かせます。棚の外に離すと取り出します。「ひとつ前に戻る」で取り出す前の状態に戻せます。
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
          onChange={changePlan}
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
