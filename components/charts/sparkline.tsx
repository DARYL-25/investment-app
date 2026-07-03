// Tiny inline SVG sparkline — server-renderable.

export function Sparkline({
  points,
  width = 96,
  height = 32,
  positive,
}: {
  points: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}) {
  if (points.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const up = positive ?? points[points.length - 1] >= points[0];
  const color = up ? "#2fc98c" : "#f26d6d";
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(height - 2 - ((p - min) / range) * (height - 4)).toFixed(1)}`);
  const path = `M${coords.join(" L")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${up ? "g" : "r"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#spark-${up ? "g" : "r"})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
