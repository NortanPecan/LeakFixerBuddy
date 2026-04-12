"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "choose" | "signin" | "signup";

interface Props {
  onBack: () => void;
}

export function EmailAuthScreen({ onBack }: Props) {
  const { loginWithEmail, isLoading } = useAppStore();
  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Заполни email и пароль");
      return;
    }
    const result = await loginWithEmail(
      email.trim(),
      password,
      mode as "signin" | "signup",
      name.trim() || undefined
    );
    if (!result.ok) {
      const map: Record<string, string> = {
        "Email already registered": "Email уже зарегистрирован",
        "Email not found": "Email не найден — зарегистрируйся",
        "Wrong password": "Неверный пароль",
        "Password must be at least 6 characters": "Пароль минимум 6 символов",
        "This account uses Telegram login. Please sign in via Telegram.":
          "Этот аккаунт создан через Telegram — войди через Telegram",
      };
      setError(map[result.error || ""] || result.error || "Ошибка");
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      <div
        className="w-full max-w-sm space-y-5 rounded-2xl p-6"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Logo */}
        <div className="text-center">
          <div className="mb-2 text-3xl">🔧</div>
          <h1 className="text-xl font-bold text-white">LeakFixer</h1>
          <p className="mt-1 text-sm text-white/40">
            {mode === "choose" && "Выбери способ входа"}
            {mode === "signin" && "Вход по email"}
            {mode === "signup" && "Регистрация"}
          </p>
        </div>

        {/* Choose mode */}
        {mode === "choose" && (
          <div className="space-y-3">
            <Button
              className="h-12 w-full rounded-xl border-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
              onClick={() => setMode("signin")}
            >
              Войти по email
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setMode("signup")}
            >
              Зарегистрироваться
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 text-white/30" style={{ background: "transparent" }}>
                  или
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full text-sm text-white/40 hover:bg-white/5 hover:text-white/60"
              onClick={onBack}
            >
              ← Назад
            </Button>
          </div>
        )}

        {/* Sign In / Sign Up form */}
        {(mode === "signin" || mode === "signup") && (
          <div className="space-y-3">
            {mode === "signup" && (
              <Input
                type="text"
                placeholder="Имя (необязательно)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30"
            />
            <Input
              type="password"
              placeholder="Пароль (мин. 6 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30"
            />

            {error && (
              <div className="rounded-lg bg-red-500/10 px-2 py-2 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              className="h-12 w-full rounded-xl border-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Загружаю..." : mode === "signin" ? "Войти" : "Создать аккаунт"}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                className="text-white/40 hover:text-white/60"
                onClick={() => {
                  setMode("choose");
                  setError("");
                }}
              >
                ← Назад
              </button>
              <button
                className="text-indigo-400 hover:text-indigo-300"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError("");
                }}
              >
                {mode === "signin" ? "Нет аккаунта?" : "Уже есть аккаунт?"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
