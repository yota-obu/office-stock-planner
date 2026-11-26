import React, { useLayoutEffect, useRef } from "react";
import "./shelf-confirmation.css";

export default function ShelfConfirmation({
  invoker,
  title,
  description,
  action,
  onCancel,
  onConfirm,
}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const element = ref.current;
    element.showModal();
    element.querySelector("button").focus();
    return () => {
      element.close();
      if (invoker?.isConnected) invoker.focus({ preventScroll: true });
    };
  }, [invoker]);
  return (
    <dialog
      ref={ref}
      className="shelf-confirmation"
      role="alertdialog"
      aria-labelledby="shelf-confirm-title"
      aria-describedby="shelf-confirm-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="shelf-confirm-title">{title}</h2>
      <p id="shelf-confirm-description">{description}</p>
      <div>
        <button className="smallbutton" onClick={onCancel}>
          キャンセル
        </button>
        <button className="primary" onClick={onConfirm}>
          {action}
        </button>
      </div>
    </dialog>
  );
}
