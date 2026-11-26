import React, { useEffect, useRef, useState } from "react";
import { Download, FileText, Presentation, X } from "lucide-react";
import "./dialogs.css";
import "./proposal-dialog.css";

export default function ProposalDialog({
  plan,
  assumptions = {},
  onAssumptions,
  onClose,
  onNotify,
}) {
  const dialog = useRef(null);
  const [recipient, setRecipient] = useState(assumptions.recipient || "");
  const [people, setPeople] = useState(String(assumptions.people || 10));
  const [days, setDays] = useState(String(assumptions.days || 3));
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
      people: Number(people),
      days: Number(days),
    };
    setBusy(true);
    setError("");
    try {
      const { createProposal } = await import("./proposal.js");
      await createProposal(plan, values, format);
      onAssumptions?.(values);
      onNotify?.(
        `${format === "pdf" ? "PDF" : "PowerPoint"}の提案書を作成しました。`,
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
        <h2 id="prop-title">提案書を作成</h2>
        <button
          type="button"
          aria-label="閉じる"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <form className="kd-body kd-stack" onSubmit={submit}>
        <p>
          棚の配置図、製品別の見積明細、内容物の数量と用途をまとめて出力します。
        </p>
        <label className="kd-field">
          宛名（任意）
          <div className="kd-number">
            <input
              autoFocus
              maxLength="72"
              placeholder="会社名・部署名"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <span>御中</span>
          </div>
        </label>
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
        <fieldset className="prop-formats">
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
            : `${format === "pdf" ? "PDF" : "PowerPoint"}をダウンロード`}
        </button>
      </form>
    </dialog>
  );
}
