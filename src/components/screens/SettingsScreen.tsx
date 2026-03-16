'use client'

import { useAppStore, Screen } from '@/lib/store'
import { ALL_NAV_OPTIONS } from '@/components/BottomNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, GripVertical, Check } from 'lucide-react'
import { showSuccessToast } from '@/lib/network-utils'
import { useState } from 'react'

export function SettingsScreen() {
  const { setScreen, navItems, setNavItems } = useAppStore()
  const [localNavItems, setLocalNavItems] = useState<Screen[]>(
    navItems.length > 0 ? navItems : ['home', 'gym', 'rituals', 'goals', 'profile']
  )

  const toggleNavItem = (screen: Screen) => {
    setLocalNavItems(prev => {
      if (prev.includes(screen)) {
        if (prev.length <= 1) return prev // min 1 item
        return prev.filter(s => s !== screen)
      } else {
        if (prev.length >= 6) return prev // max 6 items
        return [...prev, screen]
      }
    })
  }

  const handleSave = () => {
    setNavItems(localNavItems)
    showSuccessToast('Настройки сохранены')
    setScreen('home')
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
              <Button size="sm" className="bg-primary" onClick={handleSave}>
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
