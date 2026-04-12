"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Thought {
  id: string;
  text: string;
  expiresAt: string;
  createdAt: string;
}

interface Props {
  userId: string;
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "истекло";
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `${hours} ч`;
  const minutes = Math.floor(diff / 60000);
  return `${minutes} мин`;
}

export function FleetingThoughtsWidget({ userId }: Props) {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/thoughts?userId=${userId}`);
      const data = await res.json();
      if (data.success) setThoughts(data.thoughts);
    } catch {
      // silent
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!input.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text: input.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setThoughts((prev) => [data.thought, ...prev]);
        setInput("");
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/thoughts?id=${id}`, { method: "DELETE" });
      setThoughts((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // silent
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          💭 Мимолётные мысли
          <span className="text-muted-foreground ml-auto text-xs font-normal">
            исчезают через 48 ч
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Input */}
        <div className="mb-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Запиши что пришло в голову..."
            className="text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim() || saving}
            className="bg-primary/80 hover:bg-primary text-primary-foreground rounded-lg px-3 text-sm font-medium transition-all disabled:opacity-40"
          >
            +
          </button>
        </div>

        {/* Thoughts list */}
        {thoughts.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-xs">
            Мыслей пока нет — запиши первую
          </p>
        ) : (
          <div className="space-y-2">
            {thoughts.map((t) => (
              <div key={t.id} className="bg-muted/20 group flex items-start gap-2 rounded-lg p-2">
                <p className="text-foreground/80 flex-1 text-sm leading-snug">{t.text}</p>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="text-muted-foreground/50 text-[10px]">
                    ⏳ {timeLeft(t.expiresAt)}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-muted-foreground/30 hover:text-destructive text-sm leading-none opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
