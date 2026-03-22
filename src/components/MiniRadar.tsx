"use client";

type Props = {
  business: number;
  family: number;
  personal: number;
  size?: number;
};

export function MiniRadar({ business, family, personal, size = 120 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  const axes = [
    { x: cx, y: cy - r, label: "Б" },
    { x: cx + r * Math.sin((2 * Math.PI) / 3), y: cy + r * Math.cos((2 * Math.PI) / 3), label: "С" },
    { x: cx - r * Math.sin((2 * Math.PI) / 3), y: cy + r * Math.cos((2 * Math.PI) / 3), label: "Л" },
  ];

  const scores = [business / 10, family / 10, personal / 10];
  const dataPoints = axes.map((a, i) => ({
    x: cx + (a.x - cx) * scores[i],
    y: cy + (a.y - cy) * scores[i],
  }));

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  const gridLevels = [0.33, 0.66, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => {
        const points = axes.map((a) => `${cx + (a.x - cx) * level},${cy + (a.y - cy) * level}`).join(" ");
        return <polygon key={level} points={points} fill="none" stroke="#3a3a3a" strokeWidth="0.5" />;
      })}
      {axes.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="#3a3a3a" strokeWidth="0.5" />
      ))}
      <path d={dataPath} fill="rgba(201, 168, 76, 0.2)" stroke="#c9a84c" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#c9a84c" />
      ))}
      {axes.map((a, i) => {
        const lx = cx + (a.x - cx) * 1.25;
        const ly = cy + (a.y - cy) * 1.25;
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#999" fontSize="11" fontWeight="500">
            {a.label}:{[business, family, personal][i]}
          </text>
        );
      })}
    </svg>
  );
}
