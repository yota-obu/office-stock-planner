import React, { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { limits, resize, rackCount } from "./engine.js";
import "./shelf-controls.css";

export function TierControl({ plan, commit }) {
  const { levels } = plan.config;
  function adjust(delta) {
    commit(
      resize(plan, { ...plan.config, levels: levels + delta }),
      "段数を変更しました",
    );
  }
  return (
    <div className="tier-control">
      <button
        aria-label="段を減らす"
        disabled={levels <= limits.levels[0]}
        onClick={() => adjust(-1)}
      >
        <Minus size={15} />
      </button>
      <b>
        {levels} 段{rackCount(plan) > 1 ? " / 台" : ""}
      </b>
      <button
        aria-label="段を増やす"
        disabled={levels >= limits.levels[1]}
        onClick={() => adjust(1)}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function Dimension({ axis, plan, commit }) {
  const value = plan.config[axis],
    label = { width: "内幅", height: "合計内高", depth: "奥行" }[axis];
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function apply() {
    if (Number(draft) !== value)
      commit(
        resize(plan, { ...plan.config, [axis]: Number(draft) }),
        label + "を変更しました",
      );
    setDraft(String(value));
  }
  return (
    <label className="dimension-control">
      {label}
      <input
        aria-label={label + "（mm）"}
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(String(value));
            e.stopPropagation();
          }
        }}
      />
      mm
    </label>
  );
}
