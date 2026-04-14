"use client";

interface EnergyBarProps {
  value: number;
  label: string;
  emoji: string;
}

export function EnergyBar({ value, label, emoji }: EnergyBarProps) {
  const pct = (value / 10) * 100;
  const color =
    value >= 8 ? "#22c55e" : value >= 6 ? "#f59e0b" : value >= 4 ? "#f97316" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">
          {emoji} {label}
        </span>
        <span className="font-bold" style={{ color }}>
          {value}/10
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
