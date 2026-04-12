"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Download,
  Copy,
  FileText,
  Brain,
  Sparkles,
  CheckCircle,
  Database,
  RefreshCw,
  Calendar,
  MessageSquare,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AI_PROVIDERS = [
  {
    value: "claude",
    label: "Claude (Anthropic)",
    placeholder: "Вставь это в Claude для контекста...",
  },
  {
    value: "chatgpt",
    label: "ChatGPT (OpenAI)",
    placeholder: "Вставь это в ChatGPT для контекста...",
  },
  {
    value: "gemini",
    label: "Gemini (Google)",
    placeholder: "Вставь это в Gemini для контекста...",
  },
  { value: "generic", label: "Универсальный", placeholder: "Контекст для любого AI помощника..." },
];

const DATE_PRESETS = [
  { value: "7", label: "Последняя неделя" },
  { value: "14", label: "Последние 2 недели" },
  { value: "30", label: "Последний месяц" },
  { value: "custom", label: "Свой диапазон" },
];

const ENTITIES = [
  { id: "checkins", label: "Чекапы", icon: "📋" },
  { id: "leaks", label: "Анализ ликов", icon: "🔍" },
  { id: "rituals", label: "Ритуалы", icon: "🔥" },
  { id: "tasks", label: "Задачи", icon: "✅" },
  { id: "measurements", label: "Замеры тела", icon: "📏" },
  { id: "gym", label: "Тренировки (PR)", icon: "💪" },
  { id: "finances", label: "Финансы", icon: "💰" },
  { id: "challenges", label: "Челенджи", icon: "🏆" },
  { id: "skills", label: "Навыки", icon: "⭐" },
  { id: "traits", label: "Качества", icon: "💚" },
  { id: "notes", label: "Заметки", icon: "📝" },
];

const AI_PROMPTS: Record<string, string> = {
  claude: `Ты — мой личный коуч по саморазвитию. Я дам тебе мои данные из приложения LeakFixer Buddy за последние дни.

Твоя задача:
1. Найди паттерны и корреляции (что влияет на настроение/энергию/продуктивность)
2. Определи мои главные "лики" — слабые места по 5 областям: здоровье, финансы, привычки, физподготовка, психология
3. Оцени прогресс по телу (замеры, тренировки, PR)
4. Оцени финансовую картину: на что уходят деньги, есть ли утечки
5. Дай 3 конкретных действия на следующую неделю — одно на здоровье, одно на финансы, одно на привычки

Будь конкретным, опирайся только на данные. Пиши по-русски.

Данные:
---`,
  chatgpt: `Проанализируй мои данные из приложения для саморазвития LeakFixer Buddy.

Найди:
- Паттерны в настроении, энергии, ритуалах
- Прогресс тела: замеры и тренировки
- Финансовые утечки: на что уходят деньги
- Что мешает (лики) и что помогает

Дай практические рекомендации на следующую неделю по здоровью, финансам и привычкам. Только конкретика.

Данные:
---`,
  gemini: `Анализ данных из приложения саморазвития LeakFixer Buddy.

Проанализируй паттерны, найди корреляции между привычками и состоянием. Включи анализ тренировок, замеров тела и финансов. Выдели 3 главных "лика" (слабых места) и дай конкретные рекомендации.

Данные:
---`,
  generic: `Это мои данные из приложения для трекинга саморазвития за последние дни.

Пожалуйста:
1. Найди паттерны и корреляции в настроении/энергии/ритуалах
2. Оцени прогресс тела (замеры, тренировки)
3. Проанализируй финансы (доходы, расходы, топ категорий)
4. Определи слабые места ("лики")
5. Дай 3 конкретных совета на следующую неделю

Данные:
---`,
};

export function ExportScreen() {
  const { user } = useAppStore();
  const [selectedProvider, setSelectedProvider] = useState("claude");
  const [exportData, setExportData] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range
  const [datePreset, setDatePreset] = useState("7");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Entity selection
  const [selectedEntities, setSelectedEntities] = useState<string[]>([
    "checkins",
    "leaks",
    "rituals",
    "tasks",
    "measurements",
    "gym",
    "finances",
    "challenges",
    "skills",
    "traits",
    "notes",
  ]);

  const getDateRange = () => {
    const end = new Date();
    let start = new Date();

    if (datePreset === "custom") {
      if (customStartDate) start = new Date(customStartDate);
      if (customEndDate) {
        return {
          start: customStartDate ? new Date(customStartDate) : start,
          end: new Date(customEndDate),
        };
      }
    } else {
      const days = parseInt(datePreset);
      start.setDate(start.getDate() - days);
    }

    return { start, end };
  };

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const handleExport = async () => {
    if (!user?.id) return;
    setIsExporting(true);
    setError(null);

    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({
        userId: user.id,
        startDate: formatDate(start),
        endDate: formatDate(end),
        entities: selectedEntities.join(","),
      });

      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error("Failed to export");
      const data = await res.json();

      if (data.markdown) {
        const provider = AI_PROVIDERS.find((p) => p.value === selectedProvider);
        const header = `# Контекст для ${provider?.label || "AI"}

Это данные пользователя приложения LeakFixer Buddy — личного ассистента для развития привычек, целей и навыков.

`;

        setExportData(header + data.markdown);
      } else {
        setError("Не удалось сгенерировать данные");
      }
    } catch (err) {
      console.error("Export error:", err);
      setError("Ошибка при экспорте данных");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPrompt = async () => {
    const prompt = AI_PROMPTS[selectedProvider] || AI_PROMPTS.generic;
    await navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyPromptWithData = async () => {
    if (!exportData) return;
    const prompt = AI_PROMPTS[selectedProvider] || AI_PROMPTS.generic;
    const full = prompt + "\n\n" + exportData;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leakfixer-export-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEntity = (id: string) => {
    setSelectedEntities((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const selectAllEntities = () => {
    setSelectedEntities(ENTITIES.map((e) => e.id));
  };

  const clearAllEntities = () => {
    setSelectedEntities([]);
  };

  // Calculate date range for display
  const { start, end } = getDateRange();
  const displayDateRange = `${formatDate(start)} — ${formatDate(end)}`;

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">Экспорт в AI</h1>
      </div>

      {/* Info */}
      <Card className="from-primary/5 to-primary/10 bg-gradient-to-r">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Brain className="text-primary h-8 w-8 flex-shrink-0" />
            <div>
              <div className="mb-1 font-medium">Передай контекст AI</div>
              <div className="text-muted-foreground text-sm">
                Экспортируй свои данные в формате, понятном Claude, ChatGPT или другому AI. Это
                поможет AI лучше понимать твой контекст и давать персональные советы.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-400">{error}</p>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <RefreshCw className="mr-1 h-4 w-4" /> Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Range Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Период выгрузки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Пресет</Label>
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {datePreset === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>С</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>По</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="text-muted-foreground text-sm">Период: {displayDateRange}</div>
        </CardContent>
      </Card>

      {/* Entity Selection */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Что включить
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllEntities}>
                Все
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllEntities}>
                Очистить
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {ENTITIES.map((entity) => (
              <label
                key={entity.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${
                  selectedEntities.includes(entity.id)
                    ? "bg-primary/10 border-primary"
                    : "bg-muted/30 border-transparent"
                }`}
              >
                <Checkbox
                  checked={selectedEntities.includes(entity.id)}
                  onCheckedChange={() => toggleEntity(entity.id)}
                />
                <span className="text-sm">{entity.icon}</span>
                <span className="text-sm">{entity.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Provider Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            AI Провайдер
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {p.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="w-full"
            onClick={handleExport}
            disabled={isExporting || selectedEntities.length === 0}
          >
            {isExporting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Сгенерировать
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* AI Prompt */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Промпт для AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/30 text-muted-foreground max-h-40 overflow-y-auto rounded-lg p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {AI_PROMPTS[selectedProvider] || AI_PROMPTS.generic}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
              {copiedPrompt ? (
                <>
                  <CheckCircle className="mr-1 h-4 w-4" /> Скопировано
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" /> Копировать промпт
                </>
              )}
            </Button>
            {exportData && (
              <Button variant="outline" size="sm" onClick={handleCopyPromptWithData}>
                {copied ? (
                  <>
                    <CheckCircle className="mr-1 h-4 w-4" /> Скопировано
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-4 w-4" /> Промпт + данные
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Result */}
      {exportData && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Результат</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <CheckCircle className="mr-1 h-4 w-4" /> Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" /> Копировать
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-1 h-4 w-4" /> Скачать .md
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={exportData}
              onChange={(e) => setExportData(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder={AI_PROVIDERS.find((p) => p.value === selectedProvider)?.placeholder}
            />
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="outline">{exportData.length} символов</Badge>
              <Badge variant="outline">{selectedEntities.length} разделов</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isExporting && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
