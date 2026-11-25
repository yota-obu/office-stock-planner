import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { jsPDF } from "jspdf";
import ProductArt from "./ProductArt.jsx";
import { byId, summarize } from "./engine.js";

const ink = "#1c3046";
const muted = "#526878";
const line = "#d9e2e6";
const number = (value) => value.toLocaleString("ja-JP");
const yen = (value) => "¥" + number(value);

async function shelfImages(lines) {
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        lines.map(({ product }) =>
          createElement(ProductArt, { key: product.id, product, spine: true }),
        ),
      ),
    );
    const entries = await Promise.all(
      [...host.children].map(async (svg, index) => {
        const { product } = lines[index];
        svg.setAttribute("width", String(product.w * 3));
        svg.setAttribute("height", String(product.h * 3));
        svg.removeAttribute("style");
        const xml = new XMLSerializer().serializeToString(svg);
        const image = new Image();
        image.src =
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        await image.decode();
        return [product.id, image];
      }),
    );
    return new Map(entries);
  } finally {
    root.unmount();
  }
}

export async function createProposal(plan) {
  const stats = summarize(plan);
  const images = await shelfImages(stats.lines);
  const { width, height, depth, levels } = plan.config;
  const canvas = document.createElement("canvas");
  const scale = 10;
  canvas.width = 210 * scale;
  canvas.height = 297 * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const text = (value, x, y, size, opts = {}) => {
    ctx.fillStyle = opts.color || ink;
    ctx.font =
      (opts.bold ? "700 " : "400 ") +
      size +
      "px 'Hiragino Sans','Yu Gothic',Meiryo,sans-serif";
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = "middle";
    if (opts.maxWidth) ctx.fillText(String(value), x, y, opts.maxWidth);
    else ctx.fillText(String(value), x, y);
  };
  rect(0, 0, 210, 297, "white");
  rect(0, 0, 210, 3, ink);
  rect(12, 11, 2, 6, "#d59d5a");
  text("KOKOBO  備蓄プランナー", 16, 14, 3.3, { bold: true });
  const today = new Date();
  const date = today.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  text("作成日  " + date, 198, 14, 2.9, { align: "right", color: muted });
  text("防災備蓄 配置提案書", 12, 28, 8.3, { bold: true });
  text("キングジム防災セットの収納計画・概算見積もり", 12, 39, 3.6, {
    color: muted,
  });
  rect(12, 46, 186, 0.3, line);

  text("棚の配置図", 12, 54, 4.5, { bold: true });
  text("正面図", 124, 54, 2.9, { color: muted, align: "right" });
  rect(12, 61, 112, 54, "#f3f5f4");
  const board = 0.65;
  const ratio = Math.min(
    (106 - 2 * board) / width,
    (49 - (levels + 1) * board) / height,
  );
  const innerWidth = width * ratio;
  const bayHeight = (height / levels) * ratio;
  const rackWidth = innerWidth + 2 * board;
  const rackHeight = height * ratio + (levels + 1) * board;
  const left = 68 - rackWidth / 2;
  const top = 88 - rackHeight / 2;
  rect(left, top, rackWidth, rackHeight, "#715e4d");
  plan.rows.forEach((row, index) => {
    const bayTop = top + board + index * (bayHeight + board);
    rect(left + board, bayTop, innerWidth, bayHeight, "#e5dccf");
    let x = left + board;
    for (const id of row) {
      const product = byId(id);
      ctx.drawImage(
        images.get(id),
        x,
        bayTop + bayHeight - product.h * ratio,
        product.w * ratio,
        product.h * ratio,
      );
      x += product.w * ratio;
    }
  });
  text(
    "内寸  幅 " +
      number(width) +
      " × 高さ " +
      number(height) +
      " × 奥行 " +
      number(depth) +
      " mm",
    12,
    120,
    3,
    { color: muted, maxWidth: 112 },
  );
  text("収納計画", 132, 54, 4.5, { bold: true });
  const metrics = [
    ["収納セット数", number(stats.count) + " セット"],
    ["棚の使用率（横幅）", stats.fill + " %"],
    ["棚の段数", levels + " 段"],
    ["内容物の合計", number(stats.itemCount) + " 点"],
  ];
  metrics.forEach(([label, value], index) => {
    const y = 65 + index * 9;
    text(label, 132, y, 3.1, { color: muted });
    text(value, 198, y, 3.6, { align: "right", bold: true });
    rect(132, y + 4.3, 66, 0.2, line);
  });
  rect(132, 101, 66, 20, ink);
  text("概算合計（税込）", 136, 106, 2.8, { color: "#e1e7ec" });
  text(yen(stats.price), 194, 114, 6.1, {
    color: "#ffffff",
    align: "right",
    bold: true,
  });

  text("製品別の見積明細", 12, 133, 4.5, { bold: true });
  text(stats.lines.length + " 製品", 198, 133, 3.2, {
    align: "right",
    color: muted,
  });
  rect(12, 139, 186, 7.4, "#e9eff1");
  const cols = [15, 84, 139, 159, 195];
  ["製品名", "品番", "税込単価", "数量", "税込小計"].forEach((label, i) =>
    text(label, cols[i], 142.7, 2.8, {
      bold: true,
      align: i > 1 ? "right" : "left",
    }),
  );
  const rowHeight = Math.min(8.2, 121 / Math.max(1, stats.lines.length));
  stats.lines.forEach(({ product, count }, i) => {
    const y = 146.4 + rowHeight * (i + 0.5);
    text(product.name + (product.discontinued ? " ※" : ""), cols[0], y, 3, {
      maxWidth: 66.5,
    });
    text(product.id, cols[1], y, 2.85, { color: muted, maxWidth: 28 });
    text(yen(product.price), cols[2], y, 3, { align: "right" });
    text(number(count), cols[3], y, 3, { align: "right" });
    text(yen(product.price * count), cols[4], y, 3, {
      align: "right",
      bold: true,
    });
    rect(12, y + rowHeight / 2, 186, 0.16, line);
  });
  if (!stats.count)
    text("配置済みの製品はありません。", 15, 152, 3.2, { color: muted });
  rect(12, 273, 186, 0.3, line);
  text(
    "金額は掲載時の税込単価による概算です。送料は別途ご確認ください。",
    12,
    279,
    2.85,
    { color: muted },
  );
  if (stats.lines.some(({ product }) => product.discontinued))
    text("※ 販売終了品には最終掲載価格を使用しています。", 12, 284, 2.85, {
      color: muted,
    });
  text("KOKOBO  備蓄プランナー", 12, 291, 2.7, { color: muted });
  text("1 / 1", 198, 291, 2.7, { color: muted, align: "right" });

  const documentPdf = new jsPDF({ format: "a4", unit: "mm", compress: true });
  documentPdf.setProperties({
    title: "防災備蓄 配置提案書",
    creator: "KOKOBO 備蓄プランナー",
  });
  documentPdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    0,
    0,
    210,
    297,
    undefined,
    "FAST",
  );
  await documentPdf.save("防災備蓄_配置提案書.pdf", { returnPromise: true });
}
