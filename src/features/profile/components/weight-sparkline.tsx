"use client";

interface WeightSparklineProps {
  data: Array<{ date: string; weight: number }>;
}

export function WeightSparkline({ data }: WeightSparklineProps) {
  if (data.length < 2) return null;
  const W = 120,
    H = 24,
    PAD = 2;
  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const points = data
    .map((d, i) => {
      const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
      const y = H - PAD - ((d.weight - minW) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const rising = last.weight >= prev.weight;
  return (
    <div className="flex items-center gap-2 pl-6">
      <svg width={W} height={H} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={rising ? "#10b981" : "#f59e0b"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-xs ${rising ? "text-emerald-400" : "text-yellow-400"}`}>
        {rising ? "↑" : "↓"} {data[0].weight}→{last.weight} кг
      </span>
    </div>
  );
}
