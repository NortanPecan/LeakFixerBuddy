"use client";

import { Input } from "@/components/ui/input";

interface QuickInputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  result: string | null;
}

export function QuickInputBar({ value, onChange, onSubmit, result }: QuickInputBarProps) {
  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder='Быстрый ввод: "вода 300", "вес 74.5", "настроение 7"'
          className="bg-card/40 border-border/30 placeholder:text-muted-foreground/40 text-sm"
        />
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="bg-primary/70 hover:bg-primary text-primary-foreground rounded-lg px-3 text-sm font-bold transition-all disabled:opacity-30"
        >
          ↵
        </button>
      </div>
      {result && (
        <div className="bg-card border-border/50 absolute top-full right-0 left-0 z-10 mt-1 rounded-lg border px-3 py-2 text-sm shadow-lg">
          {result}
        </div>
      )}
    </div>
  );
}
