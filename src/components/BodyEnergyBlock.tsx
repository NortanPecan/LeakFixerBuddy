'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Zap, Settings, TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react'

interface EnergyData {
  bmr: number
  tdee: number
  workMultiplier: number
  caloriesEaten: number
  foodEntriesCount: number
  balance: number
  targetCalories: number
  balanceStatus: 'deficit' | 'surplus' | 'balanced'
  hasProfileData: boolean
  missingFields?: {
    weight: boolean
    height: boolean
    age: boolean
    sex: boolean
  }
  profile?: {
    weight: number
    height: number
    age: number
    sex: string | null
    workProfile: string | null
  }
}

interface BodyEnergyBlockProps {
  userId: string
  onRefresh?: () => void
}

// Work profile options
const WORK_PROFILE_OPTIONS = [
  { value: 'sedentary', label: 'Сидячая работа', multiplier: 1.2 },
  { value: 'mixed', label: 'На ногах весь день', multiplier: 1.4 },
  { value: 'physical', label: 'Физическая работа', multiplier: 1.6 },
  { value: 'variable', label: 'График меняется', multiplier: 1.3 },
]

export function BodyEnergyBlock({ userId, onRefresh }: BodyEnergyBlockProps) {
  const [energy, setEnergy] = useState<EnergyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    age: '',
    sex: 'male',
    workProfile: 'sedentary'
  })

  // Load energy data
  useEffect(() => {
    const loadEnergy = async () => {
      if (!userId) return
      
      setLoading(true)
      try {
        const res = await fetch(`/api/energy?userId=${userId}`)
        const json = await res.json()
        if (json.success) {
          setEnergy(json.energy)
          
          // Pre-fill form if profile exists
          if (json.energy.profile) {
            setFormData({
              weight: json.energy.profile.weight?.toString() || '',
              height: json.energy.profile.height?.toString() || '',
              age: json.energy.profile.age?.toString() || '',
              sex: json.energy.profile.sex || 'male',
              workProfile: json.energy.profile.workProfile || 'sedentary'
            })
          }
        }
      } catch (error) {
        console.error('Failed to load energy:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEnergy()
  }, [userId])

  // Save profile settings
  const handleSaveSettings = async () => {
    if (!userId) return
    
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          profile: {
            weight: formData.weight ? parseFloat(formData.weight) : null,
            height: formData.height ? parseFloat(formData.height) : null,
            age: formData.age ? parseInt(formData.age) : null,
            sex: formData.sex,
            workProfile: formData.workProfile
          }
        })
      })
      
      // Reload energy data
      const res = await fetch(`/api/energy?userId=${userId}`)
      const json = await res.json()
      if (json.success) {
        setEnergy(json.energy)
      }
      
      setShowSettings(false)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-4">
          <div className="text-center py-4 text-muted-foreground">
            Загрузка...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!energy) {
    return null
  }

  // Calculate percentage for progress bar
  const progressPercent = energy.targetCalories > 0 
    ? Math.min(100, (energy.caloriesEaten / energy.targetCalories) * 100)
    : 0

  return (
    <>
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Энергия тела
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!energy.hasProfileData && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-400">
                Заполните профиль для точного расчёта
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-xs text-amber-400"
                onClick={() => setShowSettings(true)}
              >
                Настроить
              </Button>
            </div>
          )}
          
          {/* Main balance display */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              {energy.balance < 0 ? (
                <TrendingDown className="w-5 h-5 text-emerald-400" />
              ) : energy.balance > 0 ? (
                <TrendingUp className="w-5 h-5 text-red-400" />
              ) : (
                <Minus className="w-5 h-5 text-muted-foreground" />
              )}
              <span className={`text-3xl font-bold ${
                energy.balance < -300 ? 'text-emerald-400' :
                energy.balance > 300 ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {energy.balance > 0 ? '+' : ''}{energy.balance}
              </span>
              <span className="text-sm text-muted-foreground">ккал</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {energy.balance < -300 ? '🔥 Дефицит — отлично для похудения!' :
               energy.balance > 300 ? '⚠️ Профицит — избыток калорий' :
               '✓ Баланс — норма'}
            </p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Съедено / Цель</span>
              <span className="text-xs font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-cyan-400">{energy.bmr}</p>
              <p className="text-xs text-muted-foreground">BMR</p>
              <p className="text-[10px] text-muted-foreground/60">Метаболизм</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-orange-400">{energy.tdee}</p>
              <p className="text-xs text-muted-foreground">TDEE</p>
              <p className="text-[10px] text-muted-foreground/60">Расход</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-green-400">{energy.caloriesEaten}</p>
              <p className="text-xs text-muted-foreground">Съедено</p>
              <p className="text-[10px] text-muted-foreground/60">
                {energy.foodEntriesCount || 0} записей
              </p>
            </div>
          </div>

          {/* Work profile indicator */}
          {energy.hasProfileData && energy.profile?.workProfile && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Активность:</span>
              <Badge variant="outline" className="text-xs">
                {WORK_PROFILE_OPTIONS.find(o => o.value === energy.profile?.workProfile)?.label || 'Не указан'}
                <span className="ml-1 opacity-60">×{energy.workMultiplier.toFixed(1)}</span>
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Параметры для расчёта</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground">
              Для расчёта BMR и TDEE нужны ваши параметры
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Вес (кг)</Label>
                <Input
                  type="number"
                  placeholder="75"
                  value={formData.weight}
                  onChange={e => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Рост (см)</Label>
                <Input
                  type="number"
                  placeholder="175"
                  value={formData.height}
                  onChange={e => setFormData(prev => ({ ...prev, height: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Возраст</Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.age}
                  onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Пол</Label>
                <Select
                  value={formData.sex}
                  onValueChange={v => setFormData(prev => ({ ...prev, sex: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Мужской</SelectItem>
                    <SelectItem value="female">Женский</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Тип работы</Label>
              <Select
                value={formData.workProfile}
                onValueChange={v => setFormData(prev => ({ ...prev, workProfile: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_PROFILE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} (×{opt.multiplier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSettings(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleSaveSettings}
                disabled={!formData.weight || !formData.height || !formData.age}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
