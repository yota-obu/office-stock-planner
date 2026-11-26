import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { summarizeContents } from "./content-info.js";
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

const paper = { width: 210, height: 297 };
const accent = "#315344";
const nf = (n) => Number(n).toLocaleString("ja-JP");
const tableX = 12;
function pageModel() {
  const nodes = [];
  return {
    nodes,
    text(text, x, y, w, h, size, opts = {}) {
      nodes.push({
        kind: "text",
        text: String(text),
        x,
        y,
        w,
        h,
        size,
        ...opts,
      });
    },
    rect(x, y, w, h, color) {
      nodes.push({ kind: "rect", x, y, w, h, color });
    },
    image(src, x, y, w, h) {
      nodes.push({ kind: "image", src, x, y, w, h });
    },
    table(x, y, widths, rows, rowH, opts = {}) {
      nodes.push({ kind: "table", x, y, widths, rows, rowH, ...opts });
    },
  };
}
function heading(page, title, date, appendix = false) {
  page.rect(0, 0, 210, 3, accent);
  page.text("防災備蓄プランナー", 12, 10, 100, 5, 3.4, {
    bold: true,
    color: accent,
  });
  page.text(date, 120, 10, 78, 5, 2.85, { align: "right", color: muted });
  page.text(title, 12, 20, 186, 12, appendix ? 7 : 8, { bold: true });
}
function footer(page, index, count) {
  page.rect(12, 283, 186, 0.3, line);
  page.text(
    "非公式の提案資料です。「キングジム」「KING JIM」は株式会社キングジムの商標です。",
    12,
    285,
    156,
    5,
    2.7,
    { color: muted },
  );
  page.text(`${index + 1} / ${count}`, 169, 285, 29, 5, 2.7, {
    align: "right",
    color: muted,
  });
}
function drawShelf(page, plan, imgs, x, y, w, h) {
  page.rect(x, y, w, h, "#f0f3ed");
  const { width, height, levels } = plan.config;
  const racks = Math.ceil(plan.rows.length / levels);
  const areaWidth = w - 8;
  const gap = Math.min(2, areaWidth / (5 * racks));
  const maxRackWidth = (areaWidth - gap * (racks - 1)) / racks;
  const board = Math.min(0.64, maxRackWidth * 0.04);
  const scale = Math.min(
    (maxRackWidth - board * 2) / width,
    (h - 6 - board * (levels + 1)) / height,
  );
  const bayWidth = width * scale;
  const bayHeight = (height / levels) * scale;
  const rackWidth = bayWidth + board * 2;
  const rackHeight = height * scale + board * (levels + 1);
  const left = x + (w - racks * rackWidth - (racks - 1) * gap) / 2;
  const top = y + (h - rackHeight) / 2;
  plan.rows.forEach((row, i) => {
    const l = left + Math.floor(i / levels) * (rackWidth + gap);
    const tier = i % levels;
    if (tier === 0) page.rect(l, top, rackWidth, rackHeight, "#788774");
    const rTop = top + board + tier * (board + bayHeight);
    page.rect(l + board, rTop, bayWidth, bayHeight, "#dce3d6");
    let offset = l + board;
    for (const id of row) {
      const p = byId(id);
      page.image(
        imgs.get(id),
        offset,
        rTop + bayHeight - p.h * scale,
        p.w * scale,
        p.h * scale,
      );
      offset += p.w * scale;
    }
  });
}
function proposalPages(plan, stats, imgs, { recipient, people, days }) {
  const date = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
  const page = pageModel(),
    pages = [page];
  const { width, height, depth, levels } = plan.config;
  heading(page, "防災備蓄 配置提案書", date);
  const recipientName = String(recipient || "")
    .trim()
    .replace(/\s*御中\s*$/u, "");
  if (recipientName)
    page.text(recipientName + " 御中", 12, 34, 186, 7, 4.4, { bold: true });
  page.text(
    `計画条件　${nf(people)}人 × ${nf(days)}日間`,
    12,
    43,
    186,
    6,
    3.45,
    { color: muted },
  );
  page.rect(12, 53, 186, 0.35, line);
  page.text("棚の配置図", 12, 57, 100, 7, 4.5, { bold: true });
  drawShelf(page, plan, imgs, 12, 67, 109, 48);
  page.text(
    `1台の内寸  幅 ${nf(width)} × 高さ ${nf(height)} × 奥行 ${nf(depth)} mm  /  ${levels}段 × ${Math.ceil(plan.rows.length / levels)}台`,
    12,
    116,
    109,
    6,
    2.85,
    { color: muted },
  );
  page.text("配置したセット数", 130, 68, 67, 5, 3.0, { color: muted });
  page.text(`${nf(stats.count)} セット`, 130, 74, 67, 9, 5.8, { bold: true });
  page.text(
    `棚幅の使用率 ${stats.fill}%　内容物 ${nf(stats.items.length)}種類`,
    130,
    86,
    68,
    5,
    2.9,
    { color: muted },
  );
  page.rect(129, 96, 69, 23, accent);
  page.text("概算合計（税込）", 133, 99, 61, 5, 3.1, { color: "#e6eee4" });
  page.text(yen(stats.price), 133, 105, 61, 11, 6.4, {
    bold: true,
    color: "#ffffff",
    align: "right",
  });
  page.text("製品別の見積明細", 12, 128, 160, 7, 4.5, { bold: true });
  const estimateRows = [
    ["製品名", "品番", "税込単価", "数量", "税込小計"],
    ...stats.lines.map(({ product: p, count }) => [
      p.name + (p.discontinued ? " ※" : ""),
      p.id,
      yen(p.price),
      nf(count),
      yen(p.price * count),
    ]),
  ];
  page.table(
    tableX,
    139,
    [78, 31, 27, 18, 32],
    estimateRows,
    Math.min(8.5, 124 / estimateRows.length),
    { numeric: [2, 3, 4], size: 2.85 },
  );
  if (!stats.count)
    page.text("棚に配置した製品はありません。", 15, 150, 180, 6, 3.3, {
      color: muted,
    });
  page.text(
    "棚に配置した製品の税込単価で計算しています。送料は含みません。",
    12,
    268,
    186,
    5,
    2.9,
    { color: muted },
  );
  if (stats.lines.some(({ product }) => product.discontinued))
    page.text(
      "※ 販売終了品の金額は最終掲載時の価格です。",
      12,
      274,
      186,
      5,
      2.85,
      { color: muted },
    );
  const contents = summarizeContents(plan).flatMap((group) => group.items);
  const limit = 18;
  for (let i = 0; i < Math.max(contents.length, 1); i += limit) {
    const appendix = pageModel();
    pages.push(appendix);
    heading(appendix, "備蓄品の内容と用途", date, true);
    appendix.text(
      `配置した ${nf(stats.count)} セットに含まれる ${nf(stats.items.length)} 品目`,
      12,
      35,
      186,
      7,
      3.7,
      { color: muted },
    );
    appendix.text(
      "数量は同梱単位で集計しています。袋内の枚数・本数は品目名に記載しています。",
      12,
      46,
      186,
      6,
      3.05,
      { color: muted },
    );
    const items = contents.slice(i, i + limit);
    const itemRows = [
      ["品目", "主な用途・内容", "数量"],
      ...items.map(({ name, count, unit, description }) => [
        name,
        description,
        `${nf(count)} ${unit}`,
      ]),
    ];
    appendix.table(tableX, 58, [58, 105, 23], itemRows, 10.8, {
      numeric: [2],
      size: 3.1,
    });
    if (!items.length)
      appendix.text(
        "棚に配置した製品を追加すると、内容物の内訳が表示されます。",
        15,
        76,
        180,
        6,
        3.5,
        { color: muted },
      );
  }
  pages.forEach((p, i) => footer(p, i, pages.length));
  return pages;
}
const fontStack = "'Hiragino Sans','Yu Gothic',Meiryo,sans-serif";
function paintText(ctx, node) {
  const { x, y, w, h, text, size, color = ink, bold, align = "left" } = node;
  ctx.font = `${bold ? "700" : "400"} ${size}px ${fontStack}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(
    text,
    x + (align === "right" ? w : align === "center" ? w / 2 : 0),
    y + h / 2,
    w,
  );
}
function paintTable(ctx, node) {
  const { x, y, widths, rows, rowH, size, numeric } = node;
  const tableW = widths.reduce((sum, n) => sum + n, 0);
  rows.forEach((row, r) => {
    const top = y + r * rowH;
    ctx.fillStyle = r === 0 ? "#e3eae3" : r % 2 === 0 ? "#f7f9f6" : "#ffffff";
    ctx.fillRect(x, top, tableW, rowH);
    ctx.fillStyle = line;
    ctx.fillRect(x, top + rowH - 0.15, tableW, 0.15);
    let left = x;
    row.forEach((cell, c) => {
      paintText(ctx, {
        x: left + 1.7,
        y: top,
        w: widths[c] - 3.4,
        h: rowH,
        size,
        text: cell,
        bold: r === 0,
        color: r === 0 ? accent : ink,
        align: numeric.includes(c) ? "right" : "left",
      });
      left += widths[c];
    });
  });
}
async function pdfFile(pages, filename) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ format: "a4", unit: "mm", compress: true });
  pdf.setProperties({
    title: "防災備蓄 配置提案書",
    creator: "防災備蓄プランナー",
  });
  const canvas = document.createElement("canvas"),
    scale = 9;
  canvas.width = paper.width * scale;
  canvas.height = paper.height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  pages.forEach((p, i) => {
    if (i) pdf.addPage();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 210, 297);
    for (const n of p.nodes) {
      if (n.kind === "rect") {
        ctx.fillStyle = n.color;
        ctx.fillRect(n.x, n.y, n.w, n.h);
      } else if (n.kind === "image") ctx.drawImage(n.src, n.x, n.y, n.w, n.h);
      else if (n.kind === "text") paintText(ctx, n);
      else paintTable(ctx, n);
    }
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      210,
      297,
      undefined,
      "FAST",
    );
  });
  await pdf.save(filename + ".pdf", { returnPromise: true });
}
const inch = (mm) => mm / 25.4,
  pt = (mm) => inch(mm) * 72,
  hex = (color) => color.slice(1);
function powerTable(slide, n) {
  const rows = n.rows.map((row, r) =>
    row.map((text, c) => ({
      text,
      options: {
        align: n.numeric.includes(c) ? "right" : "left",
        bold: r === 0,
        color: hex(r === 0 ? accent : ink),
        fill: hex(r === 0 ? "#e3eae3" : r % 2 === 0 ? "#f7f9f6" : "#ffffff"),
      },
    })),
  );
  slide.addTable(rows, {
    x: inch(n.x),
    y: inch(n.y),
    w: inch(n.widths.reduce((a, b) => a + b)),
    h: inch(n.rowH * rows.length),
    colW: n.widths.map(inch),
    rowH: inch(n.rowH),
    fontFace: "Yu Gothic",
    fontSize: pt(n.size),
    margin: [0, inch(1.7), 0, inch(1.7)],
    border: [
      { pt: 0, color: "FFFFFF" },
      { pt: 0, color: "FFFFFF" },
      { pt: 0.4, color: hex(line) },
      { pt: 0, color: "FFFFFF" },
    ],
    autoPage: false,
    valign: "middle",
    paraSpaceAfter: 0,
    paraSpaceBefore: 0,
  });
}
async function powerFile(pages, filename) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const ppt = new PptxGenJS();
  ppt.author = "防災備蓄プランナー";
  ppt.title = "防災備蓄 配置提案書";
  ppt.defineLayout({ name: "A4", width: inch(210), height: inch(297) });
  ppt.layout = "A4";
  ppt.theme = {
    headFontFace: "Yu Gothic",
    bodyFontFace: "Yu Gothic",
    lang: "ja-JP",
  };
  const images = new Map();
  for (const p of pages) {
    const slide = ppt.addSlide();
    for (const n of p.nodes) {
      if (n.kind === "table") {
        powerTable(slide, n);
        continue;
      }
      const bounds = { x: inch(n.x), y: inch(n.y), w: inch(n.w), h: inch(n.h) };
      if (n.kind === "text")
        slide.addText(n.text, {
          ...bounds,
          fontFace: "Yu Gothic",
          fontSize: pt(n.size),
          color: hex(n.color || ink),
          bold: !!n.bold,
          align: n.align || "left",
          valign: "mid",
          breakLine: false,
          margin: 0,
          paraSpaceAfter: 0,
          wrap: false,
          fit: "shrink",
          lang: "ja-JP",
        });
      else if (n.kind === "rect")
        slide.addShape(ppt.ShapeType.rect, {
          ...bounds,
          rectRadius: 0,
          line: { transparency: 100 },
          fill: { color: hex(n.color) },
        });
      else {
        if (!images.has(n.src)) {
          const c = document.createElement("canvas");
          c.width = n.src.naturalWidth;
          c.height = n.src.naturalHeight;
          c.getContext("2d").drawImage(n.src, 0, 0);
          images.set(n.src, c.toDataURL("image/png"));
        }
        slide.addImage({
          ...bounds,
          data: images.get(n.src),
          altText: n.src.alt || "防災セットの背表紙",
        });
      }
    }
  }
  await ppt.writeFile({ fileName: filename + ".pptx", compression: true });
}
export async function createProposal(plan, assumptions = {}, format = "pdf") {
  const stats = summarize(plan),
    imgs = await shelfImages(stats.lines);
  const opts = {
    ...assumptions,
    people: assumptions.people || 10,
    days: assumptions.days || 3,
  };
  const pages = proposalPages(plan, stats, imgs, opts);
  const safe = String(opts.recipient || "")
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/gu, "")
    .slice(0, 60);
  const name = (safe ? safe + "_" : "") + "防災備蓄_配置提案書";
  if (format === "pptx") return powerFile(pages, name);
  return pdfFile(pages, name);
}
