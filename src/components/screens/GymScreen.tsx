'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dumbbell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  Target,
  Trophy,
  Clock,
  X,
  ArrowRight,
  Trash2,
  Edit3,
  Weight,
  Coffee,
  GripVertical,
  SkipForward,
  CalendarClock,
  Sparkles,
  CalendarDays,
  Save
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Types
interface GymExerciseSet {
  id: string
  setNum: number
  weight?: number
  reps?: number
  duration?: number
  completed: boolean
}

interface GymExercise {
  id: string
  name: string
  muscleGroup?: string
  order: number
  sets: GymExerciseSet[]
}

interface GymWorkout {
  id: string
  date: string
  dayOfWeek: number
  workoutNum: number
  name: string | null
  muscleGroups?: string[]
  duration: number | null
  completed: boolean
  exercises?: GymExercise[]
}

interface GymPeriod {
  id: string
  name: string
  type: string
  cycleLength: number
  workoutsPerCycle: number
  totalCycles: number
  currentCycle: number
  currentDay: number
  isActive: boolean
  startDate: string
  daySchedule?: string // JSON string with DayScheduleItem[]
}

// Constants
const TRAINING_TYPES = [
  { value: 'strength', label: 'На силу', desc: 'Рост рабочих весов и силы' },
  { value: 'endurance', label: 'На выносливость', desc: 'Больше объём и длительность' },
  { value: 'custom', label: 'Своё название', desc: 'Задай своё название' },
]

const SPLIT_TYPES = [
  { value: 'split', label: 'Сплит', desc: 'Разделение по группам: грудь/спина/ноги…' },
  { value: 'fullbody', label: 'Фулбоди', desc: 'Все тело за тренировку, 2–4 раза в неделю' },
  { value: 'ppl', label: 'PPL', desc: 'Push/Pull/Legs' },
  { value: 'upper_lower', label: 'Верх/Низ', desc: 'Чередование верха и низа' },
  { value: 'custom', label: 'Своя схема', desc: 'Сам задашь дни и мышцы' },
]

const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Грудь', color: 'bg-red-500/20 text-red-300' },
  { value: 'back', label: 'Спина', color: 'bg-blue-500/20 text-blue-300' },
  { value: 'legs', label: 'Ноги', color: 'bg-green-500/20 text-green-300' },
  { value: 'shoulders', label: 'Плечи', color: 'bg-orange-500/20 text-orange-300' },
  { value: 'biceps', label: 'Бицепс', color: 'bg-purple-500/20 text-purple-300' },
  { value: 'triceps', label: 'Трицепс', color: 'bg-pink-500/20 text-pink-300' },
  { value: 'core', label: 'Пресс', color: 'bg-yellow-500/20 text-yellow-300' },
]

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const EXERCISE_DATABASE: Record<string, string[]> = {
  chest: ['Жим лёжа', 'Жим гантелей', 'Разводка гантелей', 'Отжимания', 'Жим на наклонной', 'Кроссовер'],
  back: ['Тяга штанги', 'Подтягивания', 'Тяга гантели', 'Горизонтальная тяга', 'Тяга верхнего блока', 'Гиперэкстензия'],
  legs: ['Приседания', 'Жим ногами', 'Выпады', 'Румынская тяга', 'Разгибание ног', 'Сгибание ног', 'Икры'],
  shoulders: ['Армейский жим', 'Махи гантелями', 'Тяга к подбородку', 'Жим Арнольда', 'Разводка в наклоне'],
  biceps: ['Подъём штанги', 'Подъём гантелей', 'Молотки', 'Концентрированные сгибания', 'Сгибание на скамье'],
  triceps: ['Французский жим', 'Разгибание на блоке', 'Отжимания на брусьях', 'Разгибание гантели', 'Кик-бэк'],
  core: ['Скручивания', 'Планка', 'Подъём ног', 'Русский твист', 'Боковая планка', 'Уголок'],
}

// Workout templates for quick setup
const WORKOUT_TEMPLATES = [
  {
    id: 'upper_lower_6',
    name: 'Верх/Низ (4 за 6)',
    description: 'Верх, Низ, Отдых, Отдых, Верх, Низ',
    cycleLength: 6,
    workoutsPerCycle: 4,
    splitType: 'upper_lower',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Верх 1', muscleGroups: ['chest', 'back', 'shoulders'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Низ 1', muscleGroups: ['legs'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 3, name: 'Верх 2', muscleGroups: ['chest', 'back', 'shoulders'] },
      { type: 'workout' as const, workoutNum: 4, name: 'Низ 2', muscleGroups: ['legs'] },
    ],
  },
  {
    id: 'ppl_6',
    name: 'PPL (3 за 6)',
    description: 'Push, Pull, Legs, Отдых × 3',
    cycleLength: 6,
    workoutsPerCycle: 3,
    splitType: 'ppl',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Push', muscleGroups: ['chest', 'shoulders', 'triceps'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Pull', muscleGroups: ['back', 'biceps'] },
      { type: 'workout' as const, workoutNum: 3, name: 'Legs', muscleGroups: ['legs'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
      { type: 'rest' as const },
    ],
  },
  {
    id: 'split_7',
    name: 'Классический сплит (4 за 7)',
    description: 'Грудь, Спина, Ноги, Отдых, Плечи, Отдых, Отдых',
    cycleLength: 7,
    workoutsPerCycle: 4,
    splitType: 'split',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Грудь + Трицепс', muscleGroups: ['chest', 'triceps'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Спина + Бицепс', muscleGroups: ['back', 'biceps'] },
      { type: 'workout' as const, workoutNum: 3, name: 'Ноги', muscleGroups: ['legs'] },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 4, name: 'Плечи + Пресс', muscleGroups: ['shoulders', 'core'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
    ],
  },
  {
    id: 'fullbody_7',
    name: 'Фулбоди (3 за 7)',
    description: 'Пн/Ср/Пт — всё тело, остальные отдых',
    cycleLength: 7,
    workoutsPerCycle: 3,
    splitType: 'fullbody',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Фулбоди 1', muscleGroups: ['chest', 'back', 'legs'] },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 2, name: 'Фулбоди 2', muscleGroups: ['shoulders', 'legs', 'core'] },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 3, name: 'Фулбоди 3', muscleGroups: ['chest', 'back', 'legs'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
    ],
  },
]

// Day schedule item type
interface DayScheduleItem {
  type: 'workout' | 'rest'
  dayNum: number
  workoutNum?: number
  name?: string
  muscleGroups?: string[]
}

// Workout day config for wizard
interface WorkoutDayConfig {
  dayNum: number
  muscles: string[]
  name: string
}

export function GymScreen() {
  const { user } = useAppStore()
  const [periods, setPeriods] = useState<GymPeriod[]>([])
  const [activePeriod, setActivePeriod] = useState<GymPeriod | null>(null)
  const [workouts, setWorkouts] = useState<GymWorkout[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  
  // Wizard state
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardConfig, setWizardConfig] = useState({
    type: 'strength',
    customName: '',
    cycleLength: 7,
    workoutsPerCycle: 3,
    totalCycles: 8,
    splitType: 'split',
  })
  const [workoutDays, setWorkoutDays] = useState<WorkoutDayConfig[]>([])
  
  // Day schedule for wizard step 3
  const [daySchedule, setDaySchedule] = useState<DayScheduleItem[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // Parsed day schedule for display
  const [parsedDaySchedule, setParsedDaySchedule] = useState<DayScheduleItem[]>([])
  
  // Workout detail
  const [selectedWorkout, setSelectedWorkout] = useState<GymWorkout | null>(null)
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false)
  
  // Exercise editor
  const [editingExercise, setEditingExercise] = useState<GymExercise | null>(null)
  const [showExerciseEditor, setShowExerciseEditor] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseMuscle, setNewExerciseMuscle] = useState('')

  // Load gym periods
  useEffect(() => {
    const loadPeriods = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        const response = await fetch(`/api/gym?userId=${user.id}`)
        const data = await response.json()
        setPeriods(data.periods || [])
        if (data.periods?.length > 0) {
          const active = data.periods.find((p: GymPeriod) => p.isActive)
          setActivePeriod(active || data.periods[0])
        }
      } catch (error) {
        console.error('Failed to load gym periods:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadPeriods()
  }, [user?.id])

  // Load workouts for active period
  useEffect(() => {
    const loadWorkouts = async () => {
      if (!activePeriod?.id) return
      try {
        const response = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
        const data = await response.json()
        
        // Parse muscleGroups for each workout
        const parsedWorkouts = (data.workouts || []).map((w: GymWorkout) => ({
          ...w,
          muscleGroups: (() => {
            if (!w.muscleGroups) return []
            try {
              return typeof w.muscleGroups === 'string' 
                ? JSON.parse(w.muscleGroups as unknown as string)
                : w.muscleGroups
            } catch {
              return []
            }
          })()
        }))
        
        setWorkouts(parsedWorkouts)
      } catch (error) {
        console.error('Failed to load workouts:', error)
      }
    }
    loadWorkouts()
  }, [activePeriod?.id])

  // Parse day schedule when activePeriod changes
  useEffect(() => {
    if (activePeriod?.daySchedule) {
      try {
        const schedule = typeof activePeriod.daySchedule === 'string'
          ? JSON.parse(activePeriod.daySchedule)
          : activePeriod.daySchedule
        setParsedDaySchedule(schedule)
      } catch {
        setParsedDaySchedule([])
      }
    } else {
      setParsedDaySchedule([])
    }
  }, [activePeriod?.daySchedule])

  // Initialize workout days when wizard config changes
  useEffect(() => {
    if (wizardStep === 2 && workoutDays.length === 0) {
      const days: WorkoutDayConfig[] = []
      for (let i = 1; i <= wizardConfig.workoutsPerCycle; i++) {
        days.push({
          dayNum: i,
          muscles: [],
          name: getWorkoutName(wizardConfig.splitType, i),
        })
      }
      setWorkoutDays(days)
    }
    
    // Initialize day schedule when entering step 3
    if (wizardStep === 3 && daySchedule.length === 0) {
      const schedule = generateInitialSchedule(wizardConfig.cycleLength, wizardConfig.workoutsPerCycle)
      setDaySchedule(schedule)
    }
  }, [wizardStep, wizardConfig.cycleLength, wizardConfig.workoutsPerCycle, wizardConfig.splitType, workoutDays.length, daySchedule.length])

  // Generate initial schedule with even distribution
  const generateInitialSchedule = (cycleLen: number, workoutsCount: number): DayScheduleItem[] => {
    const schedule: DayScheduleItem[] = []
    const workoutPositions: number[] = []
    
    for (let i = 0; i < workoutsCount; i++) {
      workoutPositions.push(Math.floor((i * cycleLen) / workoutsCount) + 1)
    }
    
    for (let dayNum = 1; dayNum <= cycleLen; dayNum++) {
      if (workoutPositions.includes(dayNum)) {
        const workoutNum = workoutPositions.indexOf(dayNum) + 1
        schedule.push({
          type: 'workout',
          dayNum,
          workoutNum
        })
      } else {
        schedule.push({
          type: 'rest',
          dayNum
        })
      }
    }
    return schedule
  }

  // Apply template
  const applyTemplate = (templateId: string) => {
    const template = WORKOUT_TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    
    setSelectedTemplate(templateId)
    setWizardConfig(prev => ({
      ...prev,
      cycleLength: template.cycleLength,
      workoutsPerCycle: template.workoutsPerCycle,
      splitType: template.splitType,
    }))
    
    // Set workout days
    const days: WorkoutDayConfig[] = template.daySchedule
      .filter(d => d.type === 'workout')
      .map((d, idx) => ({
        dayNum: idx + 1,
        muscles: d.muscleGroups || [],
        name: d.name || `Тренировка ${idx + 1}`,
      }))
    setWorkoutDays(days)
    
    // Set day schedule
    const schedule: DayScheduleItem[] = template.daySchedule.map((item, idx) => ({
      ...item,
      dayNum: idx + 1,
    }))
    setDaySchedule(schedule)
  }

  // Drag and drop handlers for wizard
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newSchedule = [...daySchedule]
      const [draggedItem] = newSchedule.splice(draggedIndex, 1)
      newSchedule.splice(dragOverIndex, 0, draggedItem)
      
      // Update dayNum to match new positions
      newSchedule.forEach((item, idx) => {
        item.dayNum = idx + 1
      })
      
      setDaySchedule(newSchedule)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Drag and drop handlers for active period schedule
  const [scheduleDraggedIdx, setScheduleDraggedIdx] = useState<number | null>(null)
  const [scheduleDragOverIdx, setScheduleDragOverIdx] = useState<number | null>(null)

  const handleScheduleDragStart = (index: number) => {
    setScheduleDraggedIdx(index)
  }

  const handleScheduleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setScheduleDragOverIdx(index)
  }

  const handleScheduleDragEnd = () => {
    if (scheduleDraggedIdx !== null && scheduleDragOverIdx !== null && scheduleDraggedIdx !== scheduleDragOverIdx) {
      const newSchedule = [...parsedDaySchedule]
      const [draggedItem] = newSchedule.splice(scheduleDraggedIdx, 1)
      newSchedule.splice(scheduleDragOverIdx, 0, draggedItem)
      
      // Update dayNum to match new positions
      newSchedule.forEach((item, idx) => {
        item.dayNum = idx + 1
      })
      
      setParsedDaySchedule(newSchedule)
    }
    setScheduleDraggedIdx(null)
    setScheduleDragOverIdx(null)
  }

  const handleSaveSchedule = async () => {
    if (!activePeriod || parsedDaySchedule.length === 0) return
    
    try {
      await fetch('/api/gym', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          periodId: activePeriod.id,
          daySchedule: parsedDaySchedule
        }),
      })
      // Show success feedback
    } catch (error) {
      console.error('Failed to save schedule:', error)
    }
  }

  // Skip workout - shift all future workouts by 1 day
  const handleSkipWorkout = async () => {
    if (!selectedWorkout || !activePeriod) return
    
    try {
      const response = await fetch('/api/gym/workouts/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workoutId: selectedWorkout.id,
          periodId: activePeriod.id 
        }),
      })
      const data = await response.json()
      if (data.success) {
        // Refresh workouts
        setShowWorkoutDetail(false)
        // Reload workouts
        const workoutsResponse = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
        const workoutsData = await workoutsResponse.json()
        setWorkouts(workoutsData.workouts || [])
      }
    } catch (error) {
      console.error('Failed to skip workout:', error)
    }
  }

  // Reschedule workout
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [showReschedule, setShowReschedule] = useState(false)

  const handleRescheduleWorkout = async () => {
    if (!selectedWorkout || !activePeriod || !rescheduleDate) return
    
    try {
      const response = await fetch('/api/gym/workouts/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workoutId: selectedWorkout.id,
          periodId: activePeriod.id,
          newDate: rescheduleDate 
        }),
      })
      const data = await response.json()
      if (data.success) {
        setShowReschedule(false)
        setShowWorkoutDetail(false)
        setRescheduleDate('')
        // Reload workouts
        const workoutsResponse = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
        const workoutsData = await workoutsResponse.json()
        setWorkouts(workoutsData.workouts || [])
      }
    } catch (error) {
      console.error('Failed to reschedule workout:', error)
    }
  }

  // Initialize workout days when wizard config changes
  useEffect(() => {
    if (wizardStep === 2 && workoutDays.length === 0) {
      const days: WorkoutDayConfig[] = []
      for (let i = 1; i <= wizardConfig.workoutsPerCycle; i++) {
        days.push({
          dayNum: i,
          muscles: [],
          name: getWorkoutName(wizardConfig.splitType, i),
        })
      }
      setWorkoutDays(days)
    }
  }, [wizardStep, wizardConfig.workoutsPerCycle, wizardConfig.splitType, workoutDays.length])

  // Create period
  const handleCreatePeriod = async () => {
    if (!user?.id) return

    const name = wizardConfig.type === 'custom' ? wizardConfig.customName : 
                 TRAINING_TYPES.find(t => t.value === wizardConfig.type)?.label || 'Период'

    // Build final day schedule with names and muscles from workoutDays
    const finalSchedule = daySchedule.map((item, idx) => {
      if (item.type === 'workout' && item.workoutNum) {
        const dayConfig = workoutDays.find(d => d.dayNum === item.workoutNum)
        return {
          ...item,
          dayNum: idx + 1,
          name: dayConfig?.name || `Тренировка ${item.workoutNum}`,
          muscleGroups: dayConfig?.muscles || []
        }
      }
      return { ...item, dayNum: idx + 1 }
    })

    try {
      const response = await fetch('/api/gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name,
          type: wizardConfig.splitType,
          cycleLength: wizardConfig.cycleLength,
          workoutsPerCycle: wizardConfig.workoutsPerCycle,
          totalCycles: wizardConfig.totalCycles,
          workoutDays: workoutDays.map(d => ({
            workoutNum: d.dayNum,
            name: d.name,
            muscleGroups: d.muscles,
          })),
          daySchedule: finalSchedule, // Send the complete schedule
        }),
      })
      const data = await response.json()
      if (data.period) {
        setPeriods(prev => [...prev, data.period])
        setActivePeriod(data.period)
        setShowWizard(false)
        resetWizard()
      }
    } catch (error) {
      console.error('Failed to create period:', error)
    }
  }

  const resetWizard = () => {
    setWizardStep(1)
    setWizardConfig({
      type: 'strength',
      customName: '',
      cycleLength: 7,
      workoutsPerCycle: 3,
      totalCycles: 8,
      splitType: 'split',
    })
    setWorkoutDays([])
    setDaySchedule([])
    setSelectedTemplate(null)
  }

  // Complete workout
  const handleCompleteWorkout = async (workoutId: string) => {
    try {
      await fetch('/api/gym/workouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, completed: true }),
      })
      setWorkouts(prev => prev.map(w =>
        w.id === workoutId ? { ...w, completed: true } : w
      ))
    } catch (error) {
      console.error('Failed to complete workout:', error)
    }
  }

  // Load workout details
  const loadWorkoutDetails = async (workout: GymWorkout) => {
    try {
      const response = await fetch(`/api/gym/workouts/${workout.id}`)
      const data = await response.json()
      
      // Parse muscleGroups if it's a JSON string
      let muscleGroups: string[] = []
      if (data.workout?.muscleGroups) {
        try {
          muscleGroups = typeof data.workout.muscleGroups === 'string' 
            ? JSON.parse(data.workout.muscleGroups) 
            : data.workout.muscleGroups
        } catch {
          muscleGroups = []
        }
      }
      
      setSelectedWorkout({ 
        ...workout, 
        muscleGroups,
        exercises: data.workout?.exercises || [] 
      })
      setShowWorkoutDetail(true)
    } catch (error) {
      console.error('Failed to load workout details:', error)
      // Also parse muscleGroups for the fallback
      let muscleGroups: string[] = []
      if (workout.muscleGroups) {
        try {
          muscleGroups = typeof workout.muscleGroups === 'string'
            ? JSON.parse(workout.muscleGroups as unknown as string)
            : workout.muscleGroups
        } catch {
          muscleGroups = []
        }
      }
      setSelectedWorkout({ ...workout, muscleGroups })
      setShowWorkoutDetail(true)
    }
  }

  // Add exercise to workout
  const handleAddExercise = async () => {
    if (!selectedWorkout || !newExerciseName) return

    try {
      const response = await fetch('/api/gym/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: selectedWorkout.id,
          name: newExerciseName,
          muscleGroup: newExerciseMuscle,
          order: (selectedWorkout.exercises?.length || 0) + 1,
        }),
      })
      const data = await response.json()
      if (data.exercise) {
        setSelectedWorkout(prev => prev ? {
          ...prev,
          exercises: [...(prev.exercises || []), data.exercise],
        } : null)
        setNewExerciseName('')
        setNewExerciseMuscle('')
        setShowExerciseEditor(false)
      }
    } catch (error) {
      console.error('Failed to add exercise:', error)
    }
  }

  // Add set to exercise
  const handleAddSet = async (exercise: GymExercise) => {
    try {
      const response = await fetch('/api/gym/exercises/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: exercise.id,
          setNum: (exercise.sets?.length || 0) + 1,
        }),
      })
      const data = await response.json()
      if (data.set) {
        setSelectedWorkout(prev => prev ? {
          ...prev,
          exercises: prev.exercises?.map(e =>
            e.id === exercise.id
              ? { ...e, sets: [...(e.sets || []), data.set] }
              : e
          ),
        } : null)
      }
    } catch (error) {
      console.error('Failed to add set:', error)
    }
  }

  // Update set
  const handleUpdateSet = async (exerciseId: string, setId: string, updates: Partial<GymExerciseSet>) => {
    try {
      await fetch('/api/gym/exercises/sets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId, ...updates }),
      })
      setSelectedWorkout(prev => prev ? {
        ...prev,
        exercises: prev.exercises?.map(e =>
          e.id === exerciseId
            ? { ...e, sets: e.sets?.map(s => s.id === setId ? { ...s, ...updates } : s) }
            : e
        ),
      } : null)
    } catch (error) {
      console.error('Failed to update set:', error)
    }
  }

  // Calendar generation
  const getCalendarDays = useCallback(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = (firstDay.getDay() + 6) % 7

    const days = []
    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      // Use local date format to avoid timezone issues
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const workout = workouts.find(w => {
        // Handle both ISO string and date-only string formats
        const wDate = w.date.split('T')[0]
        return wDate === dateStr
      })
      days.push({ date, workout, dayNum: d })
    }
    return days
  }, [currentMonth, workouts])

  const getPeriodProgress = useCallback(() => {
    if (!activePeriod) return 0
    const completedWorkouts = workouts.filter(w => w.completed).length
    const totalWorkouts = activePeriod.totalCycles * activePeriod.workoutsPerCycle
    return Math.min(100, (completedWorkouts / totalWorkouts) * 100)
  }, [activePeriod, workouts])

  const getNextWorkout = useCallback(() => {
    if (!activePeriod) return null
    const today = new Date().toISOString().split('T')[0]
    return workouts
      .filter(w => !w.completed && w.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null
  }, [activePeriod, workouts])

  const calendarDays = getCalendarDays()
  const periodProgress = getPeriodProgress()
  const nextWorkout = getNextWorkout()
  const completedWorkouts = workouts.filter(w => w.completed).length

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">GYM</h1>
          <p className="text-muted-foreground text-sm">
            {activePeriod ? activePeriod.name : 'Нет активного периода'}
          </p>
        </div>
        {activePeriod ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActivePeriod(null)
              loadPeriods()
            }}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            К периодам
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => {
              resetWizard()
              setShowWizard(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Новый период
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Загрузка...
          </CardContent>
        </Card>
      ) : !activePeriod ? (
        <Card className="bg-card/50 backdrop-blur border-dashed">
          <CardContent className="pt-6 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Нет тренировочных периодов</p>
            <Button onClick={() => {
              resetWizard()
              setShowWizard(true)
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Создать период
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Period stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-4 text-center">
                <Target className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                <p className="text-xl font-bold text-primary">{activePeriod.currentCycle}</p>
                <p className="text-xs text-muted-foreground">Цикл</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-4 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto text-green-400 mb-1" />
                <p className="text-xl font-bold text-primary">{completedWorkouts}</p>
                <p className="text-xs text-muted-foreground">Тренировок</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="pt-4 text-center">
                <Trophy className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
                <p className="text-xl font-bold text-primary">{Math.round(periodProgress)}%</p>
                <p className="text-xs text-muted-foreground">Прогресс</p>
              </CardContent>
            </Card>
          </div>

          {/* Period progress */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Прогресс периода</CardTitle>
                <Badge variant="outline" className="text-primary border-primary/30">
                  Цикл {activePeriod.currentCycle} из {activePeriod.totalCycles}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={periodProgress} className="h-2" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{completedWorkouts} выполнено</span>
                <span>{activePeriod.totalCycles * activePeriod.workoutsPerCycle - completedWorkouts} осталось</span>
              </div>
            </CardContent>
          </Card>

          {/* Day Schedule - Days and Muscles */}
          {parsedDaySchedule.length > 0 && (
            <Card className="bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Дни и мышцы
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Перетащи для изменения порядка
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {parsedDaySchedule.map((day, idx) => {
                    const isWorkout = day.type === 'workout'
                    const isToday = activePeriod.currentDay === idx + 1
                    
                    return (
                      <div
                        key={idx}
                        draggable
                        onDragStart={() => handleScheduleDragStart(idx)}
                        onDragOver={(e) => handleScheduleDragOver(e, idx)}
                        onDragEnd={handleScheduleDragEnd}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing ${
                          isToday 
                            ? 'bg-primary/10 border border-primary/30' 
                            : isWorkout 
                              ? 'bg-muted/30 hover:bg-muted/50' 
                              : 'bg-muted/10 hover:bg-muted/20'
                        } ${
                          scheduleDragOverIdx === idx && scheduleDraggedIdx !== idx 
                            ? 'ring-2 ring-primary/50' 
                            : ''
                        }`}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                        
                        <div className="flex-1 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                            isWorkout 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {isWorkout ? (
                                <>
                                  <Dumbbell className="w-4 h-4 text-primary" />
                                  <span className="font-medium">
                                    {day.name || `Тренировка ${day.workoutNum}`}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Coffee className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Отдых</span>
                                </>
                              )}
                              {isToday && (
                                <Badge className="text-[10px] bg-primary text-primary-foreground">
                                  Сегодня
                                </Badge>
                              )}
                            </div>
                            
                            {isWorkout && day.muscleGroups && day.muscleGroups.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {day.muscleGroups.map(muscle => {
                                  const group = MUSCLE_GROUPS.find(g => g.value === muscle)
                                  return (
                                    <Badge 
                                      key={muscle} 
                                      className={`text-[10px] px-1.5 py-0 ${group?.color || 'bg-muted'}`}
                                    >
                                      {group?.label || muscle}
                                    </Badge>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-xs"
                  onClick={handleSaveSchedule}
                  disabled={scheduleDraggedIdx === null && scheduleDragOverIdx === null}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Сохранить порядок
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Next workout */}
          {nextWorkout && (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {nextWorkout.name || `Тренировка ${nextWorkout.workoutNum}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(nextWorkout.date).toLocaleDateString('ru-RU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                      {/* Muscle groups */}
                      {nextWorkout.muscleGroups && nextWorkout.muscleGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {nextWorkout.muscleGroups.map(muscle => {
                            const group = MUSCLE_GROUPS.find(g => g.value === muscle)
                            return (
                              <Badge key={muscle} className={`text-[10px] px-1.5 py-0 ${group?.color || 'bg-muted'}`}>
                                {group?.label || muscle}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => loadWorkoutDetails(nextWorkout)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Открыть
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calendar */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Календарь
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[100px] text-center">
                    {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative cursor-pointer transition-colors ${
                      day === null ? '' :
                      day.workout?.completed ? 'bg-emerald-500/20 text-emerald-400' :
                      day.workout ? 'bg-primary/10 text-primary hover:bg-primary/20' :
                      new Date().toDateString() === day.date.toDateString() ? 'bg-muted border border-primary/30' :
                      'hover:bg-muted/50'
                    }`}
                    onClick={() => day?.workout && loadWorkoutDetails(day.workout)}
                  >
                    {day && (
                      <>
                        <span>{day.dayNum}</span>
                        {day.workout && (
                          <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            day.workout.completed ? 'bg-emerald-400' : 'bg-primary'
                          }`} />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Запланировано</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Выполнено</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent workouts */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Последние тренировки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workouts
                .filter(w => w.completed)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map(workout => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => loadWorkoutDetails(workout)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium">{workout.name || `Тренировка ${workout.workoutNum}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(workout.date).toLocaleDateString('ru-RU', {
                          weekday: 'short',
                          day: 'numeric'
                        })}
                        {workout.duration && ` • ${workout.duration} мин`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
              {workouts.filter(w => w.completed).length === 0 && (
                <p className="text-center text-muted-foreground py-4">Нет выполненных тренировок</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Period Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={(open) => { setShowWizard(open); if (!open) resetWizard() }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {wizardStep === 1 ? 'Новый период' : 'Дни и мышцы'}
            </DialogTitle>
          </DialogHeader>
          
          {wizardStep === 1 ? (
            <div className="space-y-4 pt-4">
              {/* Training type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Тип периода</Label>
                <div className="space-y-2">
                  {TRAINING_TYPES.map(type => (
                    <label
                      key={type.value}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        wizardConfig.type === type.value ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="periodType"
                        value={type.value}
                        checked={wizardConfig.type === type.value}
                        onChange={() => setWizardConfig(prev => ({ ...prev, type: type.value }))}
                        className="accent-primary"
                      />
                      <div>
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom name */}
              {wizardConfig.type === 'custom' && (
                <Input
                  placeholder="Название периода"
                  value={wizardConfig.customName}
                  onChange={e => setWizardConfig(prev => ({ ...prev, customName: e.target.value }))}
                />
              )}

              {/* Cycle length */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Длина цикла (дней)</Label>
                <Input
                  type="number"
                  min={3}
                  max={14}
                  value={wizardConfig.cycleLength}
                  onChange={e => setWizardConfig(prev => ({ ...prev, cycleLength: parseInt(e.target.value) || 7 }))}
                />
                <p className="text-xs text-muted-foreground">По умолчанию 7 дней, можно изменить под свой график</p>
              </div>

              {/* Workouts per cycle */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Тренировок в цикле</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={wizardConfig.workoutsPerCycle}
                  onChange={e => setWizardConfig(prev => ({ ...prev, workoutsPerCycle: parseInt(e.target.value) || 3 }))}
                />
              </div>

              {/* Total cycles */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Всего циклов</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={wizardConfig.totalCycles}
                  onChange={e => setWizardConfig(prev => ({ ...prev, totalCycles: parseInt(e.target.value) || 8 }))}
                />
              </div>

              {/* Split type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Формат тренировок</Label>
                <div className="space-y-2">
                  {SPLIT_TYPES.map(split => (
                    <label
                      key={split.value}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        wizardConfig.splitType === split.value ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="splitType"
                        value={split.value}
                        checked={wizardConfig.splitType === split.value}
                        onChange={() => setWizardConfig(prev => ({ ...prev, splitType: split.value }))}
                        className="accent-primary"
                      />
                      <div>
                        <div className="font-medium text-sm">{split.label}</div>
                        <div className="text-xs text-muted-foreground">{split.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowWizard(false)}>
                  Отмена
                </Button>
                <Button
                  className="flex-1 bg-primary"
                  onClick={() => setWizardStep(2)}
                  disabled={wizardConfig.type === 'custom' && !wizardConfig.customName}
                >
                  Далее
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Для первого цикла выбери, какие группы мышц тренировать в каждый тренировочный день.
              </p>

              <div className="space-y-3">
                {workoutDays.map((day, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">День {day.dayNum}</span>
                      <Input
                        className="w-40 h-8 text-sm"
                        placeholder="Название"
                        value={day.name}
                        onChange={e => {
                          const newDays = [...workoutDays]
                          newDays[idx].name = e.target.value
                          setWorkoutDays(newDays)
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {MUSCLE_GROUPS.map(muscle => (
                        <button
                          key={muscle.value}
                          className={`px-2 py-1 rounded-full text-xs transition-colors ${
                            day.muscles.includes(muscle.value)
                              ? muscle.color
                              : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                          onClick={() => {
                            const newDays = [...workoutDays]
                            if (day.muscles.includes(muscle.value)) {
                              newDays[idx].muscles = day.muscles.filter(m => m !== muscle.value)
                            } else {
                              newDays[idx].muscles = [...day.muscles, muscle.value]
                            }
                            setWorkoutDays(newDays)
                          }}
                        >
                          {muscle.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setWizardStep(1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Назад
                </Button>
                <Button
                  className="flex-1 bg-primary"
                  onClick={handleCreatePeriod}
                >
                  Создать период
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Workout Detail Dialog */}
      <Dialog open={showWorkoutDetail} onOpenChange={setShowWorkoutDetail}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkout?.name || `Тренировка ${selectedWorkout?.workoutNum}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Workout info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedWorkout?.date && new Date(selectedWorkout.date).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </span>
              {selectedWorkout?.duration && (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {selectedWorkout.duration} мин
                </Badge>
              )}
            </div>

            {/* Muscle groups */}
            {selectedWorkout?.muscleGroups && selectedWorkout.muscleGroups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedWorkout.muscleGroups.map(muscle => {
                  const group = MUSCLE_GROUPS.find(g => g.value === muscle)
                  return (
                    <Badge key={muscle} className={group?.color || 'bg-muted'}>
                      {group?.label || muscle}
                    </Badge>
                  )
                })}
              </div>
            )}

            {/* Exercises */}
            <div className="space-y-3">
              {selectedWorkout?.exercises?.map(exercise => (
                <div key={exercise.id} className="p-3 rounded-xl bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{exercise.name}</span>
                      {exercise.muscleGroup && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({MUSCLE_GROUPS.find(g => g.value === exercise.muscleGroup)?.label})
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Sets */}
                  <div className="space-y-1">
                    {exercise.sets?.map((set, setIdx) => (
                      <div key={set.id} className="flex items-center gap-2 text-sm">
                        <span className="w-6 text-muted-foreground">{setIdx + 1}</span>
                        <Input
                          type="number"
                          placeholder="Вес"
                          className="w-20 h-8"
                          value={set.weight || ''}
                          onChange={e => handleUpdateSet(exercise.id, set.id, { weight: parseFloat(e.target.value) || undefined })}
                        />
                        <span className="text-muted-foreground">кг ×</span>
                        <Input
                          type="number"
                          placeholder="Повт"
                          className="w-16 h-8"
                          value={set.reps || ''}
                          onChange={e => handleUpdateSet(exercise.id, set.id, { reps: parseInt(e.target.value) || undefined })}
                        />
                        <button
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            set.completed ? 'bg-emerald-500 text-white' : 'bg-muted'
                          }`}
                          onClick={() => handleUpdateSet(exercise.id, set.id, { completed: !set.completed })}
                        >
                          {set.completed && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAddSet(exercise)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Добавить подход
                  </Button>
                </div>
              ))}
            </div>

            {/* Add exercise */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Название упражнения"
                  value={newExerciseName}
                  onChange={e => setNewExerciseName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddExercise}
                  disabled={!newExerciseName}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Quick exercise buttons */}
              {selectedWorkout?.muscleGroups && selectedWorkout.muscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedWorkout.muscleGroups.flatMap(muscle => 
                    (EXERCISE_DATABASE[muscle] || []).slice(0, 3).map(exercise => (
                      <button
                        key={exercise}
                        className="px-2 py-1 rounded-full text-xs bg-muted/50 hover:bg-muted transition-colors"
                        onClick={() => setNewExerciseName(exercise)}
                      >
                        {exercise}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Complete workout */}
            {!selectedWorkout?.completed && (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  if (selectedWorkout) {
                    handleCompleteWorkout(selectedWorkout.id)
                    setShowWorkoutDetail(false)
                  }
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Завершить тренировку
              </Button>
            )}

            {selectedWorkout?.completed && (
              <div className="text-center py-2 text-emerald-400">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1" />
                Тренировка завершена!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function
function getWorkoutName(type: string, workoutNum: number): string {
  switch (type) {
    case 'split':
      const splitNames = ['Грудь + Трицепс', 'Спина + Бицепс', 'Ноги', 'Плечи + Пресс']
      return splitNames[(workoutNum - 1) % splitNames.length] || `Тренировка ${workoutNum}`
    case 'ppl':
      const pplNames = ['Push (Толкай)', 'Pull (Тяни)', 'Legs (Ноги)']
      return pplNames[(workoutNum - 1) % pplNames.length] || `Тренировка ${workoutNum}`
    case 'upper_lower':
      const ulNames = ['Верх', 'Низ']
      return ulNames[(workoutNum - 1) % ulNames.length] || `Тренировка ${workoutNum}`
    case 'fullbody':
      return `Фулбоди ${workoutNum}`
    default:
      return `Тренировка ${workoutNum}`
  }
}
