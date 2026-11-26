import CatalogPanel from "./CatalogPanel.jsx";
import ShelfConfirmation from "./ShelfConfirmation.jsx";
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
  RotateCcw,
  LibraryBig,
  ReceiptText,
  PanelTop,
  PanelLeftClose,
  PanelLeftOpen,
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
} from "lucide-react";
import { products } from "./catalog.js";
import {
  initialPlan,
  emptyDefaultPlan,
  defaultConfig,
  add,
  summarize,
  applyRecommendations,
} from "./engine.js";
import WidthCalculator from "./WidthCalculator.jsx";
import Guide from "./Guide.jsx";
import Diagnosis from "./Diagnosis.jsx";
import ProposalDialog from "./ProposalDialog.jsx";
import Dialogs from "./Dialogs.jsx";
import SpinePicker from "./SpinePicker.jsx";
import ProductArt from "./ProductArt.jsx";
import "./style.css";
import "./workspace-finish.css";
import "./shelf-finish.css";

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
const lookup = Object.fromEntries(products.map((p) => [p.id, p]));
const money = (n) => n.toLocaleString("ja-JP");
function Logo() {
  return (
    <div className="brand">
      <svg width="32" height="35" viewBox="0 0 32 35" aria-hidden="true">
        <path d="M2 9 16 1 30 9 16 17Z" fill="#e9ab62" />
        <path d="m2 12 12 7v14L2 26Z" fill="#f8cb95" />
        <path d="m18 19 12-7v14l-12 7Z" fill="#c68d4a" />
      </svg>
      <span>
        備蓄プランナー<small>非公式シミュレーター</small>
      </span>
    </div>
  );
}
function App() {
  const [picker, setPicker] = useState(null);
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width:940px)").matches,
  );
  function toggleSidebar() {
    const next = !compact;
    setCompact(next);
    if (window.matchMedia("(max-width:720px)").matches) N(!next);
  }
  const [plan, setPlan] = useState(initialPlan),
    [dialog, D] = useState(null),
    [page, P] = useState(currentPage),
    [query, Q] = useState(""),
    [cat, C] = useState("すべて"),
    [zoom, Z] = useState(1),
    [hover, H] = useState(null),
    [toast, T] = useState(""),
    [nav, N] = useState(false),
    [full, F] = useState(false);
  const timer = useRef(),
    history = useRef([]),
    ghost = useRef(null);
  const [quantities, setQuantities] = useState({}),
    [dragging, setDragging] = useState(null),
    [assumptions, setAssumptions] = useState({
      people: 10,
      days: 3,
      recipient: "",
    });
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
    function esc(e) {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
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
  const hasFilters = Boolean(query.trim()) || cat !== "すべて";
  function resetFilters() {
    Q("");
    C("すべて");
  }
  const shelfView = useRef(null),
    scrollToNew = useRef(false);
  const racks = plan.rows.length / cfg.levels;
  useEffect(() => {
    Z(1);
    if (scrollToNew.current && shelfView.current) {
      shelfView.current.scrollLeft = shelfView.current.scrollWidth;
      scrollToNew.current = false;
    }
  }, [racks, cfg.width, cfg.height, cfg.levels]);
  const lastRackCount = plan.rows
    .slice(-cfg.levels)
    .reduce((sum, row) => sum + row.length, 0);
  function removeRack() {
    if (racks <= 1) return;
    changePlan({ ...plan, rows: plan.rows.slice(0, -cfg.levels) });
    D(null);
    notify("右端の棚を1台減らしました");
  }
  const maxZoom = Math.max(3, racks);
  const rowLabel = (i) =>
    (racks > 1 ? "棚" + (Math.floor(i / cfg.levels) + 1) + "・" : "") +
    ((i % cfg.levels) + 1) +
    "段目";
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
    e.dataTransfer.setData(
      "application/x-stock-planner",
      JSON.stringify(payload),
    );
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
  ];
  const catalog = (
    <CatalogPanel expanded={page === "catalog"}>
      <div className="panelheading">
        <h2>
          <LibraryBig />
          {page === "catalog" ? "製品を探す" : "製品カタログ"}
        </h2>
        <span className="tinycount" role="status">
          {hasFilters ? visible.length + " / " : ""}
          {products.length} 製品
        </span>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={16} />
          <input
            type="search"
            aria-label="製品名・品番・内容物で検索"
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
      {hasFilters && (
        <button type="button" className="filterReset" onClick={resetFilters}>
          <X size={14} />
          絞り込みを解除
        </button>
      )}
      <div className="productlist">
        {visible.map((p) => (
          <article
            draggable={page === "shelf"}
            onDragStart={(e) => {
              if (page === "shelf") drag(e, { id: p.id });
            }}
            key={p.id}
            className="product"
            style={page === "catalog" ? { "--pack-color": p.color } : undefined}
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
                <small>
                  {p.id}{" "}
                  {p.discontinued && (
                    <span className="sale-ended">販売終了</span>
                  )}
                </small>
                <strong>{p.name}</strong>
                <b>
                  {p.discontinued && "最終掲載価格 "}¥{money(p.price)}
                </b>
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
                  title={p.name + "を" + quantity(p.id) + "セット追加"}
                  aria-label={p.name + "を棚に追加"}
                  onClick={() => {
                    const qty = quantity(p.id);
                    commit(
                      add(plan, p.id, qty),
                      p.name + "を" + qty + "セット追加しました",
                    );
                  }}
                >
                  棚に追加
                </button>
              </div>
            )}
          </article>
        ))}
        {!visible.length && (
          <p className="empty">
            一致する製品がありません。品番や内容物の一部でも検索できます。
          </p>
        )}
      </div>
    </CatalogPanel>
  );
  return (
    <div
      className={"app" + (compact ? " compactNav" : "")}
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
        <button
          className="sidebarSwitch"
          onClick={toggleSidebar}
          aria-expanded={!compact}
          aria-controls="planner-nav"
          aria-label={compact ? "メニューを広げる" : "メニューを折りたたむ"}
          title={compact ? "メニューを広げる" : "メニューを折りたたむ"}
        >
          {compact ? (
            <PanelLeftOpen size={18} />
          ) : (
            <>
              <PanelLeftClose size={18} />
              折りたたむ
            </>
          )}
        </button>
        <nav id="planner-nav" aria-label="メインメニュー">
          {links.map(([id, I, label]) => (
            <button
              key={id}
              aria-label={label}
              aria-current={page === id ? "page" : undefined}
              title={compact ? label : undefined}
              className={page === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <I size={18} />
              {!compact && label}
            </button>
          ))}
        </nav>
        <div className="sidebarfoot">
          <button
            aria-label="使い方ガイド"
            title={compact ? "使い方ガイド" : undefined}
            onClick={() => {
              N(false);
              D({ type: "help" });
            }}
          >
            <CircleHelp size={17} />
            {!compact && "使い方ガイド"}
          </button>
        </div>
      </aside>
      <main>
        <div className="body">
          <div className="title">
            <button
              className="menubtn"
              aria-label="メニュー"
              onClick={() => N(true)}
            >
              <Menu />
            </button>
            <div>
              <div className="pageHeading">
                <h1>{titles[page]}</h1>
                <button
                  className="pageHelp"
                  aria-label={titles[page] + "の使い方"}
                  title="このページの使い方"
                  onClick={() => D({ type: "help", pageOnly: true })}
                >
                  <CircleHelp size={17} />
                  <span>この画面の使い方</span>
                </button>
              </div>
              <p>{descriptions[page]}</p>
            </div>
          </div>
          {page === "diagnosis" ? (
            <Diagnosis
              assumptions={assumptions}
              onAssumptions={updateAssumptions}
              onApply={applyDiagnosis}
            />
          ) : page === "width" ? (
            <WidthCalculator />
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
                    "inventory",
                  ],
                  [
                    ChartNoAxesColumnIncreasing,
                    "棚の使用率",
                    stats.fill,
                    "%",
                    "green",
                    "capacity",
                  ],
                  [
                    ReceiptText,
                    "概算見積もり",
                    "¥" + money(stats.price),
                    "",
                    "orange",
                    "estimate",
                  ],
                  [Boxes, "内容物の内訳", null, "", "purple", "items"],
                ].map(([I, label, value, unit, color, target]) => {
                  const Tile = target ? "button" : "div";
                  return (
                    <Tile
                      className={
                        "metricTile" +
                        (target === "items" ? " detailsTile" : "")
                      }
                      key={label}
                      onClick={!target ? undefined : () => D({ type: target })}
                    >
                      <span className={"metricicon " + color}>
                        <I size={18} />
                      </span>
                      <span className="metriclabel">{label}</span>
                      {target === "items" ? (
                        <ChevronRight className="metricArrow" size={15} />
                      ) : (
                        <strong>
                          {value} <small>{unit}</small>
                        </strong>
                      )}
                    </Tile>
                  );
                })}
                <button
                  className="proposalAction"
                  onClick={() => D({ type: "proposal" })}
                >
                  <FileText size={20} />
                  資料を作成
                </button>
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
                    <div className="rackActions">
                      <TierControl plan={plan} commit={commit} />
                      <div
                        className="tier-control rackCountGroup"
                        role="group"
                        aria-label="棚の台数"
                      >
                        <button
                          aria-label="棚を減らす"
                          title="右端の棚を減らす"
                          aria-disabled={racks <= 1}
                          onClick={(e) =>
                            lastRackCount
                              ? racks > 1 &&
                                D({
                                  type: "removeRack",
                                  invoker: e.currentTarget,
                                })
                              : removeRack()
                          }
                        >
                          <Minus size={15} />
                        </button>
                        <b aria-live="polite" aria-atomic="true">
                          {racks} 台
                        </b>
                        <button
                          aria-label="棚を追加"
                          title="棚を追加"
                          onClick={() => {
                            scrollToNew.current = true;
                            changePlan({
                              ...plan,
                              rows: [
                                ...plan.rows,
                                ...Array.from({ length: cfg.levels }, () => []),
                              ],
                            });
                            notify("右側に棚を1台追加しました");
                          }}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="shelftools">
                    <button onClick={undo} disabled={!history.current.length}>
                      <Undo2 size={14} />
                      ひとつ前に戻る
                    </button>
                    <button
                      onClick={(e) =>
                        stats.count > 0 &&
                        D({ type: "clear", invoker: e.currentTarget })
                      }
                      aria-disabled={!stats.count}
                    >
                      <Trash2 size={14} />
                      棚を空にする
                    </button>
                    <button
                      onClick={(e) =>
                        D({ type: "reset", invoker: e.currentTarget })
                      }
                    >
                      <RotateCcw size={14} />
                      リセット
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
                    <div
                      style={{
                        "--ratio": cfg.width / cfg.height,
                        "--zoom": zoom,
                      }}
                      className={
                        "shelfscroll fitCanvas" +
                        (racks > 1 ? " multiRack" : "")
                      }
                      ref={shelfView}
                      tabIndex={racks > 1 ? 0 : undefined}
                      aria-label={
                        racks > 1
                          ? "横並びの棚。横方向にスクロールできます"
                          : undefined
                      }
                    >
                      <div className="rackStrip">
                        {Array.from({ length: racks }, (_, rackIndex) => (
                          <div
                            className="diagram"
                            key={rackIndex}
                            style={{
                              "--ratio": cfg.width / cfg.height,
                              "--fit-ratio":
                                cfg.width / ((2 * cfg.height) / cfg.levels),
                              "--zoom": zoom,
                            }}
                          >
                            {racks === 1 && (
                              <div className="widthmeasure">
                                <Dimension
                                  axis="width"
                                  plan={plan}
                                  commit={commit}
                                />
                              </div>
                            )}
                            <div className="rack">
                              {plan.rows
                                .slice(
                                  rackIndex * cfg.levels,
                                  (rackIndex + 1) * cfg.levels,
                                )
                                .map((row, tier) => {
                                  const i = rackIndex * cfg.levels + tier;
                                  return (
                                    <div
                                      key={i}
                                      data-row={i}
                                      className={
                                        "bay " + (hover === i ? "over" : "")
                                      }
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        H(i);
                                      }}
                                      onDragLeave={() => H(null)}
                                      onDrop={(e) => drop(e, i)}
                                    >
                                      <span className="rownum">
                                        {String(tier + 1).padStart(2, "0")}
                                      </span>
                                      <div className="shelfinside">
                                        {row.map((id, j) => {
                                          const p = lookup[id];
                                          return (
                                            <button
                                              key={j}
                                              className="spine"
                                              aria-pressed={selection.some(
                                                (v) =>
                                                  v.row === i && v.index === j,
                                              )}
                                              data-index={j}
                                              onPointerDown={(e) =>
                                                touchStart(e, {
                                                  row: i,
                                                  index: j,
                                                })
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
                                              onClick={(event) => {
                                                if (
                                                  event.detail &&
                                                  event.currentTarget.getBoundingClientRect()
                                                    .width < 44 &&
                                                  (["touch", "pen"].includes(
                                                    event.nativeEvent
                                                      .pointerType,
                                                  ) ||
                                                    matchMedia(
                                                      "(pointer: coarse)",
                                                    ).matches)
                                                ) {
                                                  event.currentTarget.focus({
                                                    preventScroll: true,
                                                  });
                                                  setPicker({
                                                    row: i,
                                                    index: j,
                                                  });
                                                } else toggleSelection(i, j);
                                              }}
                                              style={{
                                                width:
                                                  (p.w / cfg.width) * 100 + "%",
                                                height:
                                                  (p.h /
                                                    (cfg.height / cfg.levels)) *
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
                                  );
                                })}
                            </div>
                            {racks > 1 && (
                              <span className="rackLabel">
                                棚 {rackIndex + 1}
                              </span>
                            )}
                            {racks === 1 && (
                              <div className="heightmeasure">
                                <Dimension
                                  axis="height"
                                  plan={plan}
                                  commit={commit}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="zoom">
                      <button
                        title="縮小"
                        disabled={zoom <= 0.6}
                        onClick={() =>
                          Z((v) => Math.max(0.6, +(v / 1.25).toFixed(1)))
                        }
                      >
                        <Minus size={13} />
                      </button>
                      <button
                        title="棚1台の縦横が収まる倍率に戻す"
                        onClick={() => Z(1)}
                      >
                        {zoom === 1 ? "1台全体" : Math.round(zoom * 100) + "%"}
                      </button>
                      <button
                        title="拡大"
                        disabled={zoom >= maxZoom}
                        onClick={() =>
                          Z((v) => Math.min(maxZoom, +(v * 1.25).toFixed(1)))
                        }
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  {racks > 1 && (
                    <div className="canvasfoot">
                      <Dimension axis="width" plan={plan} commit={commit} />
                      <Dimension axis="height" plan={plan} commit={commit} />
                    </div>
                  )}
                  {racks > 1 && (
                    <div className="rackNav">
                      <button
                        aria-label="左の棚へ"
                        onClick={() =>
                          shelfView.current.scrollBy({
                            left:
                              -shelfView.current.querySelector(".diagram")
                                .offsetWidth - 24,
                            behavior: "smooth",
                          })
                        }
                      >
                        ←
                      </button>
                      <button
                        aria-label="右の棚へ"
                        onClick={() =>
                          shelfView.current.scrollBy({
                            left:
                              shelfView.current.querySelector(".diagram")
                                .offsetWidth + 24,
                            behavior: "smooth",
                          })
                        }
                      >
                        →
                      </button>
                    </div>
                  )}
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
                            {rowLabel(i)}
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
                </section>
                {catalog}
              </div>
            </>
          )}
        </div>
        <footer className="siteNotice">
          <strong>備蓄プランナーについて</strong>
          <p>
            本サイトはキングジム製品を対象とした非公式のシミュレーターです。株式会社キングジムによる運営・監修はありません。
          </p>
          <p>掲載する会社名・製品名などの商標は、各権利者に帰属します。</p>
        </footer>
      </main>
      {picker && (
        <SpinePicker
          {...picker}
          items={plan.rows[picker.row]}
          lookup={lookup}
          selection={selection}
          toggle={toggleSelection}
          close={() => setPicker(null)}
        />
      )}
      {dialog?.type === "proposal" ? (
        <ProposalDialog
          plan={plan}
          assumptions={assumptions}
          onAssumptions={updateAssumptions}
          onClose={() => D(null)}
          onNotify={notify}
        />
      ) : ["removeRack", "clear", "reset"].includes(dialog?.type) ? (
        <ShelfConfirmation
          invoker={dialog.invoker}
          title={
            dialog.type === "removeRack"
              ? `棚 ${racks} を取り外しますか？`
              : dialog.type === "reset"
                ? "棚を初期設定に戻しますか？"
                : "棚を空にしますか？"
          }
          description={
            dialog.type === "removeRack"
              ? `この棚にある${lastRackCount}セットも配置から取り出します。`
              : dialog.type === "reset"
                ? `配置を空にし、幅 ${money(defaultConfig.width)} × 高さ ${defaultConfig.height} mm、${defaultConfig.levels}段の棚1台に戻します。`
                : `配置中の${stats.count}セットをすべて取り出します。棚の寸法と段数は引き続き使えます。`
          }
          action={
            dialog.type === "removeRack"
              ? "棚を取り外す"
              : dialog.type === "reset"
                ? "リセットする"
                : "すべて取り出す"
          }
          onCancel={() => D(null)}
          onConfirm={() => {
            if (dialog.type === "removeRack") {
              removeRack();
              return;
            }
            const reset = dialog.type === "reset";
            changePlan(
              reset
                ? emptyDefaultPlan()
                : { ...plan, rows: plan.rows.map(() => []) },
            );
            if (reset) {
              Z(1);
              shelfView.current?.scrollTo(0, 0);
            }
            D(null);
            notify(reset ? "棚を初期設定に戻しました" : "棚を空にしました");
          }}
        />
      ) : dialog?.type === "help" ? (
        <Guide
          initialTab={page}
          pageTitle={dialog.pageOnly ? titles[page] : undefined}
          onClose={() => D(null)}
        />
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
