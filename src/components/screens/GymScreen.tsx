'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  Save,
  Repeat,
  Shuffle,
  Zap
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Types
interface GymExerciseSet {
  id: string
  setNum: number
  weight?: number
  reps?: number
  duration?: number
  completed: boolean
  isWarmup?: boolean
  notes?: string
}

interface GymExercise {
  id: string
  name: string
  muscleGroup?: string
  order: number
  sets: GymExerciseSet[]
  templateId?: string
  repsScheme?: string // legacy
  targetReps?: number
  targetSets?: number
  weight?: number
  nextWeight?: number
  workoutTemplateExerciseId?: string // v1.7: link to template exercise
  includeInFutureCycles?: boolean // v1.7: include in future cycles
  template?: {
    id: string
    name: string
    currentWeight?: number
    nextWeight?: number
    defaultScheme?: string
    defaultReps?: number
    defaultSets?: number
    progressionStep?: number
    techniqueNotes?: string
  }
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
  skipped?: boolean
  status?: 'planned' | 'in_progress' | 'completed' | 'skipped' | 'rescheduled'
  wellbeing?: number
  wellbeingNote?: string
  additionalActivities?: AdditionalActivity[]
}

// Additional activity type
interface AdditionalActivity {
  type: 'walk' | 'abs' | 'plank' | 'bike' | 'other'
  value: string
  label?: string
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
// [UX] Default workout names = Тренировка 1..4
const WORKOUT_TEMPLATES = [
  {
    id: 'upper_lower_6',
    name: 'Верх/Низ (4 за 6)',
    description: 'Верх, Низ, Отдых, Отдых, Верх, Низ',
    cycleLength: 6,
    workoutsPerCycle: 4,
    splitType: 'upper_lower',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest', 'back', 'shoulders'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['legs'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['chest', 'back', 'shoulders'] },
      { type: 'workout' as const, workoutNum: 4, name: 'Тренировка 4', muscleGroups: ['legs'] },
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
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest', 'shoulders', 'triceps'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['back', 'biceps'] },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['legs'] },
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
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest', 'triceps'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['back', 'biceps'] },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['legs'] },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 4, name: 'Тренировка 4', muscleGroups: ['shoulders', 'core'] },
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
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest', 'back', 'legs'] },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['shoulders', 'legs', 'core'] },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['chest', 'back', 'legs'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
    ],
  },
  {
    id: 'intense_5',
    name: 'Интенсив (5 за 7)',
    description: '5 дней тренировок подряд, 2 дня отдых',
    cycleLength: 7,
    workoutsPerCycle: 5,
    splitType: 'split',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['back'] },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['legs'] },
      { type: 'workout' as const, workoutNum: 4, name: 'Тренировка 4', muscleGroups: ['shoulders'] },
      { type: 'workout' as const, workoutNum: 5, name: 'Тренировка 5', muscleGroups: ['biceps', 'triceps'] },
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
  const [showPeriodList, setShowPeriodList] = useState(false) // Separate state for period list view
  
  // Today's workout data (GYM v1.2)
  const [todayData, setTodayData] = useState<{
    hasActivePeriod: boolean
    period?: {
      id: string
      name: string
      currentCycle: number
      totalCycles: number
      progressPercent: number
    }
    todayWorkout?: {
      id: string
      name: string | null
      muscleGroups: string[]
      status: string
      completed: boolean
      cycleNumber?: number
      workoutNum?: number
      template?: {
        name: string
        muscleGroups: string[]
      }
      exercises: Array<{
        id: string
        name: string
        order: number
        muscleGroup?: string
        weight?: number
        targetReps?: number
        targetSets?: number
        repsScheme?: string
        nextWeight?: number
        techniqueNotes?: string
        cycleNote?: string
        lastCycleNote?: string
        template?: {
          currentWeight?: number
          nextWeight?: number
          defaultScheme?: string
          defaultReps?: number
          defaultSets?: number
          techniqueNotes?: string
        }
        sets: Array<{ weight?: number; reps?: number; completed: boolean; isWarmup?: boolean }>
      }>
    }
    nextWorkout?: {
      id: string
      date: string
      name: string | null
      workoutNum?: number
    }
    isToday: boolean
  } | null>(null)
  const [isLoadingToday, setIsLoadingToday] = useState(false)
  
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
  
  // v1.3: Wizard step 4 - exercises per workout type
  const [wizardExercises, setWizardExercises] = useState<Record<number, Array<{
    templateId?: string
    name: string
    muscleGroup?: string
    order: number
  }>>>({})
  const [showWizardExercisePicker, setShowWizardExercisePicker] = useState(false)
  const [selectedWorkoutNumForExercise, setSelectedWorkoutNumForExercise] = useState<number | null>(null)
  
  // v1.3: Exercise library management modal
  const [showExerciseLibraryDialog, setShowExerciseLibraryDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{
    id?: string
    name: string
    muscleGroup?: string
    defaultScheme?: string
    defaultReps?: number
    defaultSets?: number
    currentWeight?: number
    nextWeight?: number
    techniqueNotes?: string
  } | null>(null)
  
  // v1.5: Filter muscle group in library
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState<string | null>(null)
  
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
  
  // Schedule edit mode
  const [scheduleEdited, setScheduleEdited] = useState(false)
  
  // Skip workout dialog
  const [showSkipDialog, setShowSkipDialog] = useState(false)
  
  // Reschedule workout dialog with options
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [rescheduleMode, setRescheduleMode] = useState<'single' | 'shift'>('single')
  
  // Add workout to calendar dialog
  const [showAddWorkoutDialog, setShowAddWorkoutDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newWorkoutName, setNewWorkoutName] = useState('')
  const [newWorkoutMuscles, setNewWorkoutMuscles] = useState<string[]>([])

  // Post-workout dialog (F5)
  const [showPostWorkoutDialog, setShowPostWorkoutDialog] = useState(false)
  const [exerciseRatings, setExerciseRatings] = useState<Record<string, 'easy' | 'normal' | 'hard'>>({})
  const [editingActivities, setEditingActivities] = useState<AdditionalActivity[]>([])

  // Exercise card dialog (F3)
  const [showExerciseCardDialog, setShowExerciseCardDialog] = useState(false)
  const [selectedExerciseCard, setSelectedExerciseCard] = useState<GymExercise | null>(null)
  const [exerciseHistory, setExerciseHistory] = useState<Array<{ date: string; weight?: number; scheme?: string; completed: boolean }>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Additional activities input
  const [newActivityType, setNewActivityType] = useState<AdditionalActivity['type']>('walk')
  const [newActivityValue, setNewActivityValue] = useState('')

  // v1.4: Auto-save with debounce
  const [savingSets, setSavingSets] = useState<Set<string>>(new Set())
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})

  // Template selection for adding exercises from library
  const [showTemplateSelectDialog, setShowTemplateSelectDialog] = useState(false)
  const [templates, setTemplates] = useState<Array<{ 
    id: string
    name: string
    muscleGroup?: string
    currentWeight?: number
    defaultScheme?: string
    defaultReps?: number
    defaultSets?: number
    nextWeight?: number
    techniqueNotes?: string
  }>>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // v1.6: Quick Complete Dialog with next weights configuration
  const [showQuickCompleteDialog, setShowQuickCompleteDialog] = useState(false)
  const [quickCompleteNextWeights, setQuickCompleteNextWeights] = useState<Record<string, { weight: number; reps: number; sets: number }>>({})

  // v1.6: Workout note field (saved as cycle note for next cycle)
  const [workoutNote, setWorkoutNote] = useState('')

  // v1.7: Preview dialog after completion
  const [showCompletionPreview, setShowCompletionPreview] = useState(false)
  const [completionData, setCompletionData] = useState<{
    exercises: Array<{ name: string; weight?: number; reps?: number; sets?: number; nextWeight?: number }>
    note?: string
  }>({ exercises: [] })

  // Load gym periods
  const loadPeriods = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/gym?userId=${user.id}`)
      const data = await response.json()
      setPeriods(data.periods || [])
      // Don't auto-set activePeriod - let user choose or use initial load only
      if (!activePeriod && data.periods?.length > 0) {
        const active = data.periods.find((p: GymPeriod) => p.isActive)
        setActivePeriod(active || data.periods[0])
      }
    } catch (error) {
      console.error('Failed to load gym periods:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, activePeriod])

  useEffect(() => {
    loadPeriods()
  }, [loadPeriods])

  // Load today's workout data (GYM v1.2)
  const loadTodayData = useCallback(async () => {
    if (!user?.id) return
    setIsLoadingToday(true)
    try {
      const response = await fetch(`/api/gym/today?userId=${user.id}`)
      const data = await response.json()
      setTodayData(data)
    } catch (error) {
      console.error('Failed to load today data:', error)
    } finally {
      setIsLoadingToday(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadTodayData()
  }, [loadTodayData])

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

  // Parse day schedule when activePeriod changes - preserve exact order
  useEffect(() => {
    if (activePeriod?.daySchedule) {
      try {
        const schedule = typeof activePeriod.daySchedule === 'string'
          ? JSON.parse(activePeriod.daySchedule)
          : activePeriod.daySchedule
        // Sort by dayNum to ensure correct order (this is the fix for the bug)
        const sortedSchedule = [...schedule].sort((a, b) => a.dayNum - b.dayNum)
        setParsedDaySchedule(sortedSchedule)
      } catch {
        setParsedDaySchedule([])
      }
    } else {
      setParsedDaySchedule([])
    }
    setScheduleEdited(false)
  }, [activePeriod?.daySchedule])

  // Initialize workout days when wizard config changes
  useEffect(() => {
    if (wizardStep === 2 && workoutDays.length === 0 && !selectedTemplate) {
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
      const schedule = generateInitialSchedule(wizardConfig.cycleLength, wizardConfig.workoutsPerCycle, workoutDays)
      setDaySchedule(schedule)
    }
  }, [wizardStep, wizardConfig.cycleLength, wizardConfig.workoutsPerCycle, wizardConfig.splitType, workoutDays.length, daySchedule.length, selectedTemplate])

  // Generate initial schedule with even distribution
  const generateInitialSchedule = (
    cycleLen: number, 
    workoutsCount: number, 
    days?: WorkoutDayConfig[]
  ): DayScheduleItem[] => {
    const schedule: DayScheduleItem[] = []
    const workoutPositions: number[] = []
    
    // Calculate evenly distributed positions
    for (let i = 0; i < workoutsCount; i++) {
      workoutPositions.push(Math.floor((i * cycleLen) / workoutsCount) + 1)
    }
    
    for (let dayNum = 1; dayNum <= cycleLen; dayNum++) {
      if (workoutPositions.includes(dayNum)) {
        const workoutNum = workoutPositions.indexOf(dayNum) + 1
        const dayConfig = days?.find(d => d.dayNum === workoutNum)
        schedule.push({
          type: 'workout',
          dayNum,
          workoutNum,
          name: dayConfig?.name || `Тренировка ${workoutNum}`,
          muscleGroups: dayConfig?.muscles || []
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

  // Apply template - preserves exact order from template
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
    
    // Set day schedule - preserve exact order from template
    const schedule: DayScheduleItem[] = template.daySchedule.map((item, idx) => ({
      ...item,
      dayNum: idx + 1, // Position in array = dayNum
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
      setScheduleEdited(true)
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
      setScheduleEdited(false)
      // Reload period to reflect changes
      loadPeriods()
    } catch (error) {
      console.error('Failed to save schedule:', error)
    }
  }

  // Skip workout - show dialog first
  const handleSkipWorkout = async (shiftSchedule: boolean) => {
    if (!selectedWorkout || !activePeriod) return
    
    try {
      const response = await fetch('/api/gym/workouts/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workoutId: selectedWorkout.id,
          periodId: activePeriod.id,
          shiftSchedule
        }),
      })
      const data = await response.json()
      if (data.success) {
        setShowSkipDialog(false)
        setShowWorkoutDetail(false)
        // Reload workouts with proper parsing
        const workoutsResponse = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
        const workoutsData = await workoutsResponse.json()
        
        // Parse muscleGroups for each workout
        const parsedWorkouts = (workoutsData.workouts || []).map((w: GymWorkout) => ({
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
      }
    } catch (error) {
      console.error('Failed to skip workout:', error)
    }
  }

  // Reschedule workout
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [showReschedule, setShowReschedule] = useState(false)

  const handleRescheduleWorkout = async (mode: 'single' | 'shift') => {
    if (!selectedWorkout || !activePeriod || !rescheduleDate) return
    
    try {
      if (mode === 'single') {
        // Just move this workout to the new date
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
          setShowRescheduleDialog(false)
          setShowWorkoutDetail(false)
          setRescheduleDate('')
        }
      } else {
        // Move this workout AND shift all future workouts
        const response = await fetch('/api/gym/workouts/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            workoutId: selectedWorkout.id,
            periodId: activePeriod.id,
            newDate: rescheduleDate,
            shiftCycle: true
          }),
        })
        const data = await response.json()
        if (data.success) {
          setShowRescheduleDialog(false)
          setShowWorkoutDetail(false)
          setRescheduleDate('')
        }
      }
      
      // Reload workouts
      const workoutsResponse = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
      const workoutsData = await workoutsResponse.json()
      
      const parsedWorkouts = (workoutsData.workouts || []).map((w: GymWorkout) => ({
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
      console.error('Failed to reschedule workout:', error)
    }
  }
  
  // Add workout to a specific date (from calendar click)
  const handleAddWorkoutToDate = async () => {
    if (!selectedDate || !activePeriod || !user?.id) return
    
    const name = newWorkoutName || `Тренировка ${workouts.length + 1}`
    
    try {
      const response = await fetch('/api/gym/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: activePeriod.id,
          date: selectedDate.toISOString(),
          name,
          muscleGroups: newWorkoutMuscles,
          workoutNum: workouts.filter(w => !w.completed).length + 1,
          isManual: true
        }),
      })
      const data = await response.json()
      if (data.workout) {
        setShowAddWorkoutDialog(false)
        setSelectedDate(null)
        setNewWorkoutName('')
        setNewWorkoutMuscles([])
        // Reload workouts
        const workoutsResponse = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
        const workoutsData = await workoutsResponse.json()
        const parsedWorkouts = (workoutsData.workouts || []).map((w: GymWorkout) => ({
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
      }
    } catch (error) {
      console.error('Failed to add workout:', error)
    }
  }

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
          name: dayConfig?.name || item.name || `Тренировка ${item.workoutNum}`,
          muscleGroups: dayConfig?.muscles || item.muscleGroups || []
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
          daySchedule: finalSchedule,
          // v1.3: exercises per workout type
          workoutExercises: wizardExercises,
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
    setWizardExercises({}) // v1.3: clear wizard exercises
  }

  // Complete workout - now opens post-workout dialog
  const handleCompleteWorkout = async (workoutId: string) => {
    if (!selectedWorkout) return

    // If workout has exercises, show post-workout dialog first
    if (selectedWorkout.exercises && selectedWorkout.exercises.length > 0) {
      // Initialize ratings for each exercise
      const initialRatings: Record<string, 'easy' | 'normal' | 'hard'> = {}
      selectedWorkout.exercises.forEach(ex => {
        initialRatings[ex.id] = 'normal'
      })
      setExerciseRatings(initialRatings)
      setEditingActivities(selectedWorkout.additionalActivities || [])
      setShowPostWorkoutDialog(true)
    } else {
      // No exercises, just complete
      await finalizeWorkout(workoutId, {}, [])
    }
  }

  // v1.7: Open Quick Complete Dialog with pre-filled next weights, reps, sets
  const openQuickCompleteDialog = () => {
    if (!selectedWorkout) return
    
    // Pre-fill next weights, reps, sets with current values
    const nextWeights: Record<string, { weight: number; reps: number; sets: number }> = {}
    selectedWorkout.exercises?.forEach(ex => {
      const workingSets = ex.sets?.filter(s => !s.isWarmup) || []
      const firstWorkingSet = workingSets[0]
      const currentWeight = firstWorkingSet?.weight || ex.template?.currentWeight || ex.weight || 0
      const currentReps = firstWorkingSet?.reps || ex.targetReps || ex.template?.defaultReps || 10
      const currentSets = workingSets.length || ex.targetSets || ex.template?.defaultSets || 4
      
      nextWeights[ex.id] = { weight: currentWeight, reps: currentReps, sets: currentSets }
    })
    setQuickCompleteNextWeights(nextWeights)
    setWorkoutNote('') // Reset workout note
    setShowQuickCompleteDialog(true)
  }

  // v1.6: Get unfilled sets info
  const getUnfilledSetsInfo = () => {
    if (!selectedWorkout?.exercises) return []
    
    const unfilled: Array<{ exerciseName: string; exerciseId: string; setNum: number; setId: string }> = []
    
    selectedWorkout.exercises.forEach(ex => {
      ex.sets?.forEach((set, idx) => {
        if (!set.isWarmup && (!set.weight || !set.reps)) {
          unfilled.push({
            exerciseName: ex.name,
            exerciseId: ex.id,
            setNum: idx + 1,
            setId: set.id
          })
        }
      })
    })
    
    return unfilled
  }

  // v1.6: Fill all unfilled sets with last filled values
  const handleAutoFillSets = () => {
    if (!selectedWorkout?.exercises) return
    
    selectedWorkout.exercises.forEach(ex => {
      const workingSets = ex.sets?.filter(s => !s.isWarmup) || []
      const lastFilled = workingSets.filter(s => s.weight && s.reps).pop()
      
      if (lastFilled) {
        workingSets.forEach(set => {
          if (!set.weight || !set.reps) {
            handleUpdateSet(ex.id, set.id, { 
              weight: lastFilled.weight, 
              reps: lastFilled.reps 
            }, true)
          }
        })
      }
    })
  }

  // v1.7: Confirm Quick Complete with next weights, reps, sets
  const handleConfirmQuickComplete = async () => {
    if (!selectedWorkout) return

    try {
      const exercisesData = selectedWorkout.exercises?.map(ex => {
        const nextWeightConfig = quickCompleteNextWeights[ex.id]
        return {
          id: ex.id,
          templateId: ex.templateId,
          weight: ex.sets?.[0]?.weight || ex.template?.currentWeight,
          nextWeight: nextWeightConfig?.weight || ex.template?.currentWeight,
          nextTargetReps: nextWeightConfig?.reps || ex.targetReps,
          nextTargetSets: nextWeightConfig?.sets || ex.targetSets,
          sets: ex.sets?.map(s => ({
            id: s.id,
            weight: s.weight,
            reps: s.reps,
            completed: s.completed
          }))
        }
      })

      const response = await fetch('/api/gym/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: selectedWorkout.id,
          completed: true,
          exercises: exercisesData,
          cycleNote: workoutNote
        }),
      })
      
      if (response.ok) {
        // v1.7: Prepare completion preview data
        const previewExercises = selectedWorkout.exercises?.map(ex => {
          const nextConfig = quickCompleteNextWeights[ex.id]
          const workingSets = ex.sets?.filter(s => !s.isWarmup) || []
          const firstWorkingSet = workingSets[0]
          const currentWeight = firstWorkingSet?.weight || ex.weight || ex.template?.currentWeight
          const currentReps = firstWorkingSet?.reps || ex.targetReps || ex.template?.defaultReps
          const currentSets = workingSets.length || ex.targetSets || ex.template?.defaultSets || 4
          
          return {
            name: ex.name,
            weight: currentWeight,
            reps: currentReps,
            sets: currentSets,
            nextWeight: nextConfig?.weight || currentWeight
          }
        }) || []
        
        setCompletionData({
          exercises: previewExercises,
          note: workoutNote || undefined
        })
        
        setWorkouts(prev => prev.map(w =>
          w.id === selectedWorkout.id ? { ...w, completed: true, status: 'completed' } : w
        ))
        
        setShowQuickCompleteDialog(false)
        setShowWorkoutDetail(false)
        setShowCompletionPreview(true) // Show preview dialog
        loadTodayData()
      }
    } catch (error) {
      console.error('Failed to quick complete workout:', error)
    }
  }

  // v1.6: Undo workout completion
  const handleUndoComplete = async () => {
    if (!selectedWorkout) return

    try {
      const response = await fetch('/api/gym/workouts/undo-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: selectedWorkout.id }),
      })
      
      if (response.ok) {
        setWorkouts(prev => prev.map(w =>
          w.id === selectedWorkout.id ? { ...w, completed: false, status: 'in_progress' } : w
        ))
        
        setSelectedWorkout(prev => prev ? { ...prev, completed: false, status: 'in_progress' } : null)
        loadTodayData()
      }
    } catch (error) {
      console.error('Failed to undo completion:', error)
    }
  }

  // Finalize workout after post-workout dialog
  const finalizeWorkout = async (
    workoutId: string,
    ratings: Record<string, 'easy' | 'normal' | 'hard'>,
    activities: AdditionalActivity[],
    note?: string
  ) => {
    if (!selectedWorkout) return

    try {
      // Prepare exercises data with updated nextWeight
      const exercisesData = selectedWorkout.exercises?.map(ex => {
        const rating = ratings[ex.id] || 'normal'
        const currentWeight = ex.sets?.[0]?.weight || ex.template?.currentWeight
        const step = ex.template?.progressionStep || 2.5

        let newNextWeight = ex.nextWeight || ex.template?.nextWeight || currentWeight
        if (currentWeight) {
          if (rating === 'easy') {
            newNextWeight = currentWeight + step
          } else if (rating === 'hard') {
            newNextWeight = Math.max(0, currentWeight - step)
          } else {
            newNextWeight = currentWeight // Normal - same weight
          }
        }

        return {
          id: ex.id,
          templateId: ex.templateId,
          weight: currentWeight,
          nextWeight: newNextWeight,
          repsScheme: ex.repsScheme,
          sets: ex.sets?.map(s => ({
            id: s.id,
            weight: s.weight,
            reps: s.reps,
            completed: s.completed
          }))
        }
      })

      // Save to API
      await fetch('/api/gym/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId,
          completed: true,
          additionalActivities: activities,
          exercises: exercisesData,
          cycleNote: note // v1.6: Save workout note as cycle note for next cycle
        }),
      })

      setWorkouts(prev => prev.map(w =>
        w.id === workoutId ? { ...w, completed: true } : w
      ))

      setShowPostWorkoutDialog(false)
      setShowWorkoutDetail(false)
      setWorkoutNote('') // Reset note

      // Reload today data
      loadTodayData()
    } catch (error) {
      console.error('Failed to finalize workout:', error)
    }
  }

  // Load workout details
  const loadWorkoutDetails = async (workout: GymWorkout) => {
    try {
      const response = await fetch(`/api/gym/workouts/${workout.id}`)
      const data = await response.json()
      
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

  // F3: Load exercise history
  const loadExerciseHistory = async (exercise: GymExercise) => {
    if (!exercise.templateId) {
      setExerciseHistory([])
      return
    }
    
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/gym/templates/${exercise.templateId}/history`)
      const data = await response.json()
      setExerciseHistory(data.history || [])
    } catch (error) {
      console.error('Failed to load exercise history:', error)
      setExerciseHistory([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // F7: Load templates for quick add
  const loadTemplates = async () => {
    if (!user?.id) return
    
    setIsLoadingTemplates(true)
    try {
      const response = await fetch(`/api/gym/templates?userId=${user.id}`)
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
      setTemplates([])
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // F3: Open exercise card dialog
  const openExerciseCard = async (exercise: GymExercise) => {
    setSelectedExerciseCard(exercise)
    setShowExerciseCardDialog(true)
    await loadExerciseHistory(exercise)
  }

  // F7: Add exercise from template (v1.5: with auto-create sets)
  const handleAddFromTemplate = async (template: { 
    id: string; 
    name: string; 
    currentWeight?: number; 
    nextWeight?: number
    defaultReps?: number
    defaultSets?: number
    defaultScheme?: string 
  }) => {
    if (!selectedWorkout) return
    
    try {
      const response = await fetch('/api/gym/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: selectedWorkout.id,
          name: template.name,
          templateId: template.id,
          order: (selectedWorkout.exercises?.length || 0) + 1,
          targetReps: template.defaultReps,
          targetSets: template.defaultSets || 4,
          weight: template.currentWeight || template.nextWeight,
          createSets: true // Auto-create sets
        }),
      })
      const data = await response.json()
      if (data.exercise) {
        setSelectedWorkout(prev => prev ? {
          ...prev,
          exercises: [...(prev.exercises || []), data.exercise],
        } : null)
        setShowTemplateSelectDialog(false)
      }
    } catch (error) {
      console.error('Failed to add exercise from template:', error)
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

  // Add set to exercise (v1.5: with warmup support)
  const handleAddSet = async (exercise: GymExercise, isWarmup: boolean = false) => {
    try {
      const response = await fetch('/api/gym/exercises/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: exercise.id,
          isWarmup,
          weight: isWarmup ? undefined : exercise.weight,
          reps: isWarmup ? undefined : exercise.targetReps,
        }),
      })
      const data = await response.json()
      if (data.set) {
        setSelectedWorkout(prev => prev ? {
          ...prev,
          exercises: prev.exercises?.map(e =>
            e.id === exercise.id
              ? { ...e, sets: [...(e.sets || []), data.set].sort((a, b) => a.setNum - b.setNum) }
              : e
          ),
        } : null)
      }
    } catch (error) {
      console.error('Failed to add set:', error)
    }
  }

  // v1.4: Update set with debounce for weight/reps, immediate for completed
  const handleUpdateSet = useCallback(async (exerciseId: string, setId: string, updates: Partial<GymExerciseSet>, immediate: boolean = false) => {
    // Optimistic update
    setSelectedWorkout(prev => prev ? {
      ...prev,
      exercises: prev.exercises?.map(e =>
        e.id === exerciseId
          ? { ...e, sets: e.sets?.map(s => s.id === setId ? { ...s, ...updates } : s) }
          : e
      ),
    } : null)

    // For completed flag - save immediately
    if (immediate || updates.completed !== undefined) {
      setSavingSets(prev => new Set(prev).add(setId))
      try {
        const response = await fetch('/api/gym/exercises/sets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setId, ...updates }),
        })
        const data = await response.json()
        
        // If workout status changed to in_progress, refresh today data
        if (data.workoutStatusChanged) {
          loadTodayData()
        }
      } catch (error) {
        console.error('Failed to update set:', error)
      } finally {
        setTimeout(() => {
          setSavingSets(prev => {
            const next = new Set(prev)
            next.delete(setId)
            return next
          })
        }, 500)
      }
      return
    }

    // For weight/reps - debounce
    const timerKey = setId
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey])
    }

    debounceTimers.current[timerKey] = setTimeout(async () => {
      setSavingSets(prev => new Set(prev).add(setId))
      try {
        await fetch('/api/gym/exercises/sets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setId, ...updates }),
        })
      } catch (error) {
        console.error('Failed to update set:', error)
      } finally {
        setTimeout(() => {
          setSavingSets(prev => {
            const next = new Set(prev)
            next.delete(setId)
            return next
          })
        }, 500)
      }
    }, 300)
  }, [loadTodayData])

  // Delete set - v1.3
  const handleDeleteSet = async (exerciseId: string, setId: string) => {
    if (!confirm('Удалить этот подход?')) return
    
    try {
      await fetch(`/api/gym/exercises/sets?setId=${setId}`, {
        method: 'DELETE',
      })
      setSelectedWorkout(prev => prev ? {
        ...prev,
        exercises: prev.exercises?.map(e =>
          e.id === exerciseId
            ? { ...e, sets: e.sets?.filter(s => s.id !== setId) }
            : e
        ),
      } : null)
    } catch (error) {
      console.error('Failed to delete set:', error)
    }
  }

  // v1.7: Auto-save additional activities
  const handleSaveAdditionalActivities = useCallback(async (activities: AdditionalActivity[]) => {
    if (!selectedWorkout) return
    
    try {
      await fetch('/api/gym/workouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: selectedWorkout.id,
          additionalActivities: activities
        }),
      })
    } catch (error) {
      console.error('Failed to save additional activities:', error)
    }
  }, [selectedWorkout])

  // v1.7: Delete exercise (only for manually added exercises)
  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Удалить упражнение из этой тренировки?')) return
    
    try {
      await fetch(`/api/gym/exercises?exerciseId=${exerciseId}`, {
        method: 'DELETE',
      })
      setSelectedWorkout(prev => prev ? {
        ...prev,
        exercises: prev.exercises?.filter(e => e.id !== exerciseId),
      } : null)
    } catch (error) {
      console.error('Failed to delete exercise:', error)
    }
  }

  // v1.7: Toggle includeInFutureCycles for exercise
  const handleToggleIncludeInFutureCycles = async (exerciseId: string, currentValue: boolean) => {
    const newValue = !currentValue
    
    // Optimistic update
    setSelectedWorkout(prev => prev ? {
      ...prev,
      exercises: prev.exercises?.map(e =>
        e.id === exerciseId ? { ...e, includeInFutureCycles: newValue } : e
      ),
    } : null)
    
    try {
      await fetch('/api/gym/exercises', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          includeInFutureCycles: newValue
        }),
      })
    } catch (error) {
      console.error('Failed to toggle includeInFutureCycles:', error)
      // Revert on error
      setSelectedWorkout(prev => prev ? {
        ...prev,
        exercises: prev.exercises?.map(e =>
          e.id === exerciseId ? { ...e, includeInFutureCycles: currentValue } : e
        ),
      } : null)
    }
  }

  // Calendar generation
  const getCalendarDays = useCallback((): (null | { date: Date; workout: GymWorkout | undefined; dayNum: number })[] => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = (firstDay.getDay() + 6) % 7

    const days: (null | { date: Date; workout: GymWorkout | undefined; dayNum: number })[] = []
    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const workout = workouts.find(w => {
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
      .filter(w => !w.completed && w.date.split('T')[0] >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null
  }, [activePeriod, workouts])

  const calendarDays = getCalendarDays()
  const periodProgress = getPeriodProgress()
  const nextWorkout = getNextWorkout()
  const completedWorkouts = workouts.filter(w => w.completed).length

  // Generate calendar preview for wizard
  const generateCalendarPreview = useCallback(() => {
    if (daySchedule.length === 0) return []
    
    const today = new Date()
    const days: { date: Date; item: DayScheduleItem; isToday: boolean }[] = []
    
    // Show 2 weeks
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const scheduleIdx = i % daySchedule.length
      days.push({
        date,
        item: daySchedule[scheduleIdx],
        isToday: i === 0
      })
    }
    return days
  }, [daySchedule])

  const calendarPreview = generateCalendarPreview()

  // Toggle day type in wizard
  const toggleDayType = (index: number) => {
    const newSchedule = [...daySchedule]
    const item = newSchedule[index]
    
    if (item.type === 'rest') {
      // Find next available workoutNum
      const maxWorkoutNum = Math.max(
        ...newSchedule.filter(d => d.type === 'workout').map(d => d.workoutNum || 0),
        0
      )
      newSchedule[index] = {
        type: 'workout',
        dayNum: item.dayNum,
        workoutNum: maxWorkoutNum + 1,
        name: `Тренировка ${maxWorkoutNum + 1}`,
        muscleGroups: []
      }
    } else {
      newSchedule[index] = {
        type: 'rest',
        dayNum: item.dayNum
      }
      // Renumber workouts
      let workoutCount = 0
      newSchedule.forEach((d, idx) => {
        if (d.type === 'workout') {
          workoutCount++
          d.workoutNum = workoutCount
        }
      })
    }
    
    setDaySchedule(newSchedule)
  }

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
        {activePeriod && !showPeriodList ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowPeriodList(true)
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
      ) : showPeriodList ? (
        // Show period list
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Периоды</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {periods.map(period => (
              <div
                key={period.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  period.isActive 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div 
                  className="flex items-center gap-3 flex-1"
                  onClick={() => {
                    setActivePeriod(period)
                    setShowPeriodList(false)
                  }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    period.isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{period.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Цикл {period.currentCycle} из {period.totalCycles} • {period.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {period.isActive && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      Активен
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (confirm(`Удалить период "${period.name}"? Все данные будут потеряны.`)) {
                        try {
                          const response = await fetch(`/api/gym?periodId=${period.id}`, {
                            method: 'DELETE'
                          })
                          if (response.ok) {
                            setPeriods(prev => prev.filter(p => p.id !== period.id))
                            if (activePeriod?.id === period.id) {
                              setActivePeriod(periods.find(p => p.id !== period.id) || null)
                            }
                          }
                        } catch (error) {
                          console.error('Failed to delete period:', error)
                        }
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {periods.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Нет периодов</p>
            )}
            <Button
              className="w-full mt-2"
              variant="outline"
              onClick={() => {
                resetWizard()
                setShowWizard(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Новый период
            </Button>
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
          {/* GYM Today Block (v1.3 UX-polish) */}
          {todayData?.hasActivePeriod && (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    GYM сегодня
                  </CardTitle>
                  {todayData.period && (
                    <Badge className="bg-primary/20 text-primary">
                      Цикл {todayData.period.currentCycle}/{todayData.period.totalCycles}
                    </Badge>
                  )}
                </div>
                {/* v1.3 UX: Date and period context */}
                <div className="mt-1">
                  <p className="text-sm font-medium">
                    {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' — '}
                    Период «{todayData.period?.name || 'Тренировки'}»
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {todayData.todayWorkout ? (
                  <>
                    {/* v1.3 UX: Day subtitle + v1.4 status */}
                    <div className="mb-3 pb-2 border-b border-border/30">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          День {todayData.todayWorkout.workoutNum || 1}: {todayData.todayWorkout.template?.name || todayData.todayWorkout.name || 'Тренировка'}
                        </p>
                        {/* v1.4: Status badge */}
                        <Badge className={
                          todayData.todayWorkout.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          todayData.todayWorkout.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-muted text-muted-foreground'
                        }>
                          {todayData.todayWorkout.status === 'completed' ? 'Завершена' :
                           todayData.todayWorkout.status === 'in_progress' ? 'В процессе' :
                           'Запланирована'}
                        </Badge>
                      </div>
                      {(todayData.todayWorkout.template?.muscleGroups?.length || todayData.todayWorkout.muscleGroups?.length || 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(todayData.todayWorkout.template?.muscleGroups || todayData.todayWorkout.muscleGroups || []).map((m: string) => {
                            const group = MUSCLE_GROUPS.find(g => g.value === m)
                            return (
                              <Badge key={m} className={`text-[10px] px-1.5 py-0 ${group?.color || 'bg-muted'}`}>
                                {group?.label || m}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {(() => {
                        // v1.7: Define workout completion status for use in exercises map
                        const isWorkoutCompleted = todayData.todayWorkout?.status === 'completed'
                        
                        return todayData.todayWorkout.exercises?.sort((a, b) => a.order - b.order).map((ex, idx) => {
                          // v1.7: Dynamic weight/reps/sets from first working set
                          const workingSets = ex.sets?.filter((s: { isWarmup?: boolean }) => !s.isWarmup) || []
                          const firstWorkingSet = workingSets[0]
                          const weight = firstWorkingSet?.weight || ex.weight || ex.template?.currentWeight
                          const targetReps = firstWorkingSet?.reps || ex.targetReps || ex.template?.defaultReps
                          const targetSets = workingSets.length || ex.targetSets || ex.template?.defaultSets || 4
                          const nextWt = ex.nextWeight || ex.template?.nextWeight
                    
                    // v1.6: Technique notes split by comma, each on new line
                    const techNote = ex.techniqueNotes || ex.template?.techniqueNotes
                    const techNoteLines = techNote ? techNote.split(',').map(s => s.trim()).filter(Boolean) : []
                    const cycleNote = ex.cycleNote || ex.lastCycleNote
                    const cycleNoteLines = cycleNote ? cycleNote.split(',').map(s => s.trim()).filter(Boolean) : []
                    
                    return (
                      <div key={ex.id} className="py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-muted-foreground text-xs w-5">{idx + 1}.</span>
                            <span className="font-medium text-sm">{ex.name}</span>
                          </div>
                          <div className="text-right font-mono text-sm">
                            {/* v1.7: Compact format: weight × reps × sets */}
                            {weight && targetReps && targetSets && (
                              <span className="text-primary">{weight}×{targetReps}×{targetSets}</span>
                            )}
                            {/* v1.7: Show next weight only after workout is completed */}
                            {nextWt && isWorkoutCompleted && (
                              <span className="text-xs text-muted-foreground ml-1 cursor-pointer hover:text-primary transition-colors" 
                                onClick={() => {
                                  const newWeight = prompt('Новый вес на след. раз:', String(nextWt))
                                  if (newWeight && !isNaN(parseFloat(newWeight))) {
                                    fetch('/api/gym/today', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        exerciseId: ex.id,
                                        nextWeight: parseFloat(newWeight)
                                      })
                                    }).then(() => loadTodayData())
                                  }
                                }}
                                title="Клик чтобы изменить">
                                → {nextWt} в след. раз
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* v1.7: Show technique notes only for non-completed workouts */}
                        {!isWorkoutCompleted && techNoteLines.length > 0 && (
                          <div className="mt-1 ml-7 space-y-0.5">
                            {techNoteLines.map((line, lineIdx) => (
                              <div key={lineIdx} className="flex items-start gap-1.5">
                                <span className="text-xs">💡</span>
                                <span className="text-xs text-muted-foreground">
                                  {line}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* v1.7: Show cycle notes only for non-completed workouts (old notes from previous cycle) */}
                        {!isWorkoutCompleted && cycleNoteLines.length > 0 && (
                          <div className="mt-0.5 ml-7 space-y-0.5">
                            {cycleNoteLines.map((line, lineIdx) => (
                              <div key={lineIdx} className="flex items-start gap-1.5">
                                <span className="text-xs">📝</span>
                                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                  {line}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
                    </div>
                    
                    {/* v1.7: Show workout notes for completed workouts */}
                    {todayData.todayWorkout?.status === 'completed' && todayData.todayWorkout.exercises?.[0]?.cycleNote && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">📝 Заметки на следующий цикл:</p>
                        <p className="text-sm">{todayData.todayWorkout.exercises[0].cycleNote}</p>
                      </div>
                    )}
                    
                    {/* v1.7: Format legend for non-completed only */}
                    {todayData.todayWorkout?.status !== 'completed' && (
                      <div className="mt-3 pt-2 border-t border-border/30">
                        <p className="text-xs text-muted-foreground">
                          Формат: вес × повторы × подходы → вес в след. раз
                        </p>
                      </div>
                    )}
                    
                    {/* v1.4: Quick actions */}
                    <div className="flex gap-2 mt-3">
                      {/* Quick complete - only for planned workouts */}
                      {todayData.todayWorkout.status === 'planned' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => {
                            if (todayData.todayWorkout) {
                              // Open workout detail - user can click "Всё по плану" there
                              loadWorkoutDetails({
                                id: todayData.todayWorkout.id,
                                date: new Date().toISOString(),
                                dayOfWeek: new Date().getDay() || 7,
                                workoutNum: todayData.todayWorkout.workoutNum || 1,
                                name: todayData.todayWorkout.name,
                                muscleGroups: todayData.todayWorkout.muscleGroups,
                                duration: null,
                                completed: todayData.todayWorkout.completed,
                                status: todayData.todayWorkout.status,
                                exercises: []
                              } as GymWorkout)
                            }
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Всё по плану
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="flex-1 bg-primary hover:bg-primary/90"
                        onClick={() => {
                          if (todayData.todayWorkout) {
                            loadWorkoutDetails({
                              id: todayData.todayWorkout.id,
                              date: new Date().toISOString(),
                              dayOfWeek: new Date().getDay() || 7,
                              workoutNum: todayData.todayWorkout.workoutNum || 1,
                              name: todayData.todayWorkout.name,
                              muscleGroups: todayData.todayWorkout.muscleGroups,
                              duration: null,
                              completed: todayData.todayWorkout.completed,
                              status: todayData.todayWorkout.status,
                              exercises: [] // Will be loaded from API
                            } as GymWorkout)
                          }
                        }}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        {todayData.todayWorkout.status === 'in_progress' ? 'Продолжить' : 'Открыть'}
                      </Button>
                    </div>
                  </>
                ) : (
                  /* v1.3 UX: Empty state when no workout today */
                  <div className="text-center py-6">
                    <Coffee className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Сегодня тренировки не запланировано</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Можно отдохнуть или добавить активность вручную
                    </p>
                    {todayData.nextWorkout && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">Следующая тренировка:</p>
                        <p className="text-sm font-medium">
                          {todayData.nextWorkout.name || `Тренировка ${todayData.nextWorkout.workoutNum}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(todayData.nextWorkout.date).toLocaleDateString('ru-RU', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Period stats */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              {/* Period dates */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-muted-foreground">
                  <span>Начало: {new Date(activePeriod.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                  <span className="mx-2">•</span>
                  <span>Циклов: {Math.min(activePeriod.currentCycle - 1, activePeriod.totalCycles)} из {activePeriod.totalCycles}</span>
                </div>
                <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                  {activePeriod.type}
                </Badge>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <Target className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                  <p className="text-xl font-bold text-primary">{activePeriod.currentCycle}</p>
                  <p className="text-xs text-muted-foreground">Тек. цикл</p>
                </div>
                <div className="text-center">
                  <CheckCircle2 className="w-5 h-5 mx-auto text-green-400 mb-1" />
                  <p className="text-xl font-bold text-primary">{completedWorkouts}</p>
                  <p className="text-xs text-muted-foreground">Тренировок</p>
                </div>
                <div className="text-center">
                  <Trophy className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
                  <p className="text-xl font-bold text-primary">{Math.round(periodProgress)}%</p>
                  <p className="text-xs text-muted-foreground">Прогресс</p>
                </div>
              </div>

              {/* Key workout days */}
              {parsedDaySchedule.filter(d => d.type === 'workout').length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Ключевые дни:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedDaySchedule
                      .filter(d => d.type === 'workout')
                      .slice(0, 4)
                      .map((day, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {day.name || `День ${day.workoutNum}`}
                          {day.muscleGroups && day.muscleGroups.length > 0 && (
                            <span className="ml-1 text-muted-foreground">
                              ({day.muscleGroups.map(m => MUSCLE_GROUPS.find(g => g.value === m)?.label).join('+')})
                            </span>
                          )}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Period progress */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Прогресс периода</CardTitle>
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
                            
                            {isWorkout && day.muscleGroups && Array.isArray(day.muscleGroups) && day.muscleGroups.length > 0 && (
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
                
                {scheduleEdited && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full mt-3 bg-primary"
                    onClick={handleSaveSchedule}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Сохранить изменения
                  </Button>
                )}
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
                      {nextWorkout.muscleGroups && Array.isArray(nextWorkout.muscleGroups) && nextWorkout.muscleGroups.length > 0 && (
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
                    onClick={() => {
                      if (day?.workout) {
                        loadWorkoutDetails(day.workout)
                      } else if (day) {
                        // Open add workout dialog for empty day
                        setSelectedDate(day.date)
                        setNewWorkoutName(`Тренировка ${workouts.length + 1}`)
                        setNewWorkoutMuscles([])
                        setShowAddWorkoutDialog(true)
                      }
                    }}
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
              {wizardStep === 1 ? 'Новый период' : 
               wizardStep === 2 ? 'Настройка тренировок' : 
               wizardStep === 3 ? 'Порядок дней' :
               'Упражнения'}
            </DialogTitle>
          </DialogHeader>
          
          {wizardStep === 1 ? (
            <div className="space-y-4 pt-4">
              {/* Templates */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  Быстрый старт (шаблоны)
                </Label>
                <div className="space-y-2">
                  {WORKOUT_TEMPLATES.map(template => (
                    <label
                      key={template.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedTemplate === template.id ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={selectedTemplate === template.id}
                        onChange={() => applyTemplate(template.id)}
                        className="accent-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">или настрой вручную</span>
                </div>
              </div>

              {/* Training type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Тип периода</Label>
                <div className="space-y-2">
                  {TRAINING_TYPES.map(type => (
                    <label
                      key={type.value}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        wizardConfig.type === type.value && !selectedTemplate ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="periodType"
                        value={type.value}
                        checked={wizardConfig.type === type.value && !selectedTemplate}
                        onChange={() => {
                          setSelectedTemplate(null)
                          setWizardConfig(prev => ({ ...prev, type: type.value }))
                        }}
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
              {wizardConfig.type === 'custom' && !selectedTemplate && (
                <Input
                  placeholder="Название периода"
                  value={wizardConfig.customName}
                  onChange={e => setWizardConfig(prev => ({ ...prev, customName: e.target.value }))}
                />
              )}

              {/* Cycle length */}
              {!selectedTemplate && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Длина цикла (дней)</Label>
                  <Input
                    type="number"
                    min={3}
                    max={14}
                    value={wizardConfig.cycleLength}
                    onChange={e => setWizardConfig(prev => ({ ...prev, cycleLength: parseInt(e.target.value) || 7 }))}
                  />
                </div>
              )}

              {/* Workouts per cycle */}
              {!selectedTemplate && (
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
              )}

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
              {!selectedTemplate && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Формат тренировок</Label>
                  <Select
                    value={wizardConfig.splitType}
                    onValueChange={(value) => setWizardConfig(prev => ({ ...prev, splitType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPLIT_TYPES.map(split => (
                        <SelectItem key={split.value} value={split.value}>
                          {split.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
          ) : wizardStep === 2 ? (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Настрой названия и группы мышц для каждой тренировки.
              </p>

              <div className="space-y-3">
                {workoutDays.map((day, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Тренировка {day.dayNum}</span>
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
                  onClick={() => setWizardStep(3)}
                >
                  Далее
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : wizardStep === 3 ? (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Перетащи дни, чтобы изменить порядок. Нажми на день, чтобы сменить тип (тренировка/отдых).
              </p>

              {/* Day schedule editor */}
              <div className="space-y-1.5">
                {daySchedule.map((item, idx) => {
                  const isWorkout = item.type === 'workout'
                  const dayConfig = isWorkout ? workoutDays.find(d => d.dayNum === item.workoutNum) : null
                  
                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onClick={() => toggleDayType(idx)}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing ${
                        isWorkout 
                          ? 'bg-primary/10 hover:bg-primary/20' 
                          : 'bg-muted/20 hover:bg-muted/30'
                      } ${
                        dragOverIndex === idx && draggedIndex !== idx 
                          ? 'ring-2 ring-primary/50' 
                          : ''
                      }`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground/50" />
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
                                {dayConfig?.name || item.name || `Тренировка ${item.workoutNum}`}
                              </span>
                            </>
                          ) : (
                            <>
                              <Coffee className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Отдых</span>
                            </>
                          )}
                        </div>
                        {isWorkout && ((dayConfig?.muscles || item.muscleGroups || []) as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(dayConfig?.muscles || item.muscleGroups || []).map(muscle => {
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
                  )
                })}
              </div>

              {/* Calendar preview */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Превью календаря (2 недели)
                </Label>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map(day => (
                    <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                  {calendarPreview.map((day, i) => (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center rounded text-xs ${
                        day.isToday ? 'ring-1 ring-primary' : ''
                      } ${
                        day.item.type === 'workout' 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-muted/20 text-muted-foreground'
                      }`}
                    >
                      {day.date.getDate()}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setWizardStep(2)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Назад
                </Button>
                <Button
                  className="flex-1 bg-primary"
                  onClick={() => setWizardStep(4)}
                >
                  Далее
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : wizardStep === 4 ? (
            /* Step 4: Exercises for each workout type - v1.3 */
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Добавь упражнения для каждого типа тренировки.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    loadTemplates()
                    setShowExerciseLibraryDialog(true)
                  }}
                >
                  <Dumbbell className="w-3 h-3 mr-1" />
                  Мои упражнения
                </Button>
              </div>

              <div className="space-y-4">
                {workoutDays.map((day, idx) => {
                  const exercises = wizardExercises[day.dayNum] || []
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{day.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {day.muscles.map(m => MUSCLE_GROUPS.find(g => g.value === m)?.label).join(', ')}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedWorkoutNumForExercise(day.dayNum)
                            setShowWizardExercisePicker(true)
                            loadTemplates()
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Добавить
                        </Button>
                      </div>
                      
                      {/* Exercise list */}
                      <div className="space-y-1 pl-2">
                        {exercises.length === 0 ? (
                          <div className="text-xs text-muted-foreground py-2">
                            Нет упражнений
                          </div>
                        ) : (
                          exercises.map((ex, exIdx) => (
                            <div key={exIdx} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                              <span>{exIdx + 1}. {ex.name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const newExercises = { ...wizardExercises }
                                  newExercises[day.dayNum] = exercises.filter((_, i) => i !== exIdx)
                                  setWizardExercises(newExercises)
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setWizardStep(3)}>
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
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Wizard Exercise Picker Dialog - v1.3 */}
      <Dialog open={showWizardExercisePicker} onOpenChange={setShowWizardExercisePicker}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить упражнение</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 pt-4">
            {isLoadingTemplates ? (
              <div className="text-center py-4 text-muted-foreground">
                Загрузка...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Нет шаблонов. Сначала создайте упражнения в библиотеке.
              </div>
            ) : (
              <div className="space-y-2">
                {templates
                  .filter(t => {
                    // Filter by muscle groups of current workout
                    const day = workoutDays.find(d => d.dayNum === selectedWorkoutNumForExercise)
                    return !day?.muscles?.length || day.muscles.includes(t.muscleGroup || '')
                  })
                  .map(template => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        const day = workoutDays.find(d => d.dayNum === selectedWorkoutNumForExercise)
                        if (!day) return
                        
                        const currentExercises = wizardExercises[day.dayNum] || []
                        const newExercises = {
                          ...wizardExercises,
                          [day.dayNum]: [
                            ...currentExercises,
                            {
                              templateId: template.id,
                              name: template.name,
                              muscleGroup: template.muscleGroup,
                              order: currentExercises.length + 1
                            }
                          ]
                        }
                        setWizardExercises(newExercises)
                        setShowWizardExercisePicker(false)
                      }}
                    >
                      <div>
                        <div className="font-medium text-sm">{template.name}</div>
                        {template.muscleGroup && (
                          <div className="text-xs text-muted-foreground">
                            {MUSCLE_GROUPS.find(g => g.value === template.muscleGroup)?.label}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {template.currentWeight && (
                          <div className="text-sm font-mono">{template.currentWeight} кг</div>
                        )}
                        {template.defaultScheme && (
                          <div className="text-xs text-muted-foreground">{template.defaultScheme}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercise Library Management Dialog - v1.3 */}
      <Dialog open={showExerciseLibraryDialog} onOpenChange={(open) => {
        setShowExerciseLibraryDialog(open)
        if (!open) {
          setEditingTemplate(null)
          loadTemplates() // Refresh templates for wizard
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              Мои упражнения
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {isLoadingTemplates ? (
              <div className="text-center py-4 text-muted-foreground">
                Загрузка...
              </div>
            ) : (
              <div className="space-y-3">
                {/* Muscle group filter - v1.5 */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    className={`cursor-pointer transition-colors ${!libraryMuscleFilter ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'}`}
                    onClick={() => setLibraryMuscleFilter(null)}
                  >
                    Все
                  </Badge>
                  {MUSCLE_GROUPS.map(group => {
                    const count = templates.filter(t => t.muscleGroup === group.value).length
                    if (count === 0) return null
                    return (
                      <Badge
                        key={group.value}
                        className={`cursor-pointer transition-colors ${libraryMuscleFilter === group.value ? group.color : 'bg-muted/50 hover:bg-muted'}`}
                        onClick={() => setLibraryMuscleFilter(group.value)}
                      >
                        {group.label} ({count})
                      </Badge>
                    )
                  })}
                </div>
                
                {/* Create new template button */}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate({
                      name: '',
                      muscleGroup: libraryMuscleFilter || undefined,
                      defaultReps: 12,
                      defaultSets: 4,
                      currentWeight: undefined,
                      nextWeight: undefined,
                      techniqueNotes: undefined
                    })
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Новое упражнение
                </Button>

                {/* Template list */}
                {templates.filter(t => !libraryMuscleFilter || t.muscleGroup === libraryMuscleFilter).length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {libraryMuscleFilter 
                      ? `Нет упражнений для ${MUSCLE_GROUPS.find(g => g.value === libraryMuscleFilter)?.label}`
                      : 'Пока нет упражнений. Создайте первое!'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates
                      .filter(t => !libraryMuscleFilter || t.muscleGroup === libraryMuscleFilter)
                      .map(template => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          // Quick add to current workout if in workout detail
                          if (selectedWorkout && !selectedWorkout.completed) {
                            handleAddFromTemplate({
                              id: template.id,
                              name: template.name,
                              currentWeight: template.currentWeight,
                              nextWeight: template.nextWeight,
                              defaultReps: template.defaultReps,
                              defaultSets: template.defaultSets,
                            })
                          }
                        }}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {template.muscleGroup && MUSCLE_GROUPS.find(g => g.value === template.muscleGroup)?.label}
                            {template.currentWeight && ` • ${template.currentWeight} кг`}
                            {template.defaultReps && template.defaultSets && ` • ${template.defaultReps}×${template.defaultSets}`}
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingTemplate({
                                id: template.id,
                                name: template.name,
                                muscleGroup: template.muscleGroup,
                                defaultReps: template.defaultReps,
                                defaultSets: template.defaultSets,
                                currentWeight: template.currentWeight,
                                nextWeight: template.nextWeight,
                                techniqueNotes: template.techniqueNotes
                              })
                            }}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={async () => {
                              if (confirm('Удалить упражнение?')) {
                                await fetch(`/api/gym/templates?id=${template.id}&hardDelete=true`, {
                                  method: 'DELETE'
                                })
                                loadTemplates()
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit/Create form */}
                {editingTemplate && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        {editingTemplate.id ? 'Редактировать' : 'Новое упражнение'}
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditingTemplate(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Input
                        placeholder="Название упражнения"
                        value={editingTemplate.name}
                        onChange={e => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                      
                      <Select
                        value={editingTemplate.muscleGroup || ''}
                        onValueChange={v => setEditingTemplate(prev => prev ? { ...prev, muscleGroup: v || undefined } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Группа мышц" />
                        </SelectTrigger>
                        <SelectContent>
                          {MUSCLE_GROUPS.map(g => (
                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Схема (например: 10-12x3)"
                        value={editingTemplate.defaultScheme || ''}
                        onChange={e => setEditingTemplate(prev => prev ? { ...prev, defaultScheme: e.target.value || undefined } : null)}
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Текущий вес (кг)"
                          value={editingTemplate.currentWeight || ''}
                          onChange={e => setEditingTemplate(prev => prev ? { ...prev, currentWeight: parseFloat(e.target.value) || undefined } : null)}
                        />
                        <Input
                          type="number"
                          placeholder="След. вес (кг)"
                          value={editingTemplate.nextWeight || ''}
                          onChange={e => setEditingTemplate(prev => prev ? { ...prev, nextWeight: parseFloat(e.target.value) || undefined } : null)}
                        />
                      </div>
                      
                      <textarea
                        className="w-full p-2 rounded-md border border-input bg-background text-sm resize-none"
                        rows={2}
                        placeholder="Заметки по технике"
                        value={editingTemplate.techniqueNotes || ''}
                        onChange={e => setEditingTemplate(prev => prev ? { ...prev, techniqueNotes: e.target.value || undefined } : null)}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={async () => {
                          if (!editingTemplate.name || !user?.id) return
                          
                          if (editingTemplate.id) {
                            // Update existing
                            await fetch('/api/gym/templates', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                id: editingTemplate.id,
                                name: editingTemplate.name,
                                muscleGroup: editingTemplate.muscleGroup,
                                defaultScheme: editingTemplate.defaultScheme,
                                currentWeight: editingTemplate.currentWeight,
                                nextWeight: editingTemplate.nextWeight,
                                techniqueNotes: editingTemplate.techniqueNotes
                              })
                            })
                          } else {
                            // Create new
                            await fetch('/api/gym/templates', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                userId: user.id,
                                name: editingTemplate.name,
                                muscleGroup: editingTemplate.muscleGroup,
                                defaultScheme: editingTemplate.defaultScheme,
                                currentWeight: editingTemplate.currentWeight,
                                nextWeight: editingTemplate.nextWeight,
                                techniqueNotes: editingTemplate.techniqueNotes
                              })
                            })
                          }
                          
                          setEditingTemplate(null)
                          loadTemplates()
                        }}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Сохранить
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Workout Detail Dialog */}
      <Dialog open={showWorkoutDetail} onOpenChange={(open) => {
        setShowWorkoutDetail(open)
        if (!open) {
          setShowRescheduleDialog(false)
          setShowSkipDialog(false)
          setRescheduleDate('')
          setRescheduleMode('single')
        }
      }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkout?.name || `Тренировка ${selectedWorkout?.workoutNum}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Workout info with status */}
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">
                  {selectedWorkout?.date && new Date(selectedWorkout.date).toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </span>
                {activePeriod && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {activePeriod.name} • Цикл {activePeriod.currentCycle}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Status badge */}
                <Badge className={
                  selectedWorkout?.completed ? 'bg-emerald-500/20 text-emerald-400' :
                  selectedWorkout?.status === 'skipped' ? 'bg-orange-500/20 text-orange-400' :
                  selectedWorkout?.status === 'rescheduled' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-muted text-muted-foreground'
                }>
                  {selectedWorkout?.completed ? 'Выполнена' :
                   selectedWorkout?.status === 'skipped' ? 'Пропущена' :
                   selectedWorkout?.status === 'rescheduled' ? 'Перенесена' :
                   'Запланирована'}
                </Badge>
                {selectedWorkout?.duration && (
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {selectedWorkout.duration} мин
                  </Badge>
                )}
              </div>
            </div>

            {/* Muscle groups */}
            {selectedWorkout?.muscleGroups && Array.isArray(selectedWorkout.muscleGroups) && selectedWorkout.muscleGroups.length > 0 && (
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

            {/* Skip/Reschedule buttons */}
            {!showRescheduleDialog && !showSkipDialog && !selectedWorkout?.completed && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowRescheduleDialog(true)
                    const tomorrow = new Date()
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    setRescheduleDate(tomorrow.toISOString().split('T')[0])
                  }}
                >
                  <CalendarClock className="w-4 h-4 mr-1" />
                  Перенести
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-orange-400 hover:text-orange-300"
                  onClick={() => setShowSkipDialog(true)}
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  Пропустить
                </Button>
              </div>
            )}

            {/* Skip workout dialog */}
            {showSkipDialog && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-3">
                <p className="text-sm font-medium">Как пропустить тренировку?</p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleSkipWorkout(false)}
                  >
                    <div className="text-left">
                      <div className="font-medium">Сегодня не тренируюсь</div>
                      <div className="text-xs text-muted-foreground">Тренировка останется на этом дне, цикл не сдвигается</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleSkipWorkout(true)}
                  >
                    <div className="text-left">
                      <div className="font-medium">Пропустить и сдвинуть</div>
                      <div className="text-xs text-muted-foreground">Тренировка переносится в конец периода, остальные сдвигаются</div>
                    </div>
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowSkipDialog(false)}
                >
                  Отмена
                </Button>
              </div>
            )}

            {/* Reschedule workout dialog */}
            {showRescheduleDialog && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <p className="text-sm font-medium">Куда перенести тренировку?</p>
                
                {/* Quick date buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      setRescheduleDate(tomorrow.toISOString().split('T')[0])
                    }}
                  >
                    Завтра
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const date = new Date()
                      date.setDate(date.getDate() + 2)
                      setRescheduleDate(date.toISOString().split('T')[0])
                    }}
                  >
                    Через 2 дня
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const date = new Date()
                      const daysUntilSat = (6 - date.getDay() + 7) % 7 || 7
                      date.setDate(date.getDate() + daysUntilSat)
                      setRescheduleDate(date.toISOString().split('T')[0])
                    }}
                  >
                    Суббота
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const date = new Date()
                      const daysUntilSun = (7 - date.getDay()) % 7 || 7
                      date.setDate(date.getDate() + daysUntilSun)
                      setRescheduleDate(date.toISOString().split('T')[0])
                    }}
                  >
                    Воскресенье
                  </Button>
                </div>
                
                {/* Date picker */}\n                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Или выберите дату</Label>
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                {/* Mode selection */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-muted-foreground">Как перенести?</Label>
                  <div className="space-y-1">
                    <label className="flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/30">
                      <input
                        type="radio"
                        name="rescheduleMode"
                        checked={rescheduleMode === 'single'}
                        onChange={() => setRescheduleMode('single')}
                        className="mt-1 accent-primary"
                      />
                      <div>
                        <div className="text-sm font-medium">Только эту тренировку</div>
                        <div className="text-xs text-muted-foreground">Остальной цикл остаётся на месте</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/30">
                      <input
                        type="radio"
                        name="rescheduleMode"
                        checked={rescheduleMode === 'shift'}
                        onChange={() => setRescheduleMode('shift')}
                        className="mt-1 accent-primary"
                      />
                      <div>
                        <div className="text-sm font-medium">Сдвинуть весь цикл</div>
                        <div className="text-xs text-muted-foreground">Все последующие тренировки сдвинутся</div>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setShowRescheduleDialog(false)
                      setRescheduleDate('')
                    }}
                  >
                    Отмена
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-primary"
                    onClick={() => handleRescheduleWorkout(rescheduleMode)}
                    disabled={!rescheduleDate}
                  >
                    Перенести
                  </Button>
                </div>
              </div>
            )}

            {/* Exercises */}
            <div className="space-y-3">
              {selectedWorkout?.exercises?.map(exercise => {
                // v1.7: Dynamic weight/reps/sets from first working set
                const workingSets = exercise.sets?.filter(s => !s.isWarmup) || []
                const firstWorkingSet = workingSets[0]
                const weight = firstWorkingSet?.weight || exercise.template?.currentWeight || exercise.weight
                const targetReps = firstWorkingSet?.reps || exercise.targetReps || exercise.template?.defaultReps
                const targetSets = workingSets.length || exercise.targetSets || exercise.template?.defaultSets || 4
                const nextWt = exercise.nextWeight || exercise.template?.nextWeight
                const setsCount = exercise.sets?.length || 0
                const completedSets = exercise.sets?.filter(s => s.completed).length || 0
                // v1.7: Can delete exercises that were added manually (not from template)
                const canDeleteExercise = !exercise.workoutTemplateExerciseId && !selectedWorkout?.completed

                return (
                  <div key={exercise.id} className="p-3 rounded-xl bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{exercise.name}</span>
                          {/* v1.5: New format display: weight × targetReps × targetSets */}
                          <span className="text-primary font-mono text-sm">
                            {weight && targetReps && targetSets && `${weight} × ${targetReps} × ${targetSets}`}
                          </span>
                          {nextWt && (
                            <span className="text-xs text-muted-foreground">
                              → {nextWt} в след. раз
                            </span>
                          )}
                        </div>
                        {exercise.muscleGroup && (
                          <span className="text-xs text-muted-foreground">
                            {MUSCLE_GROUPS.find(g => g.value === exercise.muscleGroup)?.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Sets progress indicator */}
                        {setsCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {completedSets}/{setsCount}
                          </Badge>
                        )}
                        {/* v1.7: Delete exercise button for manually added exercises */}
                        {canDeleteExercise && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteExercise(exercise.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* v1.7: Toggle for includeInFutureCycles */}
                    {!selectedWorkout?.completed && (
                      <div className="flex items-center gap-2">
                        <button
                          className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                            exercise.includeInFutureCycles !== false
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                          onClick={() => handleToggleIncludeInFutureCycles(exercise.id, exercise.includeInFutureCycles !== false)}
                        >
                          {exercise.includeInFutureCycles !== false ? '✓ В программе' : 'Только сегодня'}
                        </button>
                      </div>
                    )}

                    {/* Sets - v1.5: with warmup support */}
                    <div className="space-y-1">
                      {exercise.sets?.map((set, setIdx) => {
                        // Count working sets for proper numbering
                        const workingSetsBefore = exercise.sets?.slice(0, setIdx).filter(s => !s.isWarmup).length || 0
                        const isWarmup = set.isWarmup
                        
                        return (
                          <div key={set.id} className={`flex items-center gap-2 text-sm ${isWarmup ? 'opacity-75' : ''}`}>
                            {/* v1.5: Badge for warmup "Р" or number for working sets */}
                            {isWarmup ? (
                              <Badge className="w-6 h-6 p-0 flex items-center justify-center bg-orange-500/20 text-orange-400 text-xs">
                                Р
                              </Badge>
                            ) : (
                              <span className="w-6 text-muted-foreground text-center">{workingSetsBefore + 1}</span>
                            )}
                            <Input
                              type="number"
                              placeholder="Вес"
                              className="w-20 h-8"
                              value={set.weight || ''}
                              onChange={e => handleUpdateSet(exercise.id, set.id, { weight: parseFloat(e.target.value) || undefined })}
                              disabled={selectedWorkout?.completed}
                            />
                            <span className="text-muted-foreground">кг ×</span>
                            <Input
                              type="number"
                              placeholder="Повт"
                              className="w-16 h-8"
                              value={set.reps || ''}
                              onChange={e => handleUpdateSet(exercise.id, set.id, { reps: parseInt(e.target.value) || undefined })}
                              disabled={selectedWorkout?.completed}
                            />
                            <button
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                set.completed ? 'bg-emerald-500 text-white' : 'bg-muted'
                              } ${selectedWorkout?.completed ? 'cursor-not-allowed' : ''}`}
                              onClick={() => !selectedWorkout?.completed && handleUpdateSet(exercise.id, set.id, { completed: !set.completed })}
                              disabled={selectedWorkout?.completed}
                            >
                              {set.completed && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                            {/* v1.7: Hide delete button for completed workouts */}
                            {!selectedWorkout?.completed && (
                              <button
                                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => handleDeleteSet(exercise.id, set.id)}
                                title="Удалить подход"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* v1.5: Fill all button when no weights entered */}
                    {exercise.sets && exercise.sets.length > 0 && exercise.sets.every(s => !s.weight) && weight && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-primary hover:text-primary"
                        onClick={() => {
                          // Fill all sets with default weight
                          exercise.sets?.forEach(set => {
                            if (!set.isWarmup) {
                              handleUpdateSet(exercise.id, set.id, { weight, reps: targetReps }, true)
                            }
                          })
                        }}
                      >
                        <Weight className="w-3 h-3 mr-1" />
                        Заполнить все: {weight} кг × {targetReps}
                      </Button>
                    )}

                    {/* v1.7: Add set buttons - only for non-completed workouts */}
                    {!selectedWorkout?.completed && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => handleAddSet(exercise, false)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Основной подход
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                          onClick={() => handleAddSet(exercise, true)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Разминочный
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Additional Activities */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Доп. активности
              </Label>
              
              {/* Display existing activities */}
              {selectedWorkout?.additionalActivities && selectedWorkout.additionalActivities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedWorkout.additionalActivities.map((activity, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className={`text-xs ${!selectedWorkout.completed ? 'cursor-pointer hover:bg-destructive/20' : ''}`}
                      onClick={() => {
                        if (!selectedWorkout.completed && selectedWorkout.additionalActivities) {
                          // Remove activity
                          const newActivities = selectedWorkout.additionalActivities.filter((_, i) => i !== idx)
                          setSelectedWorkout(prev => prev ? {
                            ...prev,
                            additionalActivities: newActivities
                          } : null)
                          // v1.7: Auto-save
                          handleSaveAdditionalActivities(newActivities)
                        }
                      }}
                    >
                      {activity.type === 'walk' && `🚶 ${activity.value}`}
                      {activity.type === 'abs' && `💪 Пресс ${activity.value}`}
                      {activity.type === 'plank' && `⏱️ Планка ${activity.value}`}
                      {activity.type === 'bike' && `🚴 ${activity.value}`}
                      {activity.type === 'other' && activity.value}
                      {!selectedWorkout.completed && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Add activity controls (only if not completed) */}
              {!selectedWorkout?.completed && (
                <div className="flex gap-2">
                  <Select value={newActivityType} onValueChange={(v) => setNewActivityType(v as AdditionalActivity['type'])}>
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk">🚶 Ходьба</SelectItem>
                      <SelectItem value="abs">💪 Пресс</SelectItem>
                      <SelectItem value="plank">⏱️ Планка</SelectItem>
                      <SelectItem value="bike">🚴 Велосипед</SelectItem>
                      <SelectItem value="other">📝 Другое</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="10 км / 15×3 / 60 сек"
                    value={newActivityValue}
                    onChange={e => setNewActivityValue(e.target.value)}
                    className="flex-1 h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      if (newActivityValue && selectedWorkout) {
                        const newActivity: AdditionalActivity = { 
                          type: newActivityType, 
                          value: newActivityValue 
                        }
                        const newActivities = [...(selectedWorkout.additionalActivities || []), newActivity]
                        setSelectedWorkout(prev => prev ? {
                          ...prev,
                          additionalActivities: newActivities
                        } : null)
                        setNewActivityValue('')
                        // v1.7: Auto-save
                        handleSaveAdditionalActivities(newActivities)
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Add exercise - only for non-completed workouts */}
            {!selectedWorkout?.completed && (
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
                {selectedWorkout?.muscleGroups && Array.isArray(selectedWorkout.muscleGroups) && selectedWorkout.muscleGroups.length > 0 && (
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
            )}

            {/* Complete workout - v1.6: Two options with hints */}
            {!selectedWorkout?.completed && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Как прошла тренировка?
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={openQuickCompleteDialog}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Всё по плану
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => {
                      if (selectedWorkout) {
                        handleCompleteWorkout(selectedWorkout.id)
                    }
                  }}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Заметки
                </Button>
              </div>
                <p className="text-[10px] text-muted-foreground/70 text-center">
                  «Всё по плану» — быстро завершить. «Заметки» — оценить веса и добавить заметки.
                </p>
              </div>
            )}

            {selectedWorkout?.completed && (
              <div className="space-y-2">
                <div className="text-center py-2 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1" />
                  Тренировка завершена!
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                  onClick={handleUndoComplete}
                >
                  <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                  Отменить завершение
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Post-Workout Dialog (F5) */}
      <Dialog open={showPostWorkoutDialog} onOpenChange={(open) => {
        setShowPostWorkoutDialog(open)
        if (!open) {
          setExerciseRatings({})
          setEditingActivities([])
        }
      }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" />
              Заметки по тренировке
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Workout note - saved as cycle note for next cycle */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Заметка по тренировке (покажется в следующем цикле)
              </Label>
              <textarea
                className="w-full p-2 rounded-md border border-input bg-background text-sm resize-none"
                rows={2}
                placeholder="Например: было тяжеловато, снизить вес"
                value={workoutNote}
                onChange={e => setWorkoutNote(e.target.value)}
              />
            </div>

            {/* Exercise ratings */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">
                Оцени сложность каждого упражнения
              </Label>
              {selectedWorkout?.exercises?.map(exercise => {
                const currentWeight = exercise.sets?.[0]?.weight || exercise.template?.currentWeight
                const step = exercise.template?.progressionStep || 2.5
                const rating = exerciseRatings[exercise.id] || 'normal'
                let nextWeightPreview = currentWeight
                if (currentWeight) {
                  if (rating === 'easy') nextWeightPreview = currentWeight + step
                  else if (rating === 'hard') nextWeightPreview = Math.max(0, currentWeight - step)
                  else nextWeightPreview = currentWeight
                }

                return (
                  <div key={exercise.id} className="p-3 rounded-xl bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{exercise.name}</span>
                      {currentWeight && (
                        <span className="text-xs text-muted-foreground">
                          {currentWeight} кг
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={rating === 'easy' ? 'default' : 'outline'}
                        className={`flex-1 text-xs ${rating === 'easy' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        onClick={() => setExerciseRatings(prev => ({ ...prev, [exercise.id]: 'easy' }))}
                      >
                        😊 Легко
                      </Button>
                      <Button
                        size="sm"
                        variant={rating === 'normal' ? 'default' : 'outline'}
                        className={`flex-1 text-xs ${rating === 'normal' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                        onClick={() => setExerciseRatings(prev => ({ ...prev, [exercise.id]: 'normal' }))}
                      >
                        😐 Норм
                      </Button>
                      <Button
                        size="sm"
                        variant={rating === 'hard' ? 'default' : 'outline'}
                        className={`flex-1 text-xs ${rating === 'hard' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                        onClick={() => setExerciseRatings(prev => ({ ...prev, [exercise.id]: 'hard' }))}
                      >
                        😫 Тяжело
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Save button */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPostWorkoutDialog(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  if (selectedWorkout) {
                    finalizeWorkout(selectedWorkout.id, exerciseRatings, editingActivities, workoutNote)
                  }
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* v1.6: Quick Complete Dialog */}
      <Dialog open={showQuickCompleteDialog} onOpenChange={setShowQuickCompleteDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Завершить тренировку
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Unfilled sets warning */}
            {getUnfilledSetsInfo().length > 0 && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                <p className="text-sm font-medium text-orange-400">
                  Незаполненные подходы ({getUnfilledSetsInfo().length}):
                </p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {getUnfilledSetsInfo().slice(0, 5).map((s, i) => (
                    <div key={i}>• {s.exerciseName}, подход {s.setNum}</div>
                  ))}
                  {getUnfilledSetsInfo().length > 5 && (
                    <div>... и ещё {getUnfilledSetsInfo().length - 5}</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleAutoFillSets}
                >
                  <Weight className="w-3 h-3 mr-1" />
                  Заполнить автоматически
                </Button>
              </div>
            )}

            {/* Next weights configuration - v1.7: separate inputs */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">
                План на следующий раз
              </Label>
              {selectedWorkout?.exercises?.map(exercise => {
                const workingSets = exercise.sets?.filter(s => !s.isWarmup) || []
                const firstWorkingSet = workingSets[0]
                const currentWeight = firstWorkingSet?.weight || exercise.template?.currentWeight || exercise.weight || 0
                const currentReps = firstWorkingSet?.reps || exercise.targetReps || exercise.template?.defaultReps || 10
                const currentSets = workingSets.length || exercise.targetSets || exercise.template?.defaultSets || 4
                const nextConfig = quickCompleteNextWeights[exercise.id] || { weight: currentWeight, reps: currentReps, sets: currentSets }
                
                return (
                  <div key={exercise.id} className="p-3 rounded-xl bg-muted/30 space-y-2">
                    <div className="font-medium text-sm">{exercise.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Сейчас: {currentWeight} кг × {currentReps} повт × {currentSets} подх
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">В след. раз:</span>
                      <Input
                        type="number"
                        className="w-16 h-8 text-sm"
                        value={nextConfig.weight || ''}
                        onChange={e => {
                          const newWeight = parseFloat(e.target.value) || currentWeight
                          setQuickCompleteNextWeights(prev => ({
                            ...prev,
                            [exercise.id]: { ...prev[exercise.id], weight: newWeight }
                          }))
                        }}
                      />
                      <span className="text-xs">кг ×</span>
                      <Input
                        type="number"
                        className="w-14 h-8 text-sm"
                        value={nextConfig.reps || ''}
                        onChange={e => {
                          const newReps = parseInt(e.target.value) || currentReps
                          setQuickCompleteNextWeights(prev => ({
                            ...prev,
                            [exercise.id]: { ...prev[exercise.id], reps: newReps }
                          }))
                        }}
                      />
                      <span className="text-xs">повт ×</span>
                      <Input
                        type="number"
                        className="w-14 h-8 text-sm"
                        value={nextConfig.sets || ''}
                        onChange={e => {
                          const newSets = parseInt(e.target.value) || currentSets
                          setQuickCompleteNextWeights(prev => ({
                            ...prev,
                            [exercise.id]: { ...prev[exercise.id], sets: newSets }
                          }))
                        }}
                      />
                      <span className="text-xs">подх</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Workout note */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Заметка на следующий цикл
              </Label>
              <textarea
                className="w-full p-2 rounded-md border border-input bg-background text-sm resize-none"
                rows={2}
                placeholder="Например: было тяжеловато, снизить вес"
                value={workoutNote}
                onChange={e => setWorkoutNote(e.target.value)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowQuickCompleteDialog(false)}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleConfirmQuickComplete}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Завершить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Workout Dialog (from calendar click) */}
      <Dialog open={showAddWorkoutDialog} onOpenChange={(open) => {
        setShowAddWorkoutDialog(open)
        if (!open) {
          setSelectedDate(null)
          setNewWorkoutName('')
          setNewWorkoutMuscles([])
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Добавить тренировку
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="text-sm text-muted-foreground">
              {selectedDate?.toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </div>
            
            {/* Select from existing workout types */}
            {parsedDaySchedule.filter(d => d.type === 'workout').length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Выбрать из текущего периода</Label>
                <div className="grid grid-cols-2 gap-2">
                  {parsedDaySchedule
                    .filter(d => d.type === 'workout')
                    .map((day, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          setNewWorkoutName(day.name || `Тренировка ${day.workoutNum}`)
                          setNewWorkoutMuscles(day.muscleGroups || [])
                        }}
                      >
                        <Dumbbell className="w-3 h-3 mr-2" />
                        {day.name || `Тренировка ${day.workoutNum}`}
                      </Button>
                    ))}
                </div>
              </div>
            )}
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">или создать свою</span>
              </div>
            </div>
            
            {/* Custom workout */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Название</Label>
                <Input
                  value={newWorkoutName}
                  onChange={e => setNewWorkoutName(e.target.value)}
                  placeholder="Например: Грудь + Трицепс"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Группы мышц</Label>
                <div className="flex flex-wrap gap-1">
                  {MUSCLE_GROUPS.map(muscle => (
                    <button
                      key={muscle.value}
                      className={`px-2 py-1 rounded-full text-xs transition-colors ${
                        newWorkoutMuscles.includes(muscle.value)
                          ? muscle.color
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                      onClick={() => {
                        setNewWorkoutMuscles(prev => 
                          prev.includes(muscle.value)
                            ? prev.filter(m => m !== muscle.value)
                            : [...prev, muscle.value]
                        )
                      }}
                    >
                      {muscle.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAddWorkoutDialog(false)}
              >
                Отмена
              </Button>
              <Button 
                className="flex-1 bg-primary"
                onClick={handleAddWorkoutToDate}
                disabled={!newWorkoutName}
              >
                Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* v1.7: Completion Preview Dialog */}
      <Dialog open={showCompletionPreview} onOpenChange={setShowCompletionPreview}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Тренировка завершена!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Exercises summary - compact format */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Итоги тренировки:</Label>
              <div className="space-y-1">
                {completionData.exercises.map((ex, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="font-medium">{ex.name}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-primary">
                        {ex.weight && ex.reps && ex.sets && `${ex.weight}×${ex.reps}×${ex.sets}`}
                      </span>
                      {ex.nextWeight && ex.nextWeight !== ex.weight && (
                        <span className="text-xs text-muted-foreground ml-1">
                          → {ex.nextWeight} след.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note for next cycle */}
            {completionData.note && (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">📝 Заметка на следующий цикл:</p>
                <p className="text-sm">{completionData.note}</p>
              </div>
            )}

            {/* Close button */}
            <Button
              className="w-full bg-primary"
              onClick={() => setShowCompletionPreview(false)}
            >
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function - neutral default names
function getWorkoutName(type: string, workoutNum: number): string {
  // [UX] Default workout names = Тренировка 1..4
  // User can rename manually, but default is always neutral
  return `Тренировка ${workoutNum}`
}
