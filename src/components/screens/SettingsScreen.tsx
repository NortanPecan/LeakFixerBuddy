"use client";

import { useAppStore, Screen, DEFAULT_NAV_ITEMS } from "@/lib/store";
import { ALL_NAV_OPTIONS } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, GripVertical, Check, Bell, LayoutGrid, Users } from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/lib/network-utils";
import { useState, useEffect } from "react";

interface UserSettings {
  ritualReminders: boolean;
  checkinReminders: boolean;
  taskReminders: boolean;
  supplementReminders: boolean;
  zoneHealthEnabled: boolean;
  zoneLeakfixerEnabled: boolean;
  zoneAiEnabled: boolean;
  zonePokerEnabled: boolean;
  buddyPrivacy: string;
}

export function SettingsScreen() {
  const { user, setScreen, navItems, setNavItems } = useAppStore();
  const [localNavItems, setLocalNavItems] = useState<Screen[]>(
    navItems.length > 0 ? navItems : DEFAULT_NAV_ITEMS
  );
  const [settings, setSettings] = useState<UserSettings>({
    ritualReminders: true,
    checkinReminders: true,
    taskReminders: true,
    supplementReminders: true,
    zoneHealthEnabled: true,
    zoneLeakfixerEnabled: true,
    zoneAiEnabled: true,
    zonePokerEnabled: true,
    buddyPrivacy: "full",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Load settings from API
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/settings?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings({
            ritualReminders: data.settings.ritualReminders ?? true,
            checkinReminders: data.settings.checkinReminders ?? true,
            taskReminders: data.settings.taskReminders ?? true,
            supplementReminders: data.settings.supplementReminders ?? true,
            zoneHealthEnabled: data.settings.zoneHealthEnabled ?? true,
            zoneLeakfixerEnabled: data.settings.zoneLeakfixerEnabled ?? true,
            zoneAiEnabled: data.settings.zoneAiEnabled ?? true,
            zonePokerEnabled: data.settings.zonePokerEnabled ?? true,
            buddyPrivacy: data.settings.buddyPrivacy ?? "full",
          });
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const toggleNavItem = (screen: Screen) => {
    setLocalNavItems((prev) => {
      if (prev.includes(screen)) {
        if (prev.length <= 1) return prev;
        return prev.filter((s) => s !== screen);
      } else {
        if (prev.length >= 6) return prev;
        return [...prev, screen];
      }
    });
  };

  const handleSaveNav = () => {
    setNavItems(localNavItems);
    showSuccessToast("Навигация сохранена");
  };

  const updatePrivacy = async (value: string) => {
    if (!user?.id) return;
    setSettings((prev) => ({ ...prev, buddyPrivacy: value }));
    setSavingSettings(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, buddyPrivacy: value }),
      });
    } catch (err) {
      showErrorToast(err, "сохранение приватности");
      setSettings((prev) => ({ ...prev, buddyPrivacy: settings.buddyPrivacy }));
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    if (!user?.id) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSavingSettings(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, [key]: value }),
      });
    } catch (err) {
      showErrorToast(err, "сохранение настроек");
      setSettings((prev) => ({ ...prev, [key]: !value })); // revert
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen("profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Настройки</h1>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Напоминания о ритуалах</p>
              <p className="text-muted-foreground text-xs">Уведомления о невыполненных ритуалах</p>
            </div>
            <Switch
              checked={settings.ritualReminders}
              onCheckedChange={(v) => updateSetting("ritualReminders", v)}
              disabled={savingSettings}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Напоминания о чек-инах</p>
              <p className="text-muted-foreground text-xs">
                Утром и вечером, если чек-ин не сделан
              </p>
            </div>
            <Switch
              checked={settings.checkinReminders}
              onCheckedChange={(v) => updateSetting("checkinReminders", v)}
              disabled={savingSettings}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Напоминания о задачах</p>
              <p className="text-muted-foreground text-xs">Уведомления о дедлайнах задач</p>
            </div>
            <Switch
              checked={settings.taskReminders}
              onCheckedChange={(v) => updateSetting("taskReminders", v)}
              disabled={savingSettings}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Напоминание о БАДах</p>
              <p className="text-muted-foreground text-xs">
                Утром в 11:00 МСК, если добавки не отмечены
              </p>
            </div>
            <Switch
              checked={settings.supplementReminders}
              onCheckedChange={(v) => updateSetting("supplementReminders", v)}
              disabled={savingSettings}
            />
          </div>
        </CardContent>
      </Card>

      {/* Buddy Privacy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Приватность бадди
          </CardTitle>
          <p className="text-muted-foreground text-sm">Что видит твой бадди в твоём профиле</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {(
            [
              { value: "full", label: "Всё", desc: "Стрик, ритуалы, зал, вес, очки" },
              { value: "partial", label: "70%", desc: "Стрик, ритуалы, зал — без веса и очков" },
              { value: "streak", label: "Только стрик", desc: "Только имя и стрик" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => !savingSettings && updatePrivacy(opt.value)}
              disabled={savingSettings}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                settings.buddyPrivacy === opt.value
                  ? "bg-primary/20 border-primary/50"
                  : "border-muted hover:border-primary/30 hover:bg-muted/20"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-muted-foreground text-xs">{opt.desc}</p>
              </div>
              {settings.buddyPrivacy === opt.value && (
                <Check className="text-primary h-4 w-4 shrink-0" />
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Active Zones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4" />
            Активные зоны
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Управляйте какие зоны отображаются в аналитике
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "zoneHealthEnabled" as const, label: "Здоровье", emoji: "💪" },
            { key: "zoneLeakfixerEnabled" as const, label: "LeakFixer", emoji: "🔧" },
            { key: "zoneAiEnabled" as const, label: "ИИ / Подписки", emoji: "🤖" },
            { key: "zonePokerEnabled" as const, label: "Покер", emoji: "♠️" },
          ].map(({ key, label, emoji }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{emoji}</span>
                <p className="text-sm font-medium">{label}</p>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => updateSetting(key, v)}
                disabled={savingSettings}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bottom Nav Customization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Нижняя навигация</CardTitle>
          <p className="text-muted-foreground text-sm">
            Выберите от 1 до 6 разделов для быстрого доступа
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {ALL_NAV_OPTIONS.map((opt) => {
              const isSelected = localNavItems.includes(opt.screen);
              const isAtMax = localNavItems.length >= 6 && !isSelected;

              return (
                <button
                  key={opt.screen}
                  onClick={() => !isAtMax && toggleNavItem(opt.screen)}
                  disabled={isAtMax}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? "bg-primary/20 border-primary/50 text-foreground"
                      : isAtMax
                        ? "border-muted/30 cursor-not-allowed opacity-40"
                        : "border-muted hover:border-primary/30 hover:bg-muted/20"
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{opt.label}</p>
                  </div>
                  {isSelected && <Check className="text-primary h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-muted mt-4 flex items-center justify-between border-t pt-3">
            <span className="text-muted-foreground text-sm">
              Выбрано: {localNavItems.length} / 6
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalNavItems(DEFAULT_NAV_ITEMS)}
              >
                По умолчанию
              </Button>
              <Button size="sm" className="bg-primary" onClick={handleSaveNav}>
                Сохранить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nav order hint */}
      <Card className="border-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <GripVertical className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Порядок разделов</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Разделы отображаются в том порядке, в котором вы их выбираете
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
