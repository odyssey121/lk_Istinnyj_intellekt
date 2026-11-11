export function Chart({ rows }: { rows: { date: string; views: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  const points = rows
    .map(
      (r, i) =>
        `${40 + (i * 900) / Math.max(1, rows.length - 1)},${210 - (r.views / max) * 170}`,
    )
    .join(" ");
  return (
    <div className="chart">
      <svg
        viewBox="0 0 980 250"
        role="img"
        aria-label="Ежедневная динамика просмотров"
      >
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7060db" stopOpacity=".22" />
            <stop offset="100%" stopColor="#7060db" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1="40"
              x2="940"
              y1={40 + (i * 170) / 3}
              y2={40 + (i * 170) / 3}
              stroke="#efedf4"
              strokeDasharray="4 5"
            />
            <text x="0" y={44 + (i * 170) / 3} fontSize="11" fill="#999">
              {Math.round(max * (1 - i / 3))}
            </text>
          </g>
        ))}
        <polygon points={`40,210 ${points} 940,210`} fill="url(#fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#7762d9"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {rows
          .filter(
            (_, i) =>
              i === 0 ||
              i === rows.length - 1 ||
              i === Math.floor(rows.length / 2),
          )
          .map((r) => (
            <text
              key={r.date}
              x={40 + (rows.indexOf(r) * 900) / Math.max(1, rows.length - 1)}
              y="240"
              textAnchor="middle"
              fill="#92909b"
              fontSize="12"
            >
              {new Date(r.date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })}
            </text>
          ))}
      </svg>
    </div>
  );
}
