"use client";

import { useAppStore, Screen, DEFAULT_NAV_ITEMS } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  Dumbbell,
  Target,
  Flame,
  Heart,
  Wallet,
  ListTodo,
  BookOpen,
  Zap,
  Trophy,
  MapPin,
  TrendingUp,
  Users,
  Search,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export const ALL_NAV_OPTIONS: {
  screen: Screen;
  icon: typeof Home;
  label: string;
  emoji: string;
}[] = [
  { screen: "home", icon: Home, label: "Главная", emoji: "🏠" },
  { screen: "gym", icon: Dumbbell, label: "GYM", emoji: "💪" },
  { screen: "rituals", icon: Flame, label: "Ритуалы", emoji: "🔥" },
  { screen: "goals", icon: Target, label: "Цели", emoji: "🎯" },
  { screen: "leaks", icon: Search, label: "Лики", emoji: "🕳️" },
  { screen: "profile", icon: User, label: "Профиль", emoji: "👤" },
  { screen: "fitness", icon: Heart, label: "Здоровье", emoji: "❤️" },
  { screen: "finance", icon: Wallet, label: "Финансы", emoji: "💰" },
  { screen: "tasks", icon: ListTodo, label: "Задачи", emoji: "📋" },
  { screen: "notes", icon: BookOpen, label: "Заметки", emoji: "📝" },
  { screen: "health", icon: Zap, label: "Питание", emoji: "⚡" },
  { screen: "challenges", icon: Trophy, label: "Вызовы", emoji: "🏆" },
  { screen: "zones", icon: MapPin, label: "Зоны", emoji: "🗺️" },
  { screen: "development", icon: TrendingUp, label: "Развитие", emoji: "📈" },
  { screen: "buddies", icon: Users, label: "Бадди", emoji: "👥" },
];

export function BottomNav() {
  const { currentScreen, setScreen, navItems } = useAppStore();
  const [pressedItem, setPressedItem] = useState<Screen | null>(null);

  const activeItems =
    navItems.length > 0
      ? ALL_NAV_OPTIONS.filter((opt) => navItems.includes(opt.screen))
      : ALL_NAV_OPTIONS.filter((opt) => DEFAULT_NAV_ITEMS.includes(opt.screen));

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: 0.15,
      }}
      className="fixed right-0 bottom-0 left-0 z-50"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Rounded container */}
      <div
        className="mx-3 mb-2"
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderRadius: "24px",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex items-center justify-around gap-2 px-2 py-3">
          {activeItems.map(({ screen, icon: Icon, label, emoji }) => {
            const isActive = currentScreen === screen;
            const isPressed = pressedItem === screen;

            return (
              <button
                key={screen}
                onClick={() => setScreen(screen)}
                onTouchStart={() => setPressedItem(screen)}
                onTouchEnd={() => setPressedItem(null)}
                onTouchCancel={() => setPressedItem(null)}
                onMouseDown={() => setPressedItem(screen)}
                onMouseUp={() => setPressedItem(null)}
                onMouseLeave={() => setPressedItem(null)}
                className={cn(
                  "relative flex flex-col items-center justify-center",
                  "h-14 w-14 rounded-2xl",
                  "transition-all duration-200 ease-out",
                  "touch-manipulation select-none",
                  isPressed && "scale-90",
                  isActive && "scale-105"
                )}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    "relative flex items-center justify-center",
                    "h-12 w-12 rounded-full",
                    "transition-all duration-200"
                  )}
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(139,92,246,0.3) 100%)"
                      : "rgba(255,255,255,0.08)",
                    boxShadow: isActive ? "0 0 20px rgba(99,102,241,0.4)" : "none",
                  }}
                >
                  {isActive ? (
                    <span className="text-xl">{emoji}</span>
                  ) : (
                    <Icon className={cn("h-5 w-5 transition-all duration-200", "text-white/50")} />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-0.5 text-[10px] font-medium",
                    "transition-colors duration-200",
                    isActive ? "text-white" : "text-white/40"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
