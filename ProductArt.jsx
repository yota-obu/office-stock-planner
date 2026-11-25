import React, { useId } from "react";

// Original vector drawings of the kraft packaging illustrated in KING JIM's series guide.
const markings = {
  "SYS-200": ["車載"],
  "SYS-300": ["車載トイレ"],
  "STKS-100": ["待機〜帰宅", "差し替え式"],
  "STKS-100-BX": ["差し替え", "ボックス"],
  "BCS-500": ["備蓄", "9年保存", "3日分"],
  "BCS-400": ["備蓄", "9年保存", "1日分"],
  "BCS-300": ["備蓄", "3日分"],
  "BCS-200": ["備蓄"],
  "CBCS-200": ["備蓄", "コンパクト"],
  "KTS-200": ["帰宅"],
  "KSS-200": ["給水"],
  "HGS-200": ["衛生"],
  "HGS-300": ["衛生", "女性用"],
  "MNS-200": ["備蓄", "ミニ"],
  "HMS-200": ["ヘルメット"],
  "TLS-500": ["トイレ", "100回分", "消臭力UP"],
  "TLS-400": ["トイレ", "100回分"],
  "TLS-300": ["トイレ"],
  "ABS-200": ["毛布"],
  "ATS-200": ["暑さ対策"],
  "KZB-100": ["火山灰・粉じん"],
  "KBG-200": ["吸水バッグ", "10枚入"],
};

function VehiclePrint({ product, width, height, wide }) {
  const toilet = product.id === "SYS-300";
  const title = toilet ? "車載トイレ" : "車載";
  const english = toilet
    ? ["In-vehicle", "Survival", "Toilet", "kit"]
    : ["In-vehicle", "Survival", "kit"];
  const size = Math.min(width * 0.245, height * 0.117);
  const cx = width * 0.75;
  const firstY = height * 0.125;
  const navy = product.color;
  return (
    <g fill={navy} fontFamily="Arial,'Hiragino Kaku Gothic ProN',sans-serif">
      {wide ? (
        <g>
          {english.map((line, i) => (
            <text
              key={line}
              x={width * 0.055}
              y={height * (0.113 + i * 0.072)}
              fontSize={height * 0.068}
              fontWeight="700"
            >
              {line}
            </text>
          ))}
          <path
            d={`M${width * 0.055} ${height * (0.135 + (english.length - 1) * 0.072)}h${width * 0.34}`}
            stroke={navy}
            strokeWidth="1"
          />
          <text
            x={width * 0.055}
            y={height * (0.183 + (english.length - 1) * 0.072)}
            fontSize={Math.min(width * 0.048, height * 0.038)}
          >
            {product.name}
          </text>
          <text
            x={width * 0.95}
            y={height * 0.08}
            textAnchor="end"
            fontSize={height * 0.026}
            fontWeight="700"
          >
            □ KING JIM
          </text>
        </g>
      ) : (
        <g textAnchor="middle" fontWeight="800">
          <text x={cx} y={height * 0.091} fontSize={size * 0.45}>
            非常用
          </text>
          <path
            d={`M ${cx - size * 0.7} ${height * 0.105} h ${size * 1.4}`}
            stroke={navy}
            strokeWidth="1"
          />
          {Array.from(title).map((c, i) => (
            <text
              key={i}
              x={cx}
              y={firstY + size * (0.88 + i * 1.03)}
              fontSize={size}
            >
              {c}
            </text>
          ))}
          <text
            x={cx}
            y={firstY + size * (0.49 + title.length * 1.03)}
            fontSize={size * 0.46}
          >
            セット
          </text>
        </g>
      )}
      <svg
        x={wide ? width * 0.47 : width * 0.15}
        y={height * 0.6}
        width={wide ? width * 0.48 : width * 0.79}
        height={height * 0.29}
        viewBox="0 0 100 68"
        preserveAspectRatio="none"
      >
        <g fill="none" stroke={navy}>
          <circle cx="18" cy="18" r="15" strokeWidth="2" />
          <circle cx="18" cy="18" r="12.5" strokeWidth=".9" />
          <path d="M18 33V68" strokeWidth="3" />
        </g>
        {toilet ? (
          <g>
            <text
              x="18"
              y="17"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
            >
              toilet
            </text>
            <path d="M9 20h15l-3 8h-7z" />
          </g>
        ) : (
          <g textAnchor="middle">
            <text x="18" y="20" fontSize="15" fontWeight="bold">
              12
            </text>
            <text x="18" y="26" fontSize="5">
              items
            </text>
          </g>
        )}
        <g transform="translate(36,30)" stroke={navy} strokeWidth="2">
          <path
            d="M4 22 11 6q1-3 5-3h25q4 0 5 3l6 16q4 1 4 5v6H1v-6q0-4 3-5ZM5 33v5m46-5v5"
            fill="none"
          />
          <path d="m9 21 6-13h25l7 13Z" />
          <circle cx="8" cy="27" r="1.7" />
          <circle cx="48" cy="27" r="1.7" />
          <path d="M24 29h8" />
        </g>
      </svg>
    </g>
  );
}

function Print({ product, width, height, wide, prefix }) {
  const [title, ...tags] = markings[product.id] || [product.name];
  const refill = product.id === "STKS-100-BX";
  const vehicle = product.id.startsWith("SYS-");
  const ink = vehicle ? "#284970" : "#453224";
  const font = Math.min(
    height * 0.081,
    width * 0.63,
    (height * 0.43) / title.length,
  );
  const cx = wide ? width * 0.13 : width / 2;
  const top = height * 0.052;
  const headerFont = Math.min(font * 0.55, width * 0.3);
  const titleTop = top + headerFont * 1.24;
  const end = titleTop + font * title.length * 1.01;
  const tagFont = Math.min(font * 0.49, width / 5);
  const left = wide ? width * 0.035 : width * 0.065;
  return (
    <>
      <rect width={width} height={height} fill={`url(#${prefix}paper)`} />
      <rect width={width} height={height} fill={`url(#${prefix}grain)`} />
      <path
        d={`M 1 0 V ${height} M 1 1 H ${width}`}
        fill="none"
        stroke="#fff2d3"
        strokeOpacity=".6"
        strokeWidth="2"
      />
      <path
        d={`M ${width - 1} 0 V ${height} H 0`}
        fill="none"
        stroke="#705137"
        strokeOpacity=".5"
        strokeWidth="2"
      />
      {vehicle ? (
        <VehiclePrint
          product={product}
          width={width}
          height={height}
          wide={wide}
        />
      ) : (
        <g
          fill={ink}
          textAnchor="middle"
          fontFamily="'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif"
          fontWeight="800"
        >
          <text x={cx} y={top + headerFont * 0.75} fontSize={headerFont}>
            {refill ? "交換用" : "災害"}
          </text>
          {Array.from(title).map((letter, i) => (
            <text
              key={i}
              x={cx}
              y={titleTop + font * (0.82 + i * 1.01)}
              fontSize={font}
            >
              {letter}
            </text>
          ))}
          <text x={cx} y={end + headerFont} fontSize={headerFont}>
            {refill ? "ボックス" : "セット"}
          </text>
          {tags
            .filter((tag) => tag !== "ボックス")
            .map((tag, i) => {
              const boxW = Math.min(width * 0.82, tagFont * (tag.length + 0.6));
              const y = end + headerFont * 1.65 + i * tagFont * 1.6;
              return (
                <g key={tag}>
                  <rect
                    x={cx - boxW / 2}
                    y={y}
                    width={boxW}
                    height={tagFont * 1.26}
                    rx={tagFont * 0.18}
                    fill="none"
                    stroke={ink}
                    strokeWidth={0.8}
                  />
                  <text x={cx} y={y + tagFont} fontSize={tagFont * 0.84}>
                    {tag}
                  </text>
                </g>
              );
            })}
        </g>
      )}
      {!vehicle && (
        <g fill={ink} fontFamily="Arial,sans-serif" fontWeight="700">
          {wide && (
            <text
              x={width * 0.935}
              y={height * 0.069}
              textAnchor="end"
              fontSize={height * 0.025}
            >
              ♔ KING JIM
            </text>
          )}
          <text
            x={width / 2}
            y={height * 0.658}
            fontSize={Math.min(height * 0.024, width * 0.088)}
            textAnchor="middle"
          >
            KING JIM
          </text>
        </g>
      )}
      {!refill && (
        <rect
          x={left / 2}
          y={height * (vehicle ? 0.855 : 0.68)}
          width={width - left}
          height={height * (vehicle ? 0.137 : 0.312)}
          fill={`url(#${prefix}stripe)`}
        />
      )}
      <path
        d={`M 1 ${height - 2} H ${width - 1}`}
        stroke="#7f6347"
        opacity=".55"
        strokeWidth="1.3"
      />
    </>
  );
}

export default function ProductArt({
  product,
  spine = false,
  className,
  style,
}) {
  const prefix = "pack" + useId().replace(/[^a-z0-9_-]/gi, "");
  const { w, h, d, color } = product;
  const defs = (
    <defs>
      <linearGradient
        id={`${prefix}paper`}
        x2="1"
        y2=".18"
        gradientUnits="objectBoundingBox"
      >
        <stop stopColor="#d8ba90" />
        <stop offset=".26" stopColor="#e4cba8" />
        <stop offset=".83" stopColor="#dbbd95" />
        <stop offset="1" stopColor="#caaa80" />
      </linearGradient>
      <pattern
        id={`${prefix}grain`}
        width="9"
        height="11"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M1 2h1.3m3 4H7m-4.3 3h.5"
          stroke="#876a47"
          strokeWidth=".85"
          opacity=".19"
        />
        <path
          d="M3 1h1m2 8h1.2"
          stroke="white"
          opacity=".27"
          strokeWidth=".8"
        />
      </pattern>
      <pattern
        id={`${prefix}stripe`}
        width="30"
        height="30"
        patternUnits="userSpaceOnUse"
        patternTransform={
          product.id.startsWith("SYS-") ? "rotate(37)" : "rotate(-43)"
        }
      >
        <rect width="14" height="30" fill={color} />
      </pattern>
    </defs>
  );
  const attrs = {
    className,
    role: "img",
    "aria-label": product.name + (spine ? "の背表紙" : "のパッケージ"),
    style: {
      display: "block",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      ...style,
    },
  };
  if (spine)
    return (
      <svg {...attrs} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {defs}
        <Print product={product} width={w} height={h} prefix={prefix} />
      </svg>
    );
  const face = d * 0.82,
    side = w * 0.61,
    rise = d * 0.072,
    back = w * 0.282;
  return (
    <svg {...attrs} viewBox={`-4 -4 ${face + side + 8} ${h + back + rise + 8}`}>
      {defs}
      <g transform={`matrix(.82,.072,0,1,0,${back})`}>
        <Print product={product} width={d} height={h} prefix={prefix} wide />
      </g>
      <g transform={`matrix(.61,-.282,0,1,${face},${back + rise})`}>
        <Print product={product} width={w} height={h} prefix={prefix} />
        <rect width={w} height={h} fill="#493925" opacity=".15" />
      </g>
      <g transform={`matrix(.82,.072,.61,-.282,0,${back})`}>
        <rect
          width={d}
          height={w}
          fill="#ead2ad"
          stroke="#b3926d"
          strokeWidth="1.2"
        />
        {product.id !== "STKS-100-BX" && (
          <rect width={d * 0.32} height={w} fill={`url(#${prefix}stripe)`} />
        )}
        <path
          d={`M0 3 H${d - 3} V${w - 3} H0`}
          fill="none"
          stroke="#af8e67"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
