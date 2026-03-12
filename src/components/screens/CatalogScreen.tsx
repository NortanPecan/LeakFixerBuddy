'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Check,
  BookOpen
} from 'lucide-react'
import {
  CATEGORY_LABELS,
  TIME_WINDOW_LABELS,
  type RitualCategory,
  type CatalogRitual,
  type AttributeKey
} from '@/lib/rituals/data'
import { RITUAL_CATALOG, SWAMP_ESCAPE_PRESET } from '@/lib/rituals/presets'

export function CatalogScreen() {
  const { user, setScreen } = useAppStore()
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [presetApplied, setPresetApplied] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<RitualCategory | 'all'>('all')

  // Add ritual from catalog
  const handleAddRitual = async (ritual: CatalogRitual) => {
    if (!user?.id) return
    setAddingId(ritual.id)

    try {
      const response = await fetch('/api/rituals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: ritual.title,
          type: 'regular',
          category: ritual.category,
          days: ritual.days,
          timeWindow: ritual.timeWindow,
          goalShort: ritual.goalShort,
          description: ritual.description,
          attributes: ritual.attributes,
          isFromPreset: true,
          presetId: `catalog_${ritual.id}`
        })
      })

      if (response.ok) {
        setAddedIds(prev => new Set(prev).add(ritual.id))
      }
    } catch (error) {
      console.error('Failed to add ritual:', error)
    } finally {
      setAddingId(null)
    }
  }

  // Apply preset
  const handleApplyPreset = async () => {
    if (!user?.id) return
    setAddingId('preset')

    try {
      const response = await fetch('/api/rituals/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, presetId: 'swamp_escape' })
      })

      if (response.ok) {
        setPresetApplied(true)
      }
    } catch (error) {
      console.error('Failed to apply preset:', error)
    } finally {
      setAddingId(null)
    }
  }

  // Filter rituals by category
  const filteredRituals = selectedCategory === 'all' 
    ? RITUAL_CATALOG 
    : RITUAL_CATALOG.filter(r => r.category === selectedCategory)

  const categories: (RitualCategory | 'all')[] = ['all', 'health', 'mind', 'learning', 'productivity', 'money', 'relationships']

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setScreen('rituals')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Каталог ритуалов</h1>
          <p className="text-sm text-muted-foreground">Готовые шаблоны</p>
        </div>
      </div>

      {/* Featured Preset */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">
              {SWAMP_ESCAPE_PRESET.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{SWAMP_ESCAPE_PRESET.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {SWAMP_ESCAPE_PRESET.description}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="outline" className="text-xs">
                  {SWAMP_ESCAPE_PRESET.rituals.length} ритуалов
                </Badge>
              </div>
            </div>
          </div>
          
          {presetApplied ? (
            <Button className="w-full mt-3 bg-emerald-600" disabled>
              <Check className="w-4 h-4 mr-2" />
              Подключено!
            </Button>
          ) : (
            <Button 
              className="w-full mt-3 bg-primary"
              onClick={handleApplyPreset}
              disabled={addingId === 'preset'}
            >
              {addingId === 'preset' ? (
                'Подключение...'
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Подключить пакет
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Category filters */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4">
        {categories.map(cat => {
          const label = cat === 'all' 
            ? 'Все' 
            : CATEGORY_LABELS[cat as RitualCategory]?.label || cat
          const icon = cat === 'all'
            ? ''
            : CATEGORY_LABELS[cat as RitualCategory]?.icon || ''
          
          return (
            <button
              key={cat}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {icon} {label}
            </button>
          )
        })}
      </div>

      {/* Rituals list */}
      <div className="space-y-2">
        {filteredRituals.map(ritual => {
          const category = CATEGORY_LABELS[ritual.category as RitualCategory]
          const isAdded = addedIds.has(ritual.id)
          const isAdding = addingId === ritual.id

          return (
            <Card key={ritual.id} className="bg-card/50 backdrop-blur">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{ritual.icon || '✨'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{ritual.title}</h4>
                      {category && (
                        <Badge className={category.color}>
                          {category.icon}
                        </Badge>
                      )}
                    </div>
                    {ritual.goalShort && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {ritual.goalShort}
                      </p>
                    )}
                    {/* Attributes */}
                    <div className="flex gap-1 mt-2">
                      {ritual.attributes.map(attr => (
                        <span key={attr} className="text-sm">
                          {attr === 'health' ? '❤️' : attr === 'mind' ? '🧠' : '💪'}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {isAdded ? (
                    <Button size="sm" variant="outline" disabled className="shrink-0">
                      <Check className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="shrink-0 bg-primary"
                      onClick={() => handleAddRitual(ritual)}
                      disabled={isAdding}
                    >
                      {isAdding ? (
                        '...'
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
