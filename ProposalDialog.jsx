import React, { useEffect, useRef, useState } from "react";
import { Download, FileText, Presentation, X } from "lucide-react";
import "./dialogs.css";
import "./proposal-dialog.css";

export default function ProposalDialog({
  plan,
  initialKind = "proposal",
  assumptions = {},
  onAssumptions,
  onClose,
  onNotify,
}) {
  const dialog = useRef(null);
  const [recipient, setRecipient] = useState(assumptions.recipient || "");
  const [people, setPeople] = useState(String(assumptions.people || 10));
  const [days, setDays] = useState(String(assumptions.days || 3));
  const [kind, setKind] = useState(
    initialKind === "estimate" ? "estimate" : "proposal",
  );
  const isProposal = kind === "proposal";
  const documentName = isProposal ? "提案書" : "見積書";
  const [format, setFormat] = useState("pdf");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el.showModal();
    return () => el.close();
  }, []);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const values = {
      ...assumptions,
      recipient: recipient.trim().replace(/\s*御中\s*$/u, ""),
      people: isProposal ? Number(people) : assumptions.people || 10,
      days: isProposal ? Number(days) : assumptions.days || 3,
    };
    setBusy(true);
    setError("");
    try {
      const { createProposal } = await import("./proposal.js");
      await createProposal(plan, values, format, kind);
      onAssumptions?.(values);
      onNotify?.(
        `${format === "pdf" ? "PDF" : "PowerPoint"}の${documentName}を作成しました。`,
      );
      onClose();
    } catch (err) {
      console.error("Proposal export failed", err);
      setError("ファイルを作成できませんでした。もう一度お試しください。");
      setBusy(false);
    }
  }
  return (
    <dialog
      className="kd-dialog prop-dialog"
      ref={dialog}
      aria-labelledby="prop-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="kd-head">
        <span className="kd-symbol">
          <FileText size={19} />
        </span>
        <h2 id="prop-title">資料を作成</h2>
        <button
          type="button"
          aria-label="閉じる"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <form className="kd-body kd-stack" onSubmit={submit} aria-busy={busy}>
        <fieldset className="prop-kinds" disabled={busy}>
          <legend>資料の種類</legend>
          {[
            ["proposal", "提案書"],
            ["estimate", "見積書"],
          ].map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="document-kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <p>
          {isProposal
            ? "棚の配置図、製品別の見積明細、内容物の数量と用途をまとめます。"
            : "棚の配置画像と、製品別の数量・税込単価・小計、税込合計を掲載します。"}
        </p>
        <label className="kd-field">
          宛名（任意）
          <div className="kd-number">
            <input
              maxLength="72"
              placeholder="会社名・部署名"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <span>御中</span>
          </div>
        </label>
        {isProposal && (
          <div className="kd-grid">
            <label className="kd-field">
              対象人数
              <div className="kd-number">
                <input
                  required
                  type="number"
                  min="1"
                  max="999999"
                  step="1"
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                />
                <span>人</span>
              </div>
            </label>
            <label className="kd-field">
              備蓄日数
              <div className="kd-number">
                <input
                  required
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
                <span>日</span>
              </div>
            </label>
          </div>
        )}
        <fieldset className="prop-formats" disabled={busy}>
          <legend>出力形式</legend>
          {[
            ["pdf", FileText, "PDF", "A4・印刷用"],
            ["pptx", Presentation, "PowerPoint", "A4・編集用"],
          ].map(([v, Icon, label, hint]) => (
            <label key={v}>
              <input
                type="radio"
                name="export-format"
                value={v}
                checked={format === v}
                onChange={() => setFormat(v)}
              />
              <span>
                <Icon size={18} />
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="kd-error">
            {error}
          </p>
        )}
        <button className="kd-primary" type="submit" disabled={busy}>
          <Download size={17} />
          {busy
            ? "作成中…"
            : `${documentName}（${format === "pdf" ? "PDF" : "PowerPoint"}）をダウンロード`}
        </button>
      </form>
    </dialog>
  );
}
