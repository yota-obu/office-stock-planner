import React, { useEffect, useId, useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  ClipboardList,
  PanelsTopLeft,
  Ruler,
  LibraryBig,
  CircleHelp,
  X,
  ChevronDown,
} from "lucide-react";
import "./guide.css";

const sections = {
  diagnosis: {
    title: "診断",
    icon: ClipboardList,
    heading: "人数から備蓄プランを作る",
    steps: [
      [
        "対象人数と備蓄日数を入力する",
        "拠点で備蓄する人数と日数を指定します。食料・飲料水・簡易トイレなど、用意したいものを選びます。",
      ],
      [
        "用途に合わせて条件を調整する",
        "徒歩帰宅を選ぶと帰宅予定人数を入力できます。給水班で共有する人数、車両数、生理用品入りを希望する人数も、該当項目を選ぶと設定できます。",
      ],
      [
        "提案内容を棚に反映する",
        "製品別の箱数・概算金額・追加で確保する水量を確認します。「このプランを棚に配置」で現在の配置を提案内容に入れ替えます。",
      ],
    ],
  },
  shelf: {
    title: "棚",
    icon: PanelsTopLeft,
    heading: "実寸比で製品を配置する",
    steps: [
      [
        "棚の内寸と段数を合わせる",
        "寸法欄で使える内幅と高さを入力します。段数は初期4段、最大5段です。棚を追加すると同じ寸法の棚が右側に並びます。",
      ],
      [
        "数量を決めて配置する",
        "製品欄の数量を入力し、製品の絵を目的の段にドラッグします。段を指定せずに追加する場合は「棚に追加」を押します。選んだ数量を空いている段に自動で配置します。",
      ],
      [
        "箱をまとめて移動・削除する",
        "背表紙をクリックして選びます。異なる段からも複数選択でき、選んだ箱をまとめてドラッグするか、移動先の段を指定できます。棚の外で離すと取り出せます。",
      ],
      [
        "集計・提案書を確認する",
        "内容物の内訳を開き、アイテム別の合計数量を展開します。提案書は棚画面上部の操作ボタン列の右端から作成できます。",
      ],
    ],
  },
  width: {
    title: "必要幅",
    icon: Ruler,
    heading: "棚を用意する前に必要幅を調べる",
    steps: [
      [
        "製品と箱数を指定する",
        "製品を選び、数量を直接入力するか＋・−で変更します。異なる品番を組み合わせる場合は「製品を追加」を使います。",
      ],
      [
        "横一列の幅と使用段数を読む",
        "合計幅は製品ごとの背幅×数量の合計です。複数品番の段数は、指定した順に、箱を分割せず空の段へ詰めた結果です。",
      ],
      [
        "棚の配置と照らし合わせる",
        "「棚の配置を確認」でシミュレーターに移動します。必要幅の試算は、現在の棚の配置と独立して計算されます。",
      ],
    ],
  },
  catalog: {
    title: "カタログ",
    icon: LibraryBig,
    heading: "品番・内容物から製品を探す",
    steps: [
      [
        "用途やキーワードで絞り込む",
        "製品名・品番・内容物で検索できます。保存水や軍手など、中に入っているアイテムから該当する製品を探せます。",
      ],
      [
        "仕様と内容を確認する",
        "製品を開くと寸法と税込価格を確認できます。セット内容を展開すると、品目と同梱数量がわかります。公式の製品情報にも移動できます。",
      ],
      [
        "販売状況を確認する",
        "販売を終了した製品には「販売終了」と最終掲載価格が表示されます。手元にあるセットを棚に並べるには、棚シミュレーターの商品欄で同じ品番を選んでください。",
      ],
    ],
  },
  proposal: {
    title: "提案書",
    icon: FileText,
    heading: "棚の計画を共有する",
    steps: [
      [
        "配置と金額を確認する",
        "棚画面の「収納セット数」で製品別の箱数を、「概算見積もり」で単価と税込小計を確認します。",
      ],
      [
        "宛名・人数・日数を入力する",
        "上部の「提案書を作成」を押します。会社名や部署名を入力すると宛名に「御中」が付きます。宛名は空欄でも作成できます。診断から引き継いだ対象人数と日数もここで調整できます。",
      ],
      [
        "形式を選んでダウンロードする",
        "印刷・回覧にはPDF、編集にはPowerPointを選びます。先頭ページに棚の配置と見積明細、別紙に各内容物の数量と用途を掲載します。",
      ],
    ],
  },
  faq: {
    title: "FAQ",
    icon: CircleHelp,
    heading: "よくある質問",
    steps: [
      [
        "箱が入らないときは？",
        "段の残り幅と、1段あたりの高さを確認してください。数量を減らす、別の段を選ぶ、棚を増やすといった方法で調整できます。",
      ],
      [
        "飲料水を別途用意する数量は？",
        "診断では1人1日3 Lを目安に、拠点で使えるセット同梱分を差し引きます。車内に置くセットの水は車両用として扱います。",
      ],
      [
        "同じアイテムが複数製品に入っている場合は？",
        "同じ名称のアイテムは配置箱数に応じて合算します。袋や本など、製品に記載された同梱単位で集計します。",
      ],
      [
        "操作を取り消せますか？",
        "棚画面の「ひとつ前に戻る」で配置変更を取り消せます。棚から箱を取り出したときや、棚を空にしたときにも使えます。",
      ],
      [
        "棚を空にする操作とリセットの違いは？",
        "「棚を空にする」は寸法・段数・台数を保ち、中の箱だけを取り出します。「リセット」は初期寸法の4段棚1台に戻し、中を空にします。",
      ],
      [
        "再読み込みした後も配置は残りますか？",
        "計画はこのページを開いている間だけ保持されます。共有用に残したい場合は、再読み込みやページを閉じる前に提案書をダウンロードしてください。",
      ],
      [
        "棚の何を測ればよいですか？",
        "左右の内側の幅と、棚板の厚みを除いた収納部の合計内高をmmで測ります。各段は同じ高さで計算し、製品の背幅と高さで配置を判定します。",
      ],
      [
        "見積もりはどこから保存できますか？",
        "見積もり画面でCSVを保存できます。社内説明用の資料には棚画面の「提案書を作成」を使います。",
      ],
    ],
  },
};
const tabs = Object.keys(sections);

export default function Guide({ initialTab, pageTitle, onClose }) {
  const [active, setActive] = useState(() =>
    tabs.includes(initialTab) ? initialTab : "diagnosis",
  );
  const ref = useRef(null),
    buttons = useRef([]),
    prefix = useId();
  const current = sections[active];
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  function navigate(e, index) {
    const positions = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(e.key in positions)) return;
    e.preventDefault();
    const next = positions[e.key];
    setActive(tabs[next]);
    buttons.current[next].focus();
  }
  return (
    <dialog
      ref={ref}
      className="guideDialog"
      aria-labelledby={prefix + "heading"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="guideInner">
        <header>
          <div>
            <BookOpen size={23} />
            <h2 id={prefix + "heading"}>
              {pageTitle ? pageTitle + "の使い方" : "使い方ガイド"}
            </h2>
          </div>
          <button type="button" aria-label="ガイドを閉じる" onClick={onClose}>
            <X size={21} />
          </button>
        </header>
        {!pageTitle && (
          <div
            className="guideTabs"
            role="tablist"
            aria-label="使い方ガイドの項目"
          >
            {tabs.map((id, i) => {
              const { title, icon: Icon } = sections[id];
              return (
                <button
                  type="button"
                  key={id}
                  id={prefix + id}
                  role="tab"
                  aria-selected={id === active}
                  aria-controls={prefix + "panel" + id}
                  tabIndex={id === active ? 0 : -1}
                  ref={(el) => {
                    buttons.current[i] = el;
                  }}
                  onKeyDown={(e) => navigate(e, i)}
                  onClick={() => setActive(id)}
                >
                  <Icon size={16} />
                  {title}
                </button>
              );
            })}
          </div>
        )}
        {(pageTitle ? [active] : tabs).map((id) => (
          <section
            role={pageTitle ? undefined : "tabpanel"}
            hidden={active !== id}
            tabIndex={0}
            id={prefix + "panel" + id}
            aria-labelledby={pageTitle ? prefix + "heading" : prefix + id}
            key={id}
          >
            {active === id && (
              <>
                <h3>{current.heading}</h3>
                {id === "faq" ? (
                  current.steps.map(([q, a]) => (
                    <details key={q}>
                      <summary>
                        {q}
                        <ChevronDown size={15} />
                      </summary>
                      <p>{a}</p>
                    </details>
                  ))
                ) : (
                  <ol>
                    {current.steps.map(([title, body]) => (
                      <li key={title}>
                        <h4>{title}</h4>
                        <p>{body}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </section>
        ))}
      </div>
    </dialog>
  );
}
