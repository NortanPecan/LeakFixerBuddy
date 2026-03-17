'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DatePicker, DateBadge } from '@/components/DatePicker'
import { Plus, CheckCircle2, Circle, Droplets, Apple, Pill, Clock, ChevronRight, Trash2, Timer, Utensils } from 'lucide-react'
import { useEffect, useState } from 'react'
import { showErrorToast, showSuccessToast, isOnline } from '@/lib/network-utils'

// Time window labels
const TIME_WINDOW_LABELS: Record<string, { label: string; emoji: string }> = {
  morning: { label: 'Утро', emoji: '🌅' },
  day: { label: 'День', emoji: '☀️' },
  evening: { label: 'Вечер', emoji: '🌙' },
  any: { label: 'Любое', emoji: '⏰' }
}

// Meal type labels
const MEAL_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  breakfast: { label: 'Завтрак', emoji: '🍳' },
  lunch: { label: 'Обед', emoji: '🍽️' },
  dinner: { label: 'Ужин', emoji: '🥗' },
  snack: { label: 'Перекус', emoji: '🍎' },
  custom: { label: 'Другое...', emoji: '🍴' }
}

// Quality labels
const QUALITY_LABELS: Record<string, { label: string; color: string }> = {
  good: { label: 'Полезно', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  neutral: { label: 'Норм', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  bad: { label: 'Вредно', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
}

// Unit options for supplements
const UNIT_OPTIONS = [
  { value: 'мг', label: 'мг' },
  { value: 'г', label: 'г' },
  { value: 'табл', label: 'таблетка' },
  { value: 'капс', label: 'капсула' },
  { value: 'мл', label: 'мл' },
  { value: 'кап', label: 'капля' }
]

// Day labels for supplements
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface Supplement {
  id: string
  name: string
  dosage: string | null
  unit: string
  standardDose: number
  timeWindow: string
  days: number[]
  checked: boolean
  intakeId: string | null
}

interface SupplementsData {
  supplements: Supplement[]
  stats: {
    total: number
    checked: number
    progress: number
  }
}

interface FoodEntry {
  id: string
  name: string
  mealType: string
  time: string | null
  calories: number | null
  quality: string | null
  amount: string | null
  createdAt: string
}

interface FoodData {
  entries: FoodEntry[]
  totals: {
    calories: number
    protein: number
    fat: number
    carbs: number
  }
  byMealType: Record<string, FoodEntry[]>
}

interface WaterData {
  current: number
  target: number
  percentage: number
}

// Parse "HH:mm" → minutes since midnight
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function FastingWidget({ entries }: { entries: FoodEntry[] }) {
  const withTime = entries.filter(e => e.time && /^\d{2}:\d{2}$/.test(e.time))
  if (withTime.length < 2) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="w-5 h-5 text-violet-400" />
            Интервальное голодание
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-2">
            {withTime.length === 0
              ? 'Добавь приёмы пищи со временем, чтобы увидеть окно голодания'
              : 'Нужно минимум 2 записи с указанным временем'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const times = withTime.map(e => timeToMinutes(e.time!)).sort((a, b) => a - b)
  const firstMin = times[0]
  const lastMin = times[times.length - 1]
  const eatingWindow = (lastMin - firstMin) / 60
  const fastingWindow = 24 - eatingWindow

  const firstEntry = withTime.find(e => timeToMinutes(e.time!) === firstMin)!
  const lastEntry = withTime.slice().reverse().find(e => timeToMinutes(e.time!) === lastMin)!

  // Named protocols
  let protocol = ''
  let protocolColor = 'text-muted-foreground'
  if (fastingWindow >= 20) { protocol = '20:4'; protocolColor = 'text-violet-400' }
  else if (fastingWindow >= 18) { protocol = '18:6'; protocolColor = 'text-emerald-400' }
  else if (fastingWindow >= 16) { protocol = '16:8'; protocolColor = 'text-emerald-400' }
  else if (fastingWindow >= 14) { protocol = '14:10'; protocolColor = 'text-yellow-400' }
  else if (fastingWindow >= 12) { protocol = '12:12'; protocolColor = 'text-orange-400' }

  const fastingColor = fastingWindow >= 16 ? '#22c55e' : fastingWindow >= 14 ? '#f59e0b' : fastingWindow >= 12 ? '#f97316' : '#ef4444'
  const pct = Math.min((fastingWindow / 24) * 100, 100)

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="w-5 h-5 text-violet-400" />
          Интервальное голодание
          {protocol && (
            <span className={`ml-auto text-sm font-bold ${protocolColor}`}>{protocol}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fasting bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Голодание</span>
            <span className="font-bold" style={{ color: fastingColor }}>{fastingWindow.toFixed(1)} ч</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: fastingColor }}
            />
          </div>
        </div>

        {/* First / Last meal */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <Utensils className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
            <p className="text-xs text-muted-foreground">Первый приём</p>
            <p className="font-bold text-sm">{firstEntry.time}</p>
            <p className="text-xs text-muted-foreground truncate">{firstEntry.name}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-orange-400" />
            <p className="text-xs text-muted-foreground">Последний приём</p>
            <p className="font-bold text-sm">{lastEntry.time}</p>
            <p className="text-xs text-muted-foreground truncate">{lastEntry.name}</p>
          </div>
        </div>

        {/* Eating window */}
        <div className="flex items-center justify-between text-sm bg-muted/20 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">Окно еды</span>
          <span className="font-medium">{eatingWindow.toFixed(1)} ч</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function HealthScreen() {
  const { user, selectedDate, isToday } = useAppStore()
  
  // Data state
  const [supplementsData, setSupplementsData] = useState<SupplementsData | null>(null)
  const [foodData, setFoodData] = useState<FoodData | null>(null)
  const [waterData, setWaterData] = useState<WaterData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Dialog states
  const [showAddSupplement, setShowAddSupplement] = useState(false)
  const [showAddFood, setShowAddFood] = useState(false)
  
  // Form states
  const [newSupplement, setNewSupplement] = useState({
    name: '',
    dosage: '',
    unit: 'мг',
    timeWindow: 'any',
    days: [1, 2, 3, 4, 5, 6, 7]
  })
  
  const [newFood, setNewFood] = useState({
    name: '',
    mealType: 'snack',
    customMealType: '',
    time: '',
    calories: '',
    quality: 'neutral',
    amount: ''
  })
  
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null)

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      
      setLoading(true)
      try {
        // Load supplements for selected date
        const supplementsRes = await fetch(`/api/supplements?userId=${user.id}&date=${selectedDate}`)
        const supplementsJson = await supplementsRes.json()
        if (supplementsJson.success) {
          setSupplementsData(supplementsJson)
        }
        
        // Load food for selected date
        const foodRes = await fetch(`/api/food?userId=${user.id}&date=${selectedDate}`)
        const foodJson = await foodRes.json()
        if (foodJson.success) {
          setFoodData(foodJson)
        }
        
        // Load water for selected date
        const waterRes = await fetch(`/api/water?userId=${user.id}&date=${selectedDate}`)
        const waterJson = await waterRes.json()
        if (waterJson.success) {
          setWaterData(waterJson.water)
        }
      } catch (error) {
        showErrorToast(error, 'загрузка данных о здоровье')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [user?.id, selectedDate])

  // Toggle supplement intake
  const handleToggleSupplement = async (supplement: Supplement) => {
    if (!user?.id) return
    
    try {
      await fetch('/api/supplements/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementId: supplement.id,
          userId: user.id,
          date: selectedDate,
          checked: !supplement.checked
        })
      })
      
      // Reload supplements
      const res = await fetch(`/api/supplements?userId=${user.id}&date=${selectedDate}`)
      const json = await res.json()
      if (json.success) {
        setSupplementsData(json)
      }
    } catch (error) {
      showErrorToast(error, 'отметка БАДа')
    }
  }

  // Add supplement
  const handleAddSupplement = async () => {
    if (!user?.id || !newSupplement.name) return
    
    try {
      await fetch('/api/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: newSupplement.name,
          dosage: newSupplement.dosage || null,
          unit: newSupplement.unit,
          timeWindow: newSupplement.timeWindow,
          days: newSupplement.days
        })
      })
      
      // Reload supplements
      const res = await fetch(`/api/supplements?userId=${user.id}&date=${selectedDate}`)
      const json = await res.json()
      if (json.success) {
        setSupplementsData(json)
      }
      
      setShowAddSupplement(false)
      setNewSupplement({
        name: '',
        dosage: '',
        unit: 'мг',
        timeWindow: 'any',
        days: [1, 2, 3, 4, 5, 6, 7]
      })
      showSuccessToast('БАД добавлен')
    } catch (error) {
      showErrorToast(error, 'добавление БАДа')
    }
  }

  // Delete supplement
  const handleDeleteSupplement = async (id: string) => {
    if (!user?.id) return
    
    try {
      await fetch(`/api/supplements?id=${id}`, { method: 'DELETE' })
      
      // Reload supplements
      const res = await fetch(`/api/supplements?userId=${user.id}&date=${selectedDate}`)
      const json = await res.json()
      if (json.success) {
        setSupplementsData(json)
      }
      showSuccessToast('БАД удалён')
    } catch (error) {
      showErrorToast(error, 'удаление БАДа')
    }
  }

  // Add food entry
  const handleAddFood = async () => {
    if (!user?.id || !newFood.name) return
    
    const mealType = newFood.mealType === 'custom' 
      ? `custom:${newFood.customMealType || 'Другое'}`
      : newFood.mealType
    
    try {
      const postRes = await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: selectedDate,
          name: newFood.name,
          mealType: mealType,
          time: newFood.time || null,
          calories: newFood.calories ? parseInt(newFood.calories) : null,
          quality: newFood.quality,
          amount: newFood.amount || null
        })
      })
      if (!postRes.ok) throw new Error('Failed to save food entry')

      // Reload food
      const res = await fetch(`/api/food?userId=${user.id}&date=${selectedDate}`)
      const json = await res.json()
      if (json.success) {
        setFoodData(json)
      }
      
      setShowAddFood(false)
      setNewFood({
        name: '',
        mealType: 'snack',
        customMealType: '',
        time: '',
        calories: '',
        quality: 'neutral',
        amount: ''
      })
      showSuccessToast('Еда добавлена')
    } catch (error) {
      showErrorToast(error, 'добавление еды')
    }
  }

  // Delete food entry
  const handleDeleteFood = async (id: string) => {
    if (!user?.id) return
    
    try {
      await fetch(`/api/food?id=${id}`, { method: 'DELETE' })
      
      // Reload food
      const res = await fetch(`/api/food?userId=${user.id}&date=${selectedDate}`)
      const json = await res.json()
      if (json.success) {
        setFoodData(json)
      }
      showSuccessToast('Запись удалена')
    } catch (error) {
      showErrorToast(error, 'удаление еды')
    }
  }

  // Update food entry
  const handleUpdateFood = async () => {
    if (!user?.id || !editingFood) return
    
    try {
      await fetch('/api/food', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingFood.id,
          name: editingFood.name,
          mealType: editingFood.mealType,
          time: editingFood.time,
          calories: editingFood.calories,
          quality: editingFood.quality,
          amount: editingFood.amount
        })
      })
      
      // Reload food
      const res = await fetch(`/api/food?userId=${user.id}&date=${selectedDate}`)
      const json = await res.json()
      if (json.success) {
        setFoodData(json)
      }
      
      setEditingFood(null)
      showSuccessToast('Запись обновлена')
    } catch (error) {
      showErrorToast(error, 'обновление еды')
    }
  }

  // Update water
  const handleUpdateWater = async (delta: number) => {
    if (!user?.id || !waterData) return
    
    const newAmount = Math.max(0, waterData.current + delta)
    
    try {
      await fetch('/api/water', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: selectedDate,
          amount: newAmount
        })
      })
      
      setWaterData({
        ...waterData,
        current: newAmount,
        percentage: Math.round((newAmount / waterData.target) * 100)
      })
    } catch (error) {
      showErrorToast(error, 'обновление воды')
    }
  }

  // Toggle day in supplement form
  const toggleDay = (day: number) => {
    const days = newSupplement.days.includes(day)
      ? newSupplement.days.filter(d => d !== day)
      : [...newSupplement.days, day]
    setNewSupplement({ ...newSupplement, days })
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <h1 className="text-2xl font-bold text-foreground">Здоровье</h1>
        <div className="text-center py-8 text-muted-foreground">
          Загрузка...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Здоровье</h1>
        <DateBadge />
      </div>

      {/* Date Picker */}
      <DatePicker variant="compact" />

      {/* SUPPLEMENTS SECTION */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="w-5 h-5" />
              БАДы
            </CardTitle>
            <div className="flex items-center gap-2">
              {supplementsData && (
                <Badge variant="outline" className="text-xs">
                  {supplementsData.stats.checked}/{supplementsData.stats.total}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowAddSupplement(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {supplementsData?.supplements.length ? (
            <>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Прогресс</span>
                  <span className="text-xs font-medium">{supplementsData.stats.progress}%</span>
                </div>
                <Progress value={supplementsData.stats.progress} className="h-2" />
              </div>
              
              {/* Supplements list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {supplementsData.supplements.map(supplement => {
                  const timeWindow = TIME_WINDOW_LABELS[supplement.timeWindow] || TIME_WINDOW_LABELS.any
                  
                  return (
                    <div
                      key={supplement.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                        supplement.checked
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                      onClick={() => handleToggleSupplement(supplement)}
                    >
                      {supplement.checked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${supplement.checked ? 'text-emerald-400' : ''}`}>
                            {supplement.name}
                          </p>
                          {supplement.dosage && (
                            <Badge variant="secondary" className="text-xs">
                              {supplement.dosage}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{timeWindow.emoji} {timeWindow.label}</span>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSupplement(supplement.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Pill className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Нет добавок</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowAddSupplement(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Добавить БАД
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FOOD SECTION */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Apple className="w-5 h-5" />
              Еда
            </CardTitle>
            <div className="flex items-center gap-2">
              {foodData && (
                <Badge variant="outline" className="text-xs">
                  {foodData.totals.calories} ккал
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowAddFood(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {foodData?.entries.length ? (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {/* Grouped by meal type */}
              {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
                const entries = foodData.byMealType[mealType] || []
                if (entries.length === 0) return null
                
                const mealLabel = MEAL_TYPE_LABELS[mealType]
                
                return (
                  <div key={mealType}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <span>{mealLabel.emoji}</span>
                      {mealLabel.label}
                    </p>
                    <div className="space-y-2">
                      {entries.map(entry => {
                        const quality = entry.quality ? QUALITY_LABELS[entry.quality] : null
                        
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setEditingFood(entry)}>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{entry.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {entry.time && <span>{entry.time}</span>}
                                  {entry.time && entry.calories && <span>•</span>}
                                  {entry.calories && <span>{entry.calories} ккал</span>}
                                  {entry.amount && <span>• {entry.amount}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {quality && (
                                <Badge variant="outline" className={`text-xs ${quality.color}`}>
                                  {quality.label}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100"
                                onClick={() => setEditingFood(entry)}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                                onClick={() => handleDeleteFood(entry.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              
              {/* Custom meal types */}
              {foodData && Object.keys(foodData.byMealType)
                .filter(type => type.startsWith('custom:'))
                .map(customType => {
                  const entries = foodData.byMealType[customType] || []
                  if (entries.length === 0) return null
                  
                  const customName = customType.substring(7) // Remove 'custom:' prefix
                  
                  return (
                    <div key={customType}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <span>🍴</span>
                        {customName}
                      </p>
                      <div className="space-y-2">
                        {entries.map(entry => {
                          const quality = entry.quality ? QUALITY_LABELS[entry.quality] : null
                          
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setEditingFood(entry)}>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{entry.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {entry.time && <span>{entry.time}</span>}
                                    {entry.time && entry.calories && <span>•</span>}
                                    {entry.calories && <span>{entry.calories} ккал</span>}
                                    {entry.amount && <span>• {entry.amount}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {quality && (
                                  <Badge variant="outline" className={`text-xs ${quality.color}`}>
                                    {quality.label}
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100"
                                  onClick={() => setEditingFood(entry)}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                                  onClick={() => handleDeleteFood(entry.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-4">
              <Apple className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Нет записей о еде</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowAddFood(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Добавить еду
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FASTING WIDGET */}
      <FastingWidget entries={foodData?.entries ?? []} />

      {/* WATER SECTION */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="w-5 h-5" />
            Вода
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waterData && (
            <>
              {/* Progress display */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Droplets className="w-6 h-6 text-cyan-400" />
                  <span className="text-3xl font-bold text-primary">{waterData.current}</span>
                  <span className="text-lg text-muted-foreground">/ {waterData.target} мл</span>
                </div>
                <Badge
                  variant={waterData.percentage >= 100 ? 'default' : 'outline'}
                  className={waterData.percentage >= 100 ? 'bg-emerald-500 text-white' : ''}
                >
                  {waterData.percentage >= 100 ? 'Цель достигнута!' : `${waterData.percentage}%`}
                </Badge>
              </div>
              
              {/* Progress bar */}
              <Progress 
                value={Math.min(waterData.percentage, 100)} 
                className="h-3 mb-4"
              />
              
              {/* Quick buttons */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateWater(-500)}
                  disabled={waterData.current < 500}
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  -500
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateWater(-200)}
                  disabled={waterData.current < 200}
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  -200
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateWater(200)}
                  className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                >
                  +200
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateWater(500)}
                  className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                >
                  +500
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ADD SUPPLEMENT DIALOG */}
      <Dialog open={showAddSupplement} onOpenChange={setShowAddSupplement}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый БАД</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="Витамин D, Креатин..."
                value={newSupplement.name}
                onChange={e => setNewSupplement({ ...newSupplement, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Дозировка</Label>
                <Input
                  placeholder="2000"
                  value={newSupplement.dosage}
                  onChange={e => setNewSupplement({ ...newSupplement, dosage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Единица</Label>
                <Select
                  value={newSupplement.unit}
                  onValueChange={v => setNewSupplement({ ...newSupplement, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Время приёма</Label>
              <Select
                value={newSupplement.timeWindow}
                onValueChange={v => setNewSupplement({ ...newSupplement, timeWindow: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_WINDOW_LABELS).map(([key, { label, emoji }]) => (
                    <SelectItem key={key} value={key}>
                      {emoji} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Дни приёма</Label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, index) => {
                  const day = index + 1
                  const isActive = newSupplement.days.includes(day)
                  return (
                    <Button
                      key={day}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      className={`flex-1 px-0 ${isActive ? 'bg-primary' : ''}`}
                      onClick={() => toggleDay(day)}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddSupplement(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleAddSupplement}
                disabled={!newSupplement.name}
              >
                Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD FOOD DIALOG */}
      <Dialog open={showAddFood} onOpenChange={setShowAddFood}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить еду</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="Овсянка с ягодами..."
                value={newFood.name}
                onChange={e => setNewFood({ ...newFood, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Приём пищи</Label>
                <Select
                  value={newFood.mealType}
                  onValueChange={v => setNewFood({ ...newFood, mealType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEAL_TYPE_LABELS).map(([key, { label, emoji }]) => (
                      <SelectItem key={key} value={key}>
                        {emoji} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Время</Label>
                <Input
                  type="time"
                  value={newFood.time}
                  onChange={e => setNewFood({ ...newFood, time: e.target.value })}
                />
              </div>
            </div>
            
            {newFood.mealType === 'custom' && (
              <div className="space-y-2">
                <Label>Название приёма пищи</Label>
                <Input
                  placeholder="Например: Полдник"
                  value={newFood.customMealType}
                  onChange={e => setNewFood({ ...newFood, customMealType: e.target.value })}
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Калории</Label>
                <Input
                  type="number"
                  placeholder="300"
                  value={newFood.calories}
                  onChange={e => setNewFood({ ...newFood, calories: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input
                  placeholder="200г"
                  value={newFood.amount}
                  onChange={e => setNewFood({ ...newFood, amount: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Качество</Label>
              <Select
                value={newFood.quality}
                onValueChange={v => setNewFood({ ...newFood, quality: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUALITY_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddFood(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleAddFood}
                disabled={!newFood.name}
              >
                Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT FOOD DIALOG */}
      <Dialog open={!!editingFood} onOpenChange={() => setEditingFood(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать еду</DialogTitle>
          </DialogHeader>
          {editingFood && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={editingFood.name}
                  onChange={e => setEditingFood({ ...editingFood, name: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Приём пищи</Label>
                  <Select
                    value={editingFood.mealType}
                    onValueChange={v => setEditingFood({ ...editingFood, mealType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEAL_TYPE_LABELS).map(([key, { label, emoji }]) => (
                        <SelectItem key={key} value={key}>
                          {emoji} {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Время</Label>
                  <Input
                    type="time"
                    value={editingFood.time || ''}
                    onChange={e => setEditingFood({ ...editingFood, time: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Калории</Label>
                  <Input
                    type="number"
                    value={editingFood.calories || ''}
                    onChange={e => setEditingFood({ ...editingFood, calories: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Количество</Label>
                  <Input
                    value={editingFood.amount || ''}
                    onChange={e => setEditingFood({ ...editingFood, amount: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Качество</Label>
                <Select
                  value={editingFood.quality || 'neutral'}
                  onValueChange={v => setEditingFood({ ...editingFood, quality: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUALITY_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingFood(null)}
                >
                  Отмена
                </Button>
                <Button
                  className="flex-1 bg-primary"
                  onClick={handleUpdateFood}
                >
                  Сохранить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
