"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { getTodayKey } from "@/lib/date-utils";

type CheckinType = "morning" | "evening";

interface MorningData {
  energy: number;
  focusWord: string;
  task1: string;
  task2: string;
  task3: string;
  intention: string;
}

interface EveningData {
  dayRating: number;
  task1Done: boolean;
  task2Done: boolean;
  task3Done: boolean;
  win: string;
  reframe: string;
  eveningNote: string;
}

interface MorningCheckin extends MorningData {
  type: "morning";
}

interface EveningCheckin extends EveningData {
  type: "evening";
  task1?: string;
  task2?: string;
  task3?: string;
}

// Determine what type of check-in to show based on time of day
function getCheckinTypeForNow(): CheckinType | null {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 13) return "morning";
  if (hour >= 18 && hour < 24) return "evening";
  return null;
}

const STORAGE_KEY = "leakfixer-checkin-dismissed";

function getDismissedKey(type: CheckinType, date: string) {
  return `${STORAGE_KEY}-${type}-${date}`;
}

export function CheckinModal() {
  const { user, isInitialized } = useAppStore();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CheckinType>("morning");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [morningTasks, setMorningTasks] = useState({ task1: "", task2: "", task3: "" });

  // Morning state
  const [morning, setMorning] = useState<MorningData>({
    energy: 7,
    focusWord: "",
    task1: "",
    task2: "",
    task3: "",
    intention: "",
  });

  // Evening state
  const [evening, setEvening] = useState<EveningData>({
    dayRating: 7,
    task1Done: false,
    task2Done: false,
    task3Done: false,
    win: "",
    reframe: "",
    eveningNote: "",
  });

  const checkAndShowModal = useCallback(async () => {
    if (!user?.id || !isInitialized) return;

    const checkinType = getCheckinTypeForNow();
    if (!checkinType) return;

    const today = getTodayKey();

    // Check if already dismissed this session
    const dismissedKey = getDismissedKey(checkinType, today);
    if (sessionStorage.getItem(dismissedKey)) return;

    try {
      const res = await fetch(`/api/checkin?userId=${user.id}&date=${today}`);
      const data = await res.json();

      if (!data.success) return;

      // If already completed today — don't show
      const existing = checkinType === "morning" ? data.morning : data.evening;
      if (existing) {
        // Evening: also load morning tasks for task completion
        if (checkinType === "evening" && data.morning) {
          setMorningTasks({
            task1: data.morning.task1 || "",
            task2: data.morning.task2 || "",
            task3: data.morning.task3 || "",
          });
        }
        return;
      }

      // If evening — load morning tasks to check off
      if (checkinType === "evening" && data.morning) {
        setMorningTasks({
          task1: data.morning.task1 || "",
          task2: data.morning.task2 || "",
          task3: data.morning.task3 || "",
        });
      }

      setType(checkinType);
      setStep(0);
      setOpen(true);
    } catch {
      // Silently fail — check-in is optional
    }
  }, [user?.id, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    // Small delay so app finishes initializing before modal appears
    const timer = setTimeout(checkAndShowModal, 1500);
    return () => clearTimeout(timer);
  }, [isInitialized, checkAndShowModal]);

  const handleDismiss = () => {
    const today = getTodayKey();
    sessionStorage.setItem(getDismissedKey(type, today), "1");
    setOpen(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const today = getTodayKey();

    try {
      const payload =
        type === "morning"
          ? { userId: user.id, date: today, type: "morning", ...morning }
          : { userId: user.id, date: today, type: "evening", ...evening };

      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setOpen(false);
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleDismiss();
      }}
    >
      <DialogContent
        className="mx-auto max-w-sm"
        style={{
          background: "rgba(15, 23, 42, 0.97)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {type === "morning" ? (
          <MorningCheckin
            data={morning}
            onChange={setMorning}
            step={step}
            onStep={setStep}
            onSave={handleSave}
            onDismiss={handleDismiss}
            saving={saving}
          />
        ) : (
          <EveningCheckin
            data={evening}
            onChange={setEvening}
            morningTasks={morningTasks}
            step={step}
            onStep={setStep}
            onSave={handleSave}
            onDismiss={handleDismiss}
            saving={saving}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Morning Check-in ────────────────────────────────────────────────────────

const MORNING_STEPS = ["energy", "tasks", "intention"];

function MorningCheckin({
  data,
  onChange,
  step,
  onStep,
  onSave,
  onDismiss,
  saving,
}: {
  data: MorningData;
  onChange: (d: MorningData) => void;
  step: number;
  onStep: (s: number) => void;
  onSave: () => void;
  onDismiss: () => void;
  saving: boolean;
}) {
  const isLast = step === MORNING_STEPS.length - 1;

  const next = () => {
    if (isLast) onSave();
    else onStep(step + 1);
  };

  const getEnergyLabel = (v: number) => {
    if (v <= 2) return "🪫 На нуле";
    if (v <= 4) return "😴 Слабо";
    if (v <= 6) return "😐 Нормально";
    if (v <= 8) return "⚡ Хорошо";
    return "🔥 На пике!";
  };

  return (
    <>
      <DialogHeader>
        <div className="mb-1 text-xs tracking-widest text-white/40 uppercase">Утренний чекап</div>
        <DialogTitle className="text-xl text-white">
          {step === 0 && "Как ты сегодня?"}
          {step === 1 && "Топ-3 задачи на день"}
          {step === 2 && "Главная мысль дня"}
        </DialogTitle>
        {/* Step dots */}
        <div className="mt-2 flex gap-1.5">
          {MORNING_STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === step ? "24px" : "8px",
                background: i <= step ? "#6366f1" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Step 0 — Energy */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mb-1 text-5xl font-black text-white">{data.energy}</div>
              <div className="text-sm text-white/60">{getEnergyLabel(data.energy)}</div>
            </div>
            <Slider
              value={[data.energy]}
              onValueChange={([v]) => onChange({ ...data, energy: v })}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/30">
              <span>🪫 Ноль</span>
              <span>🔥 Пик</span>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/50">Слово дня (необязательно)</label>
              <Input
                placeholder="продуктивность, спокойствие, сила..."
                value={data.focusWord}
                onChange={(e) => onChange({ ...data, focusWord: e.target.value })}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
          </div>
        )}

        {/* Step 1 — Top 3 tasks */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-white/50">Что обязательно сделать сегодня?</p>
            {[
              { key: "task1", placeholder: "🎯 Главная задача" },
              { key: "task2", placeholder: "2️⃣ Вторая задача" },
              { key: "task3", placeholder: "3️⃣ Третья (если есть)" },
            ].map(({ key, placeholder }) => (
              <Input
                key={key}
                placeholder={placeholder}
                value={data[key as keyof MorningData] as string}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            ))}
          </div>
        )}

        {/* Step 2 — Intention */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-white/50">
              Мысль или намерение которое хочешь помнить весь день
            </p>
            <Textarea
              placeholder="Например: Сегодня я действую несмотря на страх. Или: Каждый маленький шаг меня приближает."
              value={data.intention}
              onChange={(e) => onChange({ ...data, intention: e.target.value })}
              className="min-h-[100px] resize-none border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="ghost"
          className="text-white/40 hover:bg-white/5 hover:text-white/60"
          onClick={handleDismissOrBack(step, onStep, onDismiss)}
        >
          {step === 0 ? "Пропустить" : "Назад"}
        </Button>
        <Button
          className="flex-1 border-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
          onClick={next}
          disabled={saving}
        >
          {isLast ? (saving ? "Сохраняю..." : "Начать день 🚀") : "Далее →"}
        </Button>
      </div>
    </>
  );
}

// ─── Evening Check-in ────────────────────────────────────────────────────────

const EVENING_STEPS = ["rating", "tasks", "win"];

function EveningCheckin({
  data,
  onChange,
  morningTasks,
  step,
  onStep,
  onSave,
  onDismiss,
  saving,
}: {
  data: EveningData;
  onChange: (d: EveningData) => void;
  morningTasks: { task1: string; task2: string; task3: string };
  step: number;
  onStep: (s: number) => void;
  onSave: () => void;
  onDismiss: () => void;
  saving: boolean;
}) {
  const isLast = step === EVENING_STEPS.length - 1;

  const next = () => {
    if (isLast) onSave();
    else onStep(step + 1);
  };

  const getDayLabel = (v: number) => {
    if (v <= 2) return "💀 Тяжело";
    if (v <= 4) return "😞 Не очень";
    if (v <= 6) return "😐 Нормально";
    if (v <= 8) return "😊 Хороший день";
    return "🔥 Отличный день!";
  };

  const tasks = [
    { key: "task1Done" as const, label: morningTasks.task1 },
    { key: "task2Done" as const, label: morningTasks.task2 },
    { key: "task3Done" as const, label: morningTasks.task3 },
  ].filter((t) => t.label);

  return (
    <>
      <DialogHeader>
        <div className="mb-1 text-xs tracking-widest text-white/40 uppercase">Вечерний чекап</div>
        <DialogTitle className="text-xl text-white">
          {step === 0 && "Как прошёл день?"}
          {step === 1 && "Что удалось сделать?"}
          {step === 2 && "Победа дня"}
        </DialogTitle>
        <div className="mt-2 flex gap-1.5">
          {EVENING_STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === step ? "24px" : "8px",
                background: i <= step ? "#f59e0b" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Step 0 — Day rating */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mb-1 text-5xl font-black text-white">{data.dayRating}</div>
              <div className="text-sm text-white/60">{getDayLabel(data.dayRating)}</div>
            </div>
            <Slider
              value={[data.dayRating]}
              onValueChange={([v]) => onChange({ ...data, dayRating: v })}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/30">
              <span>💀 Ужасно</span>
              <span>🔥 Идеально</span>
            </div>
            {data.dayRating <= 4 && (
              <div className="space-y-2">
                <label className="text-xs text-amber-400/80">
                  Рейфрейминг — что хорошего всё равно было?
                </label>
                <Textarea
                  placeholder="Даже в плохом дне есть маленькие победы..."
                  value={data.reframe}
                  onChange={(e) => onChange({ ...data, reframe: e.target.value })}
                  className="min-h-[80px] resize-none border-amber-500/20 bg-amber-500/5 text-white placeholder:text-white/30"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 1 — Task completion */}
        {step === 1 && (
          <div className="space-y-3">
            {tasks.length > 0 ? (
              <>
                <p className="text-xs text-white/50">Отметь что сделал сегодня утром:</p>
                {tasks.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => onChange({ ...data, [key]: !data[key] })}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all"
                    style={{
                      background: data[key] ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${data[key] ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    <div
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm transition-all"
                      style={{
                        background: data[key] ? "#22c55e" : "rgba(255,255,255,0.1)",
                      }}
                    >
                      {data[key] ? "✓" : "○"}
                    </div>
                    <span
                      className={`text-sm ${data[key] ? "text-green-400 line-through opacity-70" : "text-white"}`}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-white/50">
                  Что сделал сегодня? (утренние задачи не были заполнены)
                </p>
                <Textarea
                  placeholder="Список или просто описание..."
                  value={data.eveningNote}
                  onChange={(e) => onChange({ ...data, eveningNote: e.target.value })}
                  className="min-h-[100px] resize-none border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Win of the day */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-white/50">
              Одна победа — даже маленькая. Это важно для мозга.
            </p>
            <Textarea
              placeholder="Например: выпил 2л воды, не сорвался на сладкое, сделал тренировку..."
              value={data.win}
              onChange={(e) => onChange({ ...data, win: e.target.value })}
              className="min-h-[100px] resize-none border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
            <div className="text-center text-xs text-white/30 italic">
              Маленький шаг лучше нуля. Всегда.
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="ghost"
          className="text-white/40 hover:bg-white/5 hover:text-white/60"
          onClick={handleDismissOrBack(step, onStep, onDismiss)}
        >
          {step === 0 ? "Пропустить" : "Назад"}
        </Button>
        <Button
          className="flex-1 border-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
          onClick={next}
          disabled={saving}
        >
          {isLast ? (saving ? "Сохраняю..." : "Закрыть день ✨") : "Далее →"}
        </Button>
      </div>
    </>
  );
}

function handleDismissOrBack(step: number, onStep: (s: number) => void, onDismiss: () => void) {
  return () => {
    if (step === 0) onDismiss();
    else onStep(step - 1);
  };
}
