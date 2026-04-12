"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Plus, Check, BookOpen } from "lucide-react";
import {
  CATEGORY_LABELS,
  TIME_WINDOW_LABELS,
  type RitualCategory,
  type CatalogRitual,
  type AttributeKey,
} from "@/lib/rituals/data";
import { RITUAL_CATALOG, SWAMP_ESCAPE_PRESET } from "@/lib/rituals/presets";

export function CatalogScreen() {
  const { user, setScreen } = useAppStore();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [presetApplied, setPresetApplied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RitualCategory | "all">("all");

  // Add ritual from catalog
  const handleAddRitual = async (ritual: CatalogRitual) => {
    if (!user?.id) return;
    setAddingId(ritual.id);

    try {
      const response = await fetch("/api/rituals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: ritual.title,
          type: "regular",
          category: ritual.category,
          days: ritual.days,
          timeWindow: ritual.timeWindow,
          goalShort: ritual.goalShort,
          description: ritual.description,
          attributes: ritual.attributes,
          isFromPreset: true,
          presetId: `catalog_${ritual.id}`,
        }),
      });

      if (response.ok) {
        setAddedIds((prev) => new Set(prev).add(ritual.id));
      }
    } catch (error) {
      console.error("Failed to add ritual:", error);
    } finally {
      setAddingId(null);
    }
  };

  // Apply preset
  const handleApplyPreset = async () => {
    if (!user?.id) return;
    setAddingId("preset");

    try {
      const response = await fetch("/api/rituals/preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, presetId: "swamp_escape" }),
      });

      if (response.ok) {
        setPresetApplied(true);
      }
    } catch (error) {
      console.error("Failed to apply preset:", error);
    } finally {
      setAddingId(null);
    }
  };

  // Filter rituals by category
  const filteredRituals =
    selectedCategory === "all"
      ? RITUAL_CATALOG
      : RITUAL_CATALOG.filter((r) => r.category === selectedCategory);

  const categories: (RitualCategory | "all")[] = [
    "all",
    "health",
    "mind",
    "learning",
    "productivity",
    "money",
    "relationships",
  ];

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen("rituals")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Каталог ритуалов</h1>
          <p className="text-muted-foreground text-sm">Готовые шаблоны</p>
        </div>
      </div>

      {/* Featured Preset */}
      <Card className="from-primary/10 to-primary/5 border-primary/20 bg-gradient-to-r">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl text-2xl">
              {SWAMP_ESCAPE_PRESET.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{SWAMP_ESCAPE_PRESET.name}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {SWAMP_ESCAPE_PRESET.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">
                  {SWAMP_ESCAPE_PRESET.rituals.length} ритуалов
                </Badge>
              </div>
            </div>
          </div>

          {presetApplied ? (
            <Button className="mt-3 w-full bg-emerald-600" disabled>
              <Check className="mr-2 h-4 w-4" />
              Подключено!
            </Button>
          ) : (
            <Button
              className="bg-primary mt-3 w-full"
              onClick={handleApplyPreset}
              disabled={addingId === "preset"}
            >
              {addingId === "preset" ? (
                "Подключение..."
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Подключить пакет
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Category filters */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
        {categories.map((cat) => {
          const label =
            cat === "all" ? "Все" : CATEGORY_LABELS[cat as RitualCategory]?.label || cat;
          const icon = cat === "all" ? "" : CATEGORY_LABELS[cat as RitualCategory]?.icon || "";

          return (
            <button
              key={cat}
              className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 hover:bg-muted/50"
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {icon} {label}
            </button>
          );
        })}
      </div>

      {/* Rituals list */}
      <div className="space-y-2">
        {filteredRituals.map((ritual) => {
          const category = CATEGORY_LABELS[ritual.category as RitualCategory];
          const isAdded = addedIds.has(ritual.id);
          const isAdding = addingId === ritual.id;

          return (
            <Card key={ritual.id} className="bg-card/50 backdrop-blur">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{ritual.icon || "✨"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{ritual.title}</h4>
                      {category && <Badge className={category.color}>{category.icon}</Badge>}
                    </div>
                    {ritual.goalShort && (
                      <p className="text-muted-foreground mt-0.5 text-sm">{ritual.goalShort}</p>
                    )}
                    {/* Attributes */}
                    <div className="mt-2 flex gap-1">
                      {ritual.attributes.map((attr) => (
                        <span key={attr} className="text-sm">
                          {attr === "health" ? "❤️" : attr === "mind" ? "🧠" : "💪"}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isAdded ? (
                    <Button size="sm" variant="outline" disabled className="shrink-0">
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-primary shrink-0"
                      onClick={() => handleAddRitual(ritual)}
                      disabled={isAdding}
                    >
                      {isAdding ? "..." : <Plus className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
