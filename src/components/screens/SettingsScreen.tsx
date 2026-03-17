'use client'

import { useAppStore, Screen } from '@/lib/store'
import { ALL_NAV_OPTIONS } from '@/components/BottomNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, GripVertical, Check, Bell, LayoutGrid } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/network-utils'
import { useState, useEffect } from 'react'

interface UserSettings {
  ritualReminders: boolean
  taskReminders: boolean
  zoneHealthEnabled: boolean
  zoneLeakfixerEnabled: boolean
  zoneAiEnabled: boolean
  zonePokerEnabled: boolean
}

export function SettingsScreen() {
  const { user, setScreen, navItems, setNavItems } = useAppStore()
  const [localNavItems, setLocalNavItems] = useState<Screen[]>(
    navItems.length > 0 ? navItems : ['home', 'gym', 'rituals', 'goals', 'profile']
  )
  const [settings, setSettings] = useState<UserSettings>({
    ritualReminders: true,
    taskReminders: true,
    zoneHealthEnabled: true,
    zoneLeakfixerEnabled: true,
    zoneAiEnabled: true,
    zonePokerEnabled: true,
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Load settings from API
  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/settings?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings) {
          setSettings({
            ritualReminders: data.settings.ritualReminders ?? true,
            taskReminders: data.settings.taskReminders ?? true,
            zoneHealthEnabled: data.settings.zoneHealthEnabled ?? true,
            zoneLeakfixerEnabled: data.settings.zoneLeakfixerEnabled ?? true,
            zoneAiEnabled: data.settings.zoneAiEnabled ?? true,
            zonePokerEnabled: data.settings.zonePokerEnabled ?? true,
          })
        }
      })
      .catch(() => {})
  }, [user?.id])

  const toggleNavItem = (screen: Screen) => {
    setLocalNavItems(prev => {
      if (prev.includes(screen)) {
        if (prev.length <= 1) return prev
        return prev.filter(s => s !== screen)
      } else {
        if (prev.length >= 6) return prev
        return [...prev, screen]
      }
    })
  }

  const handleSaveNav = () => {
    setNavItems(localNavItems)
    showSuccessToast('Навигация сохранена')
  }

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    if (!user?.id) return
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    setSavingSettings(true)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, [key]: value }),
      })
    } catch (err) {
      showErrorToast(err, 'сохранение настроек')
      setSettings(prev => ({ ...prev, [key]: !value })) // revert
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen('profile')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Настройки</h1>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Напоминания о ритуалах</p>
              <p className="text-xs text-muted-foreground">Уведомления о невыполненных ритуалах</p>
            </div>
            <Switch
              checked={settings.ritualReminders}
              onCheckedChange={v => updateSetting('ritualReminders', v)}
              disabled={savingSettings}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Напоминания о задачах</p>
              <p className="text-xs text-muted-foreground">Уведомления о дедлайнах задач</p>
            </div>
            <Switch
              checked={settings.taskReminders}
              onCheckedChange={v => updateSetting('taskReminders', v)}
              disabled={savingSettings}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Zones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            Активные зоны
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Управляйте какие зоны отображаются в аналитике
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'zoneHealthEnabled' as const, label: 'Здоровье', emoji: '💪' },
            { key: 'zoneLeakfixerEnabled' as const, label: 'LeakFixer', emoji: '🔧' },
            { key: 'zoneAiEnabled' as const, label: 'ИИ / Подписки', emoji: '🤖' },
            { key: 'zonePokerEnabled' as const, label: 'Покер', emoji: '♠️' },
          ].map(({ key, label, emoji }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{emoji}</span>
                <p className="text-sm font-medium">{label}</p>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={v => updateSetting(key, v)}
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
          <p className="text-sm text-muted-foreground">
            Выберите от 1 до 6 разделов для быстрого доступа
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {ALL_NAV_OPTIONS.map(opt => {
              const isSelected = localNavItems.includes(opt.screen)
              const isAtMax = localNavItems.length >= 6 && !isSelected

              return (
                <button
                  key={opt.screen}
                  onClick={() => !isAtMax && toggleNavItem(opt.screen)}
                  disabled={isAtMax}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-primary/20 border-primary/50 text-foreground'
                      : isAtMax
                        ? 'border-muted/30 opacity-40 cursor-not-allowed'
                        : 'border-muted hover:border-primary/30 hover:bg-muted/20'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{opt.label}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-muted">
            <span className="text-sm text-muted-foreground">
              Выбрано: {localNavItems.length} / 6
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalNavItems(['home', 'gym', 'rituals', 'goals', 'profile'])}
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
            <GripVertical className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Порядок разделов</p>
              <p className="text-xs text-muted-foreground mt-1">
                Разделы отображаются в том порядке, в котором вы их выбираете
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
