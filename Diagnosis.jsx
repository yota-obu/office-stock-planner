import React, { useState } from "react";
import {
  ArrowRight,
  UsersRound,
  CalendarDays,
  Utensils,
  Droplets,
  HandHeart,
  BedDouble,
  HardHat,
  Check,
  ListChecks,
  ChevronDown,
  ExternalLink,
  Toilet,
} from "lucide-react";
import { products } from "./catalog.js";
import ProductArt from "./ProductArt.jsx";
import "./diagnosis.css";

const catalog = Object.fromEntries(products.map((p) => [p.id, p]));
const format = (n) => n.toLocaleString("ja-JP");
const countItem = (id, name) =>
  catalog[id].items.find(([label]) => label === name)?.[1] ?? 0;
const options = [
  {
    key: "food",
    label: "食料",
    note: "日数に応じた備蓄セット",
    Icon: Utensils,
  },
  { key: "water", label: "飲料水", note: "必要量と追加備蓄量", Icon: Droplets },
  {
    key: "toilet",
    label: "簡易トイレ",
    note: "使用回数から換算",
    Icon: Toilet,
  },
  {
    key: "hygiene",
    label: "衛生用品",
    note: "からだ拭き・歯磨きなど",
    Icon: HandHeart,
  },
  {
    key: "rest",
    label: "防寒・休息",
    note: "毛布を一人に一枚",
    Icon: BedDouble,
  },
  {
    key: "helmet",
    label: "頭部の保護",
    note: "ヘルメットを人数分",
    Icon: HardHat,
  },
];
const defaultNeeds = ["food", "water", "toilet"];
const basicToilet = "非常用簡易トイレ";
function toiletYield(id) {
  const pairs = [
    ["汚物収納袋", "抗菌性凝固剤"],
    ["汚物収納袋（黒）", "抗菌性消臭凝固剤"],
  ];
  return (
    countItem(id, basicToilet) +
    pairs.reduce(
      (sum, [bag, powder]) =>
        sum + Math.min(countItem(id, bag), countItem(id, powder)),
      0,
    )
  );
}
export function calculateDiagnosis(people, days, needs) {
  const lines = [];
  function add(id, qty) {
    if (qty > 0) lines.push({ id, qty });
  }
  if (needs.includes("food")) {
    add("BCS-300", people * Math.floor(days / 3));
    add("BCS-200", people * (days % 3));
  }
  if (needs.includes("water") && !needs.includes("food"))
    add("MNS-200", people);
  if (needs.includes("hygiene")) add("HGS-200", people);
  if (needs.includes("rest")) add("ABS-200", people);
  if (needs.includes("helmet")) add("HMS-200", people);
  const suppliedToilets = () =>
    lines.reduce((n, { id, qty }) => n + toiletYield(id) * qty, 0);
  const toiletTarget = needs.includes("toilet") ? people * days * 5 : 0;
  const shortfall = Math.max(0, toiletTarget - suppliedToilets());
  if (shortfall) {
    const small = toiletYield("TLS-300"),
      large = toiletYield("TLS-400");
    // 100-use boxes are cheaper per use. Compare the two ways to cover the remainder.
    const full = Math.floor(shortfall / large),
      remainder = shortfall % large;
    const smallBoxes = Math.ceil(remainder / small);
    const extraLarge =
      smallBoxes * catalog["TLS-300"].price > catalog["TLS-400"].price;
    add("TLS-400", full + Number(extraLarge));
    add("TLS-300", extraLarge ? 0 : smallBoxes);
  }
  const water = lines.reduce(
    (n, { id, qty }) => n + (qty * countItem(id, "保存水（500mL）")) / 2,
    0,
  );
  return {
    lines,
    water,
    waterTarget: needs.includes("water") ? people * days * 3 : 0,
    toiletTarget,
    toilets: suppliedToilets(),
    qty: lines.reduce((n, l) => n + l.qty, 0),
    price: lines.reduce((n, l) => n + l.qty * catalog[l.id].price, 0),
  };
}

export default function Diagnosis({ assumptions, onAssumptions, onApply }) {
  const { people = 10, days = 3, needs = defaultNeeds } = assumptions;
  const [editing, setEditing] = useState({});
  const [placementError, setPlacementError] = useState(null);
  const selection = JSON.stringify([people, days, needs]);
  const plan = calculateDiagnosis(people, days, needs);
  const invalid = Object.values(editing).some((x) => x === "");
  const toggled = (key) =>
    onAssumptions({
      needs: needs.includes(key)
        ? needs.filter((n) => n !== key)
        : [...needs, key],
    });
  const numberField = (key, title, Icon, value, unit, max) => (
    <label className="dg-number">
      <span>
        <Icon size={16} />
        {title}
      </span>
      <div>
        <input
          type="number"
          aria-label={title}
          min="1"
          max={max}
          step="1"
          value={editing[key] ?? value}
          onChange={(e) => {
            const raw = e.target.value;
            const n = Number(raw);
            if (!raw || !Number.isInteger(n) || n < 1 || n > max) {
              setEditing((prev) => ({ ...prev, [key]: "" }));
              return;
            }
            setEditing((prev) => ({ ...prev, [key]: undefined }));
            onAssumptions({ [key]: n });
          }}
          onBlur={() => setEditing((prev) => ({ ...prev, [key]: undefined }))}
        />
        <b>{unit}</b>
      </div>
    </label>
  );
  return (
    <div className="dg-layout">
      <section className="dg-form">
        <div className="dg-block">
          <h2>備蓄する人数と日数</h2>
          <div className="dg-fields">
            {numberField("people", "対象人数", UsersRound, people, "人", 9999)}
            {numberField("days", "備蓄日数", CalendarDays, days, "日", 365)}
          </div>
        </div>
        <div className="dg-block">
          <h2>備えたいもの</h2>
          <p>必要な項目を複数選べます。</p>
          <div className="dg-options">
            {options.map(({ key, label, note, Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={needs.includes(key)}
                className="dg-option"
                onClick={() => toggled(key)}
              >
                <Icon className="dg-opt-icon" size={22} strokeWidth={1.6} />
                <span>
                  <strong>{label}</strong>
                  <small>{note}</small>
                </span>
                <i>{needs.includes(key) && <Check size={12} />}</i>
              </button>
            ))}
          </div>
        </div>
        <details className="dg-basis">
          <summary>
            算出の根拠と出典
            <ChevronDown size={15} />
          </summary>
          <div>
            <p>
              食料はメーカーの想定期間で計算します。1人につき3日ごとにBCS-300を1箱、残りの日数は1日ごとにBCS-200を1箱とします。エネルギー量や個別の食事制限は別途確認してください。
            </p>
            <p>
              飲料水は1人1日3
              L、トイレは1人1日5回を目安とします。食料を選ばず飲料水を希望する場合は、保存水500
              mL入りのミニセットを1人1箱提案し、追加で必要な飲料水を表示します。選んだセットに含まれる水と簡易トイレも合算します。トイレの不足分は20回・100回セットで補います。
            </p>
            <p>
              衛生用品・毛布・ヘルメットは、選択した用途ごとに1人1セットを配布する想定です。
            </p>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://www.kantei.go.jp/jp/headline/bousai/sonae.html"
            >
              首相官邸｜飲料水の目安 <ExternalLink size={12} />
            </a>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://www.city.hiroshima.lg.jp/saigaiinfo/saigai/1021018/1025517/1049251.html"
            >
              広島市｜携帯トイレの備蓄 <ExternalLink size={12} />
            </a>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://www.kingjim.co.jp/sp/saigai_taisaku/"
            >
              キングジム｜セット内容 <ExternalLink size={12} />
            </a>
          </div>
        </details>
      </section>
      <section className="dg-result">
        <div className="dg-result-heading">
          <ListChecks size={22} />
          <h2>おすすめの備蓄プラン</h2>
        </div>
        {!needs.length ? (
          <p className="dg-empty">
            備えたいものを選ぶと、必要な製品と数量が表示されます。
          </p>
        ) : (
          <>
            <div className="dg-totals">
              <div>
                <small>必要なセット数</small>
                <b>
                  {format(plan.qty)}
                  <em>セット</em>
                </b>
              </div>
              <div>
                <small>概算金額（税込）</small>
                <b>¥{format(plan.price)}</b>
              </div>
            </div>
            <div className="dg-products">
              {plan.lines.map(({ id, qty }) => (
                <div className="dg-line" key={id}>
                  <div className="dg-art">
                    <ProductArt product={catalog[id]} />
                  </div>
                  <div>
                    <small>{id}</small>
                    <strong>{catalog[id].name}</strong>
                  </div>
                  <b>× {format(qty)}</b>
                </div>
              ))}
            </div>
            {needs.includes("water") && (
              <div className="dg-water">
                <Droplets size={18} />
                <div>
                  <strong>
                    飲料水を別途{" "}
                    {format(Math.max(plan.waterTarget - plan.water, 0))} L 確保
                  </strong>
                  <small>
                    目安 {format(plan.waterTarget)} L のうち、セット同梱分は{" "}
                    {format(plan.water)} L
                  </small>
                </div>
              </div>
            )}
            {needs.includes("toilet") && (
              <p className="dg-toilet">
                簡易トイレは目安 {format(plan.toiletTarget)}{" "}
                回に対し、セット内に {format(plan.toilets)} 回分あります。
              </p>
            )}
          </>
        )}
        {placementError?.selection === selection && (
          <p role="alert" className="dg-error">
            {placementError.message} <a href="#shelf">棚設定を確認</a>
          </p>
        )}
        <p className="dg-replace">
          配置すると、現在の棚の製品をおすすめの内容に入れ替えます。棚画面で取り消せます。
        </p>
        <button
          className="dg-apply"
          disabled={!plan.lines.length || invalid}
          onClick={() => {
            const result = onApply(plan.lines);
            if (result?.error)
              setPlacementError({ selection, message: result.error });
          }}
        >
          このプランを棚に配置 <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
