"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Scale, Utensils, DollarSign, StickyNote, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTodayKey } from "@/lib/date-utils";
import { showSuccessToast, showErrorToast, isOnline } from "@/lib/network-utils";

type QuickEntryType = "weight" | "food" | "transaction" | "note" | "workout";

interface QuickAction {
  type: QuickEntryType;
  label: string;
  icon: typeof Plus;
  color: string;
  bg: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { type: "weight", label: "Вес", icon: Scale, color: "text-blue-400", bg: "bg-blue-500/20" },
  { type: "food", label: "Еда", icon: Utensils, color: "text-green-400", bg: "bg-green-500/20" },
  {
    type: "transaction",
    label: "Финансы",
    icon: DollarSign,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  {
    type: "note",
    label: "Заметка",
    icon: StickyNote,
    color: "text-purple-400",
    bg: "bg-purple-500/20",
  },
];

export function QuickEntryFAB() {
  const { user, setScreen } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeEntry, setActiveEntry] = useState<QuickEntryType | null>(null);

  // Weight entry state
  const [weight, setWeight] = useState("");
  // Food entry state
  const [foodName, setFoodName] = useState("");
  const [foodCalories, setFoodCalories] = useState("");
  // Transaction entry state
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  // Note state
  const [noteText, setNoteText] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const openEntry = (type: QuickEntryType) => {
    setIsOpen(false);
    setActiveEntry(type);
  };

  const handleSaveWeight = async () => {
    if (!user?.id || !weight || isSaving) return;
    if (!isOnline()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, weight: parseFloat(weight), date: getTodayKey() }),
      });
      if (!res.ok) throw new Error("Failed");
      showSuccessToast(`Вес ${weight} кг сохранён`);
      setActiveEntry(null);
      setWeight("");
    } catch (e) {
      showErrorToast(e, "сохранение веса");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFood = async () => {
    if (!user?.id || !foodName || isSaving) return;
    if (!isOnline()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          date: getTodayKey(),
          name: foodName,
          calories: parseInt(foodCalories) || 0,
          mealType: "snack",
          protein: 0,
          fat: 0,
          carbs: 0,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      showSuccessToast(`${foodName} добавлено`);
      setActiveEntry(null);
      setFoodName("");
      setFoodCalories("");
    } catch (e) {
      showErrorToast(e, "добавление еды");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTransaction = async () => {
    if (!user?.id || !txAmount || isSaving) return;
    if (!isOnline()) return;

    // Navigate to Finance for full form, or save directly if we have account
    setActiveEntry(null);
    setScreen("finance");
  };

  const handleSaveNote = async () => {
    if (!user?.id || !noteText.trim() || isSaving) return;
    if (!isOnline()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          text: noteText.trim(),
          type: "reflection",
          zone: "general",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      showSuccessToast("Заметка сохранена");
      setActiveEntry(null);
      setNoteText("");
    } catch (e) {
      showErrorToast(e, "сохранение заметки");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* FAB */}
      <div className="fixed right-4 z-40" style={{ bottom: "100px" }}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="mb-3 flex flex-col items-end gap-2"
            >
              {QUICK_ACTIONS.map(({ type, label, icon: Icon, color, bg }) => (
                <motion.button
                  key={type}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={() => openEntry(type)}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-3 py-2",
                    "border border-white/10 shadow-lg",
                    bg,
                    "backdrop-blur-sm"
                  )}
                  style={{ background: "rgba(0,0,0,0.7)" }}
                >
                  <span className="text-xs font-medium text-white/80">{label}</span>
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", bg)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex h-12 w-12 items-center justify-center rounded-full shadow-xl"
          style={{
            background: isOpen
              ? "rgba(239,68,68,0.9)"
              : "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.9))",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="h-5 w-5 text-white" />
          </motion.div>
        </motion.button>
      </div>

      {/* Weight Dialog */}
      <Dialog open={activeEntry === "weight"} onOpenChange={() => setActiveEntry(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-400" />
              Записать вес
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Вес (кг)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="75.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveWeight()}
                autoFocus
              />
            </div>
            <Button
              className="bg-primary w-full"
              onClick={handleSaveWeight}
              disabled={!weight || isSaving}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Food Dialog */}
      <Dialog open={activeEntry === "food"} onOpenChange={() => setActiveEntry(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-green-400" />
              Добавить еду
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Название</Label>
              <Input
                placeholder="Куриная грудка"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>Калории (опц.)</Label>
              <Input
                type="number"
                placeholder="300"
                value={foodCalories}
                onChange={(e) => setFoodCalories(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveFood()}
              />
            </div>
            <Button
              className="bg-primary w-full"
              onClick={handleSaveFood}
              disabled={!foodName || isSaving}
            >
              {isSaving ? "Добавление..." : "Добавить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={activeEntry === "note"} onOpenChange={() => setActiveEntry(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-purple-400" />
              Быстрая заметка
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Текст</Label>
              <textarea
                className="border-input bg-background focus:ring-ring min-h-[80px] w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                placeholder="Запишите мысль..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              className="bg-primary w-full"
              onClick={handleSaveNote}
              disabled={!noteText.trim() || isSaving}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
