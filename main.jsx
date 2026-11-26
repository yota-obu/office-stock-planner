import { Dimension, TierControl } from "./ShelfControls.jsx";
import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  FileText,
  ClipboardList,
  Ruler,
  Trash2,
  Undo2,
  LibraryBig,
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
  Maximize,
  CircleHelp,
  Menu,
  X,
  Layers3,
  LayoutDashboard,
  Info,
} from "lucide-react";
import { products } from "./catalog.js";
import {
  initialPlan,
  add,
  summarize,
  isValidPlan,
  applyRecommendations,
  summarizeContents,
} from "./engine.js";
import WidthCalculator from "./WidthCalculator.jsx";
import Diagnosis from "./Diagnosis.jsx";
import ProposalDialog from "./ProposalDialog.jsx";
import Dialogs from "./Dialogs.jsx";
import ProductArt from "./ProductArt.jsx";
import "./style.css";

const key = "kokobo-shelf-v1";
const titles = {
  diagnosis: "備蓄プラン診断",
  shelf: "棚シミュレーター",
  width: "必要幅を計算",
  catalog: "製品カタログ",
};
const descriptions = {
  diagnosis:
    "人数・滞在日数・備えたいものから、オフィスに合う防災セットを選びましょう。",
  shelf: "ファイル棚の内寸に合わせて、防災セットの配置と費用を確認できます。",
  width: "製品と数量を選ぶと、横一列に並べたときの棚幅がわかります。",
  catalog: "品番や内容物で検索し、製品の寸法・価格・セット内容を確認できます。",
};
const currentPage = () =>
  Object.hasOwn(titles, location.hash.slice(1))
    ? location.hash.slice(1)
    : "diagnosis";
function loadAssumptions() {
  const defaults = { people: 10, days: 3, recipient: "" };
  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem("kokobo-assumptions-v1")),
    };
  } catch {
    return defaults;
  }
}
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
    [page, P] = useState(currentPage),
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
    [assumptions, setAssumptions] = useState(loadAssumptions);
  const [selection, setSelection] = useState([]);
  function changePlan(next) {
    setSelection([]);
    history.current = [...history.current.slice(-49), plan];
    setPlan(next);
  }
  function undo() {
    const previous = history.current.pop();
    if (previous) {
      setSelection([]);
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
  function updateAssumptions(patch) {
    setAssumptions((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));
  }
  useEffect(() => {
    try {
      localStorage.setItem(
        "kokobo-assumptions-v1",
        JSON.stringify(assumptions),
      );
    } catch {}
  }, [assumptions]);
  useEffect(() => {
    function onHash() {
      P(currentPage());
      D(null);
      F(false);
      N(false);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  function applyDiagnosis(lines) {
    const result = applyRecommendations(plan, lines);
    if (result.error) {
      notify(result.error);
      return result;
    }
    changePlan(result.plan);
    navigate("shelf");
    notify("おすすめの製品を棚に配置しました");
    return result;
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
  const contents = summarizeContents(plan);
  const highlights = ["toilet", "meals", "water", "snacks", "blankets"]
    .map((key) => contents.find((g) => g.key === key))
    .filter(Boolean);
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
    if (data.row == null)
      return { ...data, id, qty: quantity(id), selected: [] };
    const picked = selection.some(
      (item) => item.row === data.row && item.index === data.index,
    );
    let selected;
    if (picked) selected = selection;
    else if (selection.length)
      selected = [{ row: data.row, index: data.index }];
    else {
      const same = plan.rows[data.row]
        .map((v, i) => (v === id ? i : -1))
        .filter((i) => i >= 0 && i !== data.index);
      selected = [data.index, ...same]
        .slice(0, quantity(id))
        .map((index) => ({ row: data.row, index }));
    }
    return {
      ...data,
      id,
      selected: [...selected].sort(
        (a, b) => a.row - b.row || a.index - b.index,
      ),
      qty: selected.length,
    };
  }
  function toggleSelection(row, index) {
    setSelection((current) =>
      current.some((v) => v.row === row && v.index === index)
        ? current.filter((v) => v.row !== row || v.index !== index)
        : [...current, { row, index }],
    );
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
    const removed = new Set(data.selected.map((v) => v.row + ":" + v.index));
    return {
      ...plan,
      rows: plan.rows.map((row, i) =>
        row.filter((_, j) => !removed.has(i + ":" + j)),
      ),
    };
  }
  function placeGroup(data, row, index = null) {
    const base = data.row == null ? plan : withoutDragged(data);
    const ids =
      data.row == null
        ? null
        : data.selected.map((pos) => plan.rows[pos.row][pos.index]);
    const result = ids ? { plan: base } : add(base, data.id, data.qty, row);
    if (result.error) return result;
    if (
      ids &&
      ids.reduce((sum, id) => sum + lookup[id].w, 0) +
        base.rows[row].reduce((sum, id) => sum + lookup[id].w, 0) >
        cfg.width
    ) {
      return {
        plan,
        error:
          "選んだ製品はこの段に収まりません。別の段を選ぶか、点数を減らしてください。",
      };
    }
    const target = [...result.plan.rows[row]];
    const group = ids ?? target.splice(target.length - data.qty);
    const offset = data.selected.filter(
      (pos) => pos.row === row && pos.index < index,
    ).length;
    target.splice(index === null ? target.length : index - offset, 0, ...group);
    return {
      plan: {
        ...result.plan,
        rows: result.plan.rows.map((items, i) => (i === row ? target : items)),
      },
    };
  }
  function drop(e, row, index = null) {
    e.preventDefault();
    e.stopPropagation();
    H(null);
    const data = dragging;
    if (!data) return;
    setDragging(null);
    const result = placeGroup(data, row, index);
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
    if (Object.hasOwn(titles, id)) {
      D(null);
      P(id);
      location.hash = id;
      window.scrollTo(0, 0);
    } else D({ type: id });
  }
  const links = [
    ["diagnosis", ClipboardList, "備蓄プラン診断"],
    ["shelf", PanelTop, "棚シミュレーター"],
    ["width", Ruler, "必要幅を計算"],
    ["catalog", LibraryBig, "製品カタログ"],
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
            draggable={page === "shelf"}
            onDragStart={(e) => {
              if (page === "shelf") drag(e, { id: p.id });
            }}
            key={p.id}
            className="product"
          >
            <button
              className="productopen"
              onClick={() =>
                D({
                  type: "product",
                  id: p.id,
                  qty: quantity(p.id),
                  readOnly: page === "catalog",
                })
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
            {page === "shelf" && (
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
                  aria-label={p.name + "を棚に追加"}
                  onClick={() =>
                    D({
                      type: "product",
                      id: p.id,
                      qty: quantity(p.id),
                      readOnly: page === "catalog",
                    })
                  }
                >
                  棚に追加
                </button>
              </div>
            )}
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
          <b>{titles[page]}</b>
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
              <h1>{titles[page]}</h1>
              <p>{descriptions[page]}</p>
            </div>
            {page === "shelf" && (
              <button
                className="primary"
                onClick={() => D({ type: "estimate" })}
              >
                <ReceiptText size={17} />
                見積もりを確認
              </button>
            )}
          </div>
          {page === "diagnosis" ? (
            <Diagnosis
              assumptions={assumptions}
              onAssumptions={updateAssumptions}
              onApply={applyDiagnosis}
            />
          ) : page === "width" ? (
            <WidthCalculator plan={plan} onShelf={() => navigate("shelf")} />
          ) : page === "catalog" ? (
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
                    "dimensions",
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
                    "内容物の内訳",
                    [
                      ...highlights,
                      ...contents.filter((g) => !highlights.includes(g)),
                    ]
                      .slice(0, 2)
                      .map((g) => (
                        <span key={g.key}>
                          {g.label}{" "}
                          <b>
                            {money(g.count)}
                            {g.unit}
                          </b>
                        </span>
                      )),
                    "",
                    "purple",
                    "items",
                  ],
                ].map(([I, label, value, unit, color, target]) => (
                  <button
                    key={label}
                    onClick={() =>
                      target === "dimensions"
                        ? document.querySelector(".widthmeasure input")?.focus()
                        : D({ type: target })
                    }
                  >
                    <span className={"metricicon " + color}>
                      <I size={18} />
                    </span>
                    <span className="metriclabel">{label}</span>
                    {target === "items" ? (
                      <div className="metricContents">
                        {contents.length ? value : "未配置"}
                        <ChevronRight size={13} />
                      </div>
                    ) : (
                      <strong>
                        {value} <small>{unit}</small>
                      </strong>
                    )}
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
                    <TierControl plan={plan} commit={commit} />
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
                      onClick={() => D({ type: "proposal" })}
                    >
                      <FileText size={14} />
                      提案書を作成
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
                          "--fit-ratio":
                            cfg.width / ((2 * cfg.height) / cfg.levels),
                          "--zoom": zoom,
                        }}
                      >
                        <div className="widthmeasure">
                          <Dimension axis="width" plan={plan} commit={commit} />
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
                                      aria-pressed={selection.some(
                                        (v) => v.row === i && v.index === j,
                                      )}
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
                                      onClick={() => toggleSelection(i, j)}
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
                          <Dimension
                            axis="height"
                            plan={plan}
                            commit={commit}
                          />
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
                      <Dimension axis="depth" plan={plan} commit={commit} />
                    </span>
                  </div>
                  <details className="picklist">
                    <summary>棚の製品をリストから選択</summary>
                    {plan.rows.map((row, i) => (
                      <fieldset key={i}>
                        <legend>{i + 1}段目</legend>
                        {row.length ? (
                          row.map((id, j) => (
                            <label key={j}>
                              <input
                                type="checkbox"
                                checked={selection.some(
                                  (v) => v.row === i && v.index === j,
                                )}
                                onChange={() => toggleSelection(i, j)}
                              />
                              {j + 1}. {lookup[id].name}（{id}）
                            </label>
                          ))
                        ) : (
                          <small>空き段</small>
                        )}
                      </fieldset>
                    ))}
                  </details>
                  {selection.length > 0 && (
                    <div className="selectiontools">
                      <b>{selection.length}点を選択中</b>
                      <select
                        aria-label="選択した製品の移動先"
                        value=""
                        onChange={(e) =>
                          commit(
                            placeGroup(
                              {
                                row: selection[0].row,
                                selected: [...selection].sort(
                                  (a, b) => a.row - b.row || a.index - b.index,
                                ),
                              },
                              Number(e.target.value),
                            ),
                            "選んだ製品を移動しました",
                          )
                        }
                      >
                        <option value="" disabled>
                          段に移動…
                        </option>
                        {plan.rows.map((_, i) => (
                          <option value={i} key={i}>
                            {i + 1}段目
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          changePlan(withoutDragged({ selected: selection }));
                          notify("選んだ製品を取り出しました");
                        }}
                      >
                        取り出す
                      </button>
                      <button onClick={() => setSelection([])}>
                        選択を解除
                      </button>
                    </div>
                  )}
                  <div className="tip">
                    <MousePointer2 size={16} />
                    {dragging?.row != null
                      ? "棚の外で離すと取り出します。"
                      : "背表紙をクリックして複数選択し、まとめてドラッグできます。"}
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
              <section className="panel stockItems">
                <div className="panelheading">
                  <h2>
                    <Boxes />
                    アイテム別の合計数量
                  </h2>
                  <button
                    className="smallbutton"
                    onClick={() => D({ type: "items" })}
                  >
                    用途別に確認
                    <ChevronRight size={13} />
                  </button>
                </div>
                <div>
                  {contents
                    .flatMap((group) => group.items)
                    .map((item) => (
                      <span key={item.name}>
                        {item.name}{" "}
                        <b>
                          {money(item.count)} {item.unit}
                        </b>
                      </span>
                    ))}
                  {!contents.length && (
                    <p>製品を配置すると、ここに内容物と数量が表示されます。</p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      {dialog?.type === "proposal" ? (
        <ProposalDialog
          plan={plan}
          assumptions={assumptions}
          onAssumptions={updateAssumptions}
          onClose={() => D(null)}
          onNotify={notify}
        />
      ) : dialog?.type === "clear" ? (
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
              寸法欄をクリックして直接入力し、＋・−で段数を調整します。商品欄の＋・−で数量を選んで、製品の絵を棚にドラッグしてください。数字を直接入力することもできます。
            </p>
            <p>
              背表紙をクリックすると選択できます。異なる製品や別の段の製品も一緒に選び、選んだ背表紙をつかんで移動できます。棚の外に離すと取り出します。「ひとつ前に戻る」で取り出す前の状態に戻せます。
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
