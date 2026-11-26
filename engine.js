import { products } from "./catalog.js";
export { summarizeContents } from "./content-info.js";

const lookup = new Map(products.map((product) => [product.id, product]));
export const byId = (id) => lookup.get(id);
export const used = (row) => row.reduce((width, id) => width + byId(id).w, 0);
export const defaultConfig = {
  width: 1050,
  height: 1360,
  levels: 4,
};
export const limits = {
  width: [50, 4000],
  height: [50, 4000],
  levels: [1, 5],
};

function validConfig(config) {
  return (
    config &&
    Object.entries(limits).every(
      ([key, [min, max]]) =>
        Number.isInteger(config[key]) &&
        config[key] >= min &&
        config[key] <= max,
    )
  );
}

const compatible = (product, config) =>
  product.h <= config.height / config.levels;
const rowExists = (plan, row) =>
  Number.isInteger(row) && row >= 0 && row < plan.rows.length;
export const rackCount = (plan) => plan.rows.length / plan.config.levels;
const blank = (config, racks = 1) => ({
  config: { ...config },
  rows: Array.from({ length: config.levels * racks }, () => []),
});

export function isValidPlan(plan) {
  return Boolean(
    plan &&
    validConfig(plan.config) &&
    Array.isArray(plan.rows) &&
    plan.rows.length >= plan.config.levels &&
    Number.isInteger(rackCount(plan)) &&
    plan.rows.every(
      (row) =>
        Array.isArray(row) &&
        row.every((id) => byId(id) && compatible(byId(id), plan.config)) &&
        used(row) <= plan.config.width,
    ),
  );
}

export function add(plan, id, qty = 1, row = null) {
  const product = byId(id);
  if (!product || !Number.isSafeInteger(qty) || qty < 1)
    return { plan, error: "製品と1以上の整数を指定してください。" };
  if (row !== null && !rowExists(plan, row))
    return { plan, error: "追加先の段を選んでください。" };
  if (!compatible(product, plan.config))
    return {
      plan,
      error: "製品の高さが1段の内高を超えています。棚設定をご確認ください。",
    };

  const available = plan.rows.map((ids, index) =>
    row === null || row === index
      ? Math.floor((plan.config.width - used(ids)) / product.w)
      : 0,
  );
  const capacity = available.reduce((sum, n) => sum + n, 0);
  if (capacity < qty)
    return {
      plan,
      error:
        "指定した収納先の空きは" +
        capacity +
        "セット分です。数量または棚設定を変更してください。",
    };

  let remaining = qty;
  const rows = plan.rows.map((ids, index) => {
    const n = Math.min(remaining, available[index]);
    remaining -= n;
    return n ? [...ids, ...Array(n).fill(id)] : ids;
  });
  return { plan: { ...plan, rows } };
}

export function remove(plan, row, index) {
  if (
    !rowExists(plan, row) ||
    !Number.isInteger(index) ||
    !plan.rows[row][index]
  )
    return { plan, error: "配置した製品が見つかりません。" };
  return {
    plan: {
      ...plan,
      rows: plan.rows.map((ids, i) =>
        i === row ? ids.filter((_, j) => j !== index) : ids,
      ),
    },
  };
}

export function move(plan, fromRow, index, toRow, toIndex = null) {
  const id = plan.rows[fromRow]?.[index];
  if (!id || !rowExists(plan, toRow))
    return { plan, error: "移動先の段を選んでください。" };
  const removed = remove(plan, fromRow, index);
  if (removed.error) return removed;
  const added = add(removed.plan, id, 1, toRow);
  if (added.error) return { plan, error: added.error };
  if (Number.isInteger(toIndex)) {
    const target = added.plan.rows[toRow];
    target.pop();
    target.splice(
      Math.max(
        0,
        Math.min(
          target.length,
          toIndex - (fromRow === toRow && index < toIndex ? 1 : 0),
        ),
      ),
      0,
      id,
    );
  }
  return added;
}

// With only the tier count changed, keep the existing clear height of each tier.
export function resize(plan, config, tierHeight) {
  if (
    tierHeight !== undefined ||
    (config.levels !== plan.config.levels &&
      config.height === plan.config.height)
  ) {
    const clearHeight = tierHeight ?? plan.config.height / plan.config.levels;
    config = { ...config, height: Math.round(clearHeight * config.levels) };
  }
  if (!validConfig(config))
    return { plan, error: "寸法と段数を入力範囲内の整数にしてください。" };
  const racks = rackCount(plan);
  const same = blank(config, racks);
  let displaced = false;
  plan.rows.forEach((row, i) => {
    const rack = Math.floor(i / plan.config.levels),
      tier = i % plan.config.levels;
    if (tier < config.levels) same.rows[rack * config.levels + tier] = row;
    else if (row.length) displaced = true;
  });
  if (!displaced && isValidPlan(same)) return { plan: same };
  const next = blank(config, racks);
  const ids = plan.rows.flat().sort((a, b) => byId(b).w - byId(a).w);
  const vacancies = next.rows.map(() => config.width);
  for (const id of ids) {
    const p = byId(id);
    let best = -1;
    for (let i = 0; i < vacancies.length; i++) {
      if (vacancies[i] >= p.w && (best < 0 || vacancies[i] < vacancies[best]))
        best = i;
    }
    if (best < 0 || !compatible(p, config))
      return {
        plan,
        error:
          "配置中の製品をこの寸法で自動収納できません。棚を広げるか、製品を減らしてください。",
      };
    next.rows[best].push(id);
    vacancies[best] -= p.w;
  }
  return { plan: next };
}

export function applyRecommendations(plan, lines) {
  if (!Array.isArray(lines) || !lines.length)
    return { plan, error: "配置する推奨製品がありません。" };
  const counts = new Map();
  for (const entry of lines) {
    const id = entry?.id ?? entry?.product?.id;
    const count = entry?.count ?? entry?.quantity ?? entry?.qty;
    if (!byId(id) || !Number.isSafeInteger(count) || count < 0)
      return { plan, error: "製品と推奨数量を確認してください。" };
    if (count > 0) counts.set(id, (counts.get(id) || 0) + count);
  }
  if (!counts.size)
    return { plan, error: "数量が1以上の製品を選んでください。" };
  const { width, height, levels } = plan.config;
  const tierHeight = height / levels;
  const ordered = [...counts].sort(([a], [b]) => byId(b).w - byId(a).w);
  const rows = Array.from({ length: levels }, () => []);
  const vacancies = rows.map(() => width);
  for (const [id, quantity] of ordered) {
    const product = byId(id);
    if (product.w > width || product.h > tierHeight) {
      return {
        plan,
        error:
          product.name +
          "を収納するには、内幅 " +
          product.w +
          " mm・1段の内高 " +
          product.h +
          " mm 以上が必要です。棚設定で寸法を広げてください。",
      };
    }
    let remaining = quantity;
    for (let row = 0; remaining > 0; row++) {
      if (row === rows.length) {
        for (let tier = 0; tier < levels; tier++) {
          rows.push([]);
          vacancies.push(width);
        }
      }
      const amount = Math.min(
        remaining,
        Math.floor(vacancies[row] / product.w),
      );
      if (!amount) continue;
      rows[row].push(...Array(amount).fill(id));
      vacancies[row] -= amount * product.w;
      remaining -= amount;
    }
  }
  return { plan: { config: { ...plan.config }, rows } };
}

export function emptyDefaultPlan() {
  return blank(defaultConfig);
}

export function initialPlan() {
  let plan = blank(defaultConfig);
  const choices = products.filter(
    (p) => compatible(p, defaultConfig) && p.w <= 120,
  );
  const distinct = choices.filter(
    (p, i) => choices.findIndex((v) => v.color === p.color) === i,
  );
  const samples = [
    ...distinct,
    ...choices.filter((p) => !distinct.includes(p)),
  ];
  for (const [row, widths] of [
    [0, [250, 220, 215]],
    [1, [205, 215]],
  ]) {
    widths.forEach((mm, i) => {
      const p = samples[(row * 3 + i) % samples.length];
      if (p)
        plan = add(plan, p.id, Math.max(1, Math.round(mm / p.w)), row).plan;
    });
  }
  return plan;
}

export function summarize(plan) {
  const tally = new Map();
  for (const id of plan.rows.flat()) tally.set(id, (tally.get(id) || 0) + 1);
  const lines = Array.from(tally, ([id, count]) => ({
    product: byId(id),
    count,
  }));
  const contents = new Map();
  let price = 0;
  let count = 0;
  let usedWidth = 0;
  for (const { product, count: qty } of lines) {
    count += qty;
    price += product.price * qty;
    usedWidth += product.w * qty;
    for (const [name, units] of product.items)
      contents.set(name, (contents.get(name) || 0) + units * qty);
  }
  const items = Array.from(contents, ([name, count]) => ({ name, count }));
  return {
    count,
    price,
    lines,
    items,
    itemCount: items.reduce((sum, item) => sum + item.count, 0),
    usedWidth,
    fill: Math.round(
      (100 * usedWidth) / (plan.config.width * plan.rows.length),
    ),
  };
}
