"use client";

import { useAppStore, Screen } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ChevronLeft, Menu, X, Search } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QuickSearch } from "@/components/QuickSearch";

// Screen titles mapping
const SCREEN_TITLES: Record<Screen, string> = {
  home: "LeakFixer",
  fitness: "Фитнес",
  rituals: "Ритуалы",
  gym: "Тренировки",
  profile: "Профиль",
  tasks: "Дела",
  chain: "Цепочка",
  "create-task": "Новое дело",
  "create-chain": "Новая цепочка",
  "create-ritual": "Новый ритуал",
  catalog: "Каталог",
  notes: "Заметки",
  development: "Развитие",
  "content-detail": "Контент",
  finance: "Финансы",
  challenges: "Челленджи",
  "challenge-detail": "Челлендж",
  health: "Здоровье",
  "daily-summary": "Сводка дня",
  goals: "Цели",
  skills: "Навыки",
  traits: "Черты",
  export: "Экспорт",
  "all-rituals": "Все ритуалы",
  stats: "Статистика",
  buddies: "Бадди",
  journey: "Путь",
  leaks: "Лики",
  onboarding: "Начало",
  zones: "Зоны",
  "note-detail": "Заметка",
  settings: "Настройки",
  "weekly-report": "Лики недели",
  "monthly-report": "Месячный отчёт",
  habits: "Привычки",
  "calorie-goal": "Цель по калориям",
};

// Screens that show "back" button instead of "menu"
const DETAIL_SCREENS: Screen[] = [
  "chain",
  "create-task",
  "create-chain",
  "create-ritual",
  "content-detail",
  "challenge-detail",
  "all-rituals",
];

// Navigation history for back button
const SCREEN_HISTORY: Screen[] = [];

export function TopNav() {
  const { currentScreen, setScreen, isDemoMode } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Track screen history
  useEffect(() => {
    if (!DETAIL_SCREENS.includes(currentScreen)) {
      SCREEN_HISTORY.length = 0;
    } else {
      if (SCREEN_HISTORY[SCREEN_HISTORY.length - 1] !== currentScreen) {
        SCREEN_HISTORY.push(currentScreen);
      }
    }
  }, [currentScreen]);

  const handleBack = useCallback(() => {
    if (SCREEN_HISTORY.length > 1) {
      SCREEN_HISTORY.pop();
      const prevScreen = SCREEN_HISTORY[SCREEN_HISTORY.length - 1];
      setScreen(prevScreen);
    } else {
      setScreen("home");
    }
  }, [setScreen]);

  const isDetailScreen = DETAIL_SCREENS.includes(currentScreen);
  const title = SCREEN_TITLES[currentScreen] || "LeakFixer";

  return (
    <>
      {/* Header - Logo & Title centered */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="fixed top-0 right-0 left-0 z-[100]"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(15,23,42,0.75) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          height: "calc(84px + env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="flex h-full items-center justify-center px-4">
          {/* Logo */}
          <div
            className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              boxShadow: "0 2px 12px rgba(99,102,241,0.4)",
            }}
          >
            <span className="text-sm font-bold text-white">LF</span>
          </div>

          {/* Title */}
          <h1 className="text-lg font-bold tracking-tight text-white">{title}</h1>

          {/* Demo Badge */}
          {isDemoMode && (
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "rgba(245,158,11,0.2)",
                color: "#fbbf24",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              DEMO
            </span>
          )}
        </div>

        {/* Bottom edge highlight */}
        <div
          className="absolute right-0 bottom-0 left-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
          }}
        />
      </motion.header>

      {/* Second Row - Menu below header */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          delay: 0.1,
        }}
        className="fixed z-[90]"
        style={{
          top: "calc(84px + env(safe-area-inset-top, 0px))",
          left: 0,
          right: 0,
        }}
      >
        <div className="flex items-center justify-between px-4 py-2">
          {isDetailScreen ? (
            <button
              onClick={handleBack}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                "bg-white/10 hover:bg-white/20 active:bg-white/25",
                "transition-all duration-200 active:scale-95"
              )}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
          ) : (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                "bg-white/10 hover:bg-white/20 active:bg-white/25",
                "transition-all duration-200 active:scale-95"
              )}
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
          )}

          {/* Quick Search button — always visible */}
          <button
            onClick={() => setShowSearch(true)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-full px-3",
              "bg-white/8 hover:bg-white/15 active:bg-white/20",
              "border border-white/10",
              "transition-all duration-200 active:scale-95"
            )}
          >
            <Search className="h-4 w-4 text-white/50" />
            <span className="hidden pr-1 text-xs text-white/30 sm:block">Поиск...</span>
          </button>
        </div>
      </motion.div>

      {/* Dropdown Menu Overlay */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 right-0 left-0 z-[85]"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.95) 100%)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 120px)",
            }}
          >
            <div className="mx-auto w-full max-w-lg">
              {/* Menu Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-sm font-medium text-white/60">Навигация</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMenu(false)}
                  className="h-8 w-8 rounded-full p-0 hover:bg-white/10"
                >
                  <X className="h-4 w-4 text-white/70" />
                </Button>
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-4 gap-2 p-3">
                {[
                  { screen: "home" as Screen, icon: "🏠", label: "Главная" },
                  { screen: "gym" as Screen, icon: "💪", label: "Тренировки" },
                  { screen: "health" as Screen, icon: "❤️", label: "Здоровье" },
                  { screen: "finance" as Screen, icon: "💰", label: "Финансы" },
                  { screen: "challenges" as Screen, icon: "🏆", label: "Челленджи" },
                  { screen: "leaks" as Screen, icon: "🧩", label: "Лики" },
                  { screen: "goals" as Screen, icon: "🎯", label: "Цели" },
                  { screen: "skills" as Screen, icon: "📈", label: "Навыки" },
                  { screen: "traits" as Screen, icon: "✨", label: "Черты" },
                  { screen: "daily-summary" as Screen, icon: "📊", label: "Сводка" },
                  { screen: "weekly-report" as Screen, icon: "🔍", label: "Лики" },
                  { screen: "export" as Screen, icon: "📤", label: "Экспорт" },
                  { screen: "notes" as Screen, icon: "📝", label: "Заметки" },
                  { screen: "development" as Screen, icon: "📚", label: "Развитие" },
                ].map((item) => (
                  <button
                    key={item.screen}
                    onClick={() => {
                      setScreen(item.screen);
                      setShowMenu(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl p-2",
                      "transition-all duration-200 active:scale-95",
                      currentScreen === item.screen ? "bg-white/15" : "hover:bg-white/10"
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="w-full truncate text-center text-[10px] font-medium text-white/60">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Button
                  size="sm"
                  className="flex-1 rounded-full bg-white/10 text-xs hover:bg-white/20"
                  onClick={() => {
                    setScreen("create-ritual");
                    setShowMenu(false);
                  }}
                >
                  + Ритуал
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-full bg-white/10 text-xs hover:bg-white/20"
                  onClick={() => {
                    setScreen("create-task");
                    setShowMenu(false);
                  }}
                >
                  + Дело
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-full bg-white/10 text-xs hover:bg-white/20"
                  onClick={() => {
                    setScreen("create-chain");
                    setShowMenu(false);
                  }}
                >
                  + Цепочка
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Spacer to push content below header + menu row */}
      <div
        className="w-full shrink-0"
        style={{
          height: "calc(84px + 56px + env(safe-area-inset-top, 0px))",
        }}
      />

      {/* Quick Search Modal */}
      <QuickSearch open={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
}
