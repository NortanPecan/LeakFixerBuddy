"use client";

import { EnergyBar } from "@/features/home/components/energy-bar";
import type { CheckinStatus } from "@/features/home/types";

interface CheckinStatusBlockProps extends CheckinStatus {
  isMorningTime: boolean;
  isEveningTime: boolean;
  onOpenDailySummary?: () => void;
}

export function CheckinStatusBlock({
  morningDone,
  eveningDone,
  morningEnergy,
  morningFocus,
  eveningRating,
  eveningWin,
  earlyBird,
  isMorningTime,
  isEveningTime,
  onOpenDailySummary,
}: CheckinStatusBlockProps) {
  const badgeRow = (
    <div className="mb-3 flex flex-wrap gap-2">
      <button
        onClick={onOpenDailySummary}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
          morningDone
            ? "border border-green-500/30 bg-green-500/20 text-green-400"
            : "border border-white/10 bg-white/5 text-white/40"
        }`}
      >
        <span>☀️</span>
        <span>Утро</span>
        <span>{morningDone ? "✅" : "⏳"}</span>
      </button>
      {earlyBird && (
        <span className="flex items-center gap-1 rounded-full border border-yellow-500/25 bg-yellow-500/15 px-2 py-1.5 text-xs font-medium text-yellow-400">
          ⚡ Ранняя пташка
        </span>
      )}
      <button
        onClick={onOpenDailySummary}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
          eveningDone
            ? "border border-amber-500/30 bg-amber-500/20 text-amber-400"
            : "border border-white/10 bg-white/5 text-white/40"
        }`}
      >
        <span>🌙</span>
        <span>Вечер</span>
        <span>{eveningDone ? "✅" : "⏳"}</span>
      </button>
    </div>
  );

  if (morningDone && eveningDone) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.08) 100%)",
          border: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        {badgeRow}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-green-400">✓ Оба чекапа выполнены</span>
          {morningFocus && (
            <span className="ml-auto text-xs text-white/40">слово: {morningFocus}</span>
          )}
        </div>
        <div className="space-y-2">
          {morningEnergy && <EnergyBar value={morningEnergy} label="Утренняя энергия" emoji="⚡" />}
          {eveningRating && <EnergyBar value={eveningRating} label="Оценка дня" emoji="🌙" />}
        </div>
        {eveningWin && (
          <div className="mt-2 border-t border-white/10 pt-2 text-xs text-white/60 italic">
            🏆 {eveningWin}
          </div>
        )}
      </div>
    );
  }

  if (!morningDone && isMorningTime) {
    return (
      <div
        className="cursor-default rounded-2xl p-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.10) 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
        }}
      >
        {badgeRow}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Утренний чекап</div>
            <div className="mt-0.5 text-xs text-white/40">
              Появится автоматически · займёт 1 мин
            </div>
          </div>
          <div className="text-2xl">🌅</div>
        </div>
      </div>
    );
  }

  if (!eveningDone && isEveningTime && morningDone) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,88,12,0.10) 100%)",
          border: "1px solid rgba(245,158,11,0.25)",
        }}
      >
        {badgeRow}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Вечерний чекап</div>
            <div className="mt-0.5 text-xs text-white/40">Появится автоматически · закрой день</div>
          </div>
          <div className="text-2xl">🌙</div>
        </div>
        {morningEnergy && (
          <div className="mt-2 text-xs text-white/40">
            Утро: ⚡{morningEnergy}/10{morningFocus ? ` · ${morningFocus}` : ""}
          </div>
        )}
      </div>
    );
  }

  if (morningDone && !isEveningTime) {
    return (
      <div
        className="rounded-2xl p-3"
        style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        {badgeRow}
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400">✓ Утро выполнено</span>
          {morningFocus && <span className="text-xs text-white/30">· {morningFocus}</span>}
          <span className="ml-auto text-[10px] text-white/25">вечер после 18:00</span>
        </div>
        {morningEnergy && <EnergyBar value={morningEnergy} label="Утренняя энергия" emoji="⚡" />}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {badgeRow}
    </div>
  );
}
