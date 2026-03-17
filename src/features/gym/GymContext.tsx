'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAppStore } from '@/lib/store'
import { showSuccessToast, showErrorToast, isOnline } from '@/lib/network-utils'
import {
  TRAINING_TYPES,
  WORKOUT_TEMPLATES,
  type DayScheduleItem,
  type WorkoutDayConfig,
  type GymExerciseSet,
  type GymExercise,
  type GymWorkout,
  type AdditionalActivity,
  type GymPeriod,
} from '@/features/gym'

// ─── Helper ──────────────────────────────────────────────────────────────────

function getWorkoutName(_type: string, workoutNum: number): string {
  return `Тренировка ${workoutNum}`
}

// ─── todayData type ───────────────────────────────────────────────────────────

export interface TodayWorkoutExercise {
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
}

export interface TodayData {
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
    exercises: TodayWorkoutExercise[]
  }
  nextWorkout?: {
    id: string
    date: string
    name: string | null
    workoutNum?: number
  }
  isToday: boolean
}

// ─── Context value type ───────────────────────────────────────────────────────

export interface GymContextValue {
  // user
  user: ReturnType<typeof useAppStore>['user']

  // Core data
  periods: GymPeriod[]
  setPeriods: React.Dispatch<React.SetStateAction<GymPeriod[]>>
  activePeriod: GymPeriod | null
  setActivePeriod: React.Dispatch<React.SetStateAction<GymPeriod | null>>
  workouts: GymWorkout[]
  setWorkouts: React.Dispatch<React.SetStateAction<GymWorkout[]>>
  currentMonth: Date
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>
  isLoading: boolean
  showPeriodList: boolean
  setShowPeriodList: React.Dispatch<React.SetStateAction<boolean>>

  // Today data
  todayData: TodayData | null
  isLoadingToday: boolean

  // Wizard state
  showWizard: boolean
  setShowWizard: React.Dispatch<React.SetStateAction<boolean>>
  wizardStep: number
  setWizardStep: React.Dispatch<React.SetStateAction<number>>
  wizardConfig: {
    type: string
    customName: string
    cycleLength: number
    workoutsPerCycle: number
    totalCycles: number
    splitType: string
  }
  setWizardConfig: React.Dispatch<React.SetStateAction<GymContextValue['wizardConfig']>>
  workoutDays: WorkoutDayConfig[]
  setWorkoutDays: React.Dispatch<React.SetStateAction<WorkoutDayConfig[]>>
  daySchedule: DayScheduleItem[]
  setDaySchedule: React.Dispatch<React.SetStateAction<DayScheduleItem[]>>
  selectedTemplate: string | null
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string | null>>
  draggedIndex: number | null
  dragOverIndex: number | null
  wizardExercises: Record<number, Array<{ templateId?: string; name: string; muscleGroup?: string; order: number }>>
  setWizardExercises: React.Dispatch<React.SetStateAction<GymContextValue['wizardExercises']>>
  showWizardExercisePicker: boolean
  setShowWizardExercisePicker: React.Dispatch<React.SetStateAction<boolean>>
  selectedWorkoutNumForExercise: number | null
  setSelectedWorkoutNumForExercise: React.Dispatch<React.SetStateAction<number | null>>

  // Exercise library
  showExerciseLibraryDialog: boolean
  setShowExerciseLibraryDialog: React.Dispatch<React.SetStateAction<boolean>>
  editingTemplate: {
    id?: string
    name: string
    muscleGroup?: string
    defaultScheme?: string
    defaultReps?: number
    defaultSets?: number
    currentWeight?: number
    nextWeight?: number
    techniqueNotes?: string
  } | null
  setEditingTemplate: React.Dispatch<React.SetStateAction<GymContextValue['editingTemplate']>>
  libraryMuscleFilter: string | null
  setLibraryMuscleFilter: React.Dispatch<React.SetStateAction<string | null>>

  // Parsed day schedule
  parsedDaySchedule: DayScheduleItem[]
  setParsedDaySchedule: React.Dispatch<React.SetStateAction<DayScheduleItem[]>>

  // Workout detail
  selectedWorkout: GymWorkout | null
  setSelectedWorkout: React.Dispatch<React.SetStateAction<GymWorkout | null>>
  showWorkoutDetail: boolean
  setShowWorkoutDetail: React.Dispatch<React.SetStateAction<boolean>>

  // Exercise editor
  editingExercise: GymExercise | null
  setEditingExercise: React.Dispatch<React.SetStateAction<GymExercise | null>>
  showExerciseEditor: boolean
  setShowExerciseEditor: React.Dispatch<React.SetStateAction<boolean>>
  newExerciseName: string
  setNewExerciseName: React.Dispatch<React.SetStateAction<string>>
  newExerciseMuscle: string
  setNewExerciseMuscle: React.Dispatch<React.SetStateAction<string>>

  // Schedule edit
  scheduleEdited: boolean

  // Skip / reschedule
  showSkipDialog: boolean
  setShowSkipDialog: React.Dispatch<React.SetStateAction<boolean>>
  showRescheduleDialog: boolean
  setShowRescheduleDialog: React.Dispatch<React.SetStateAction<boolean>>
  rescheduleMode: 'single' | 'shift'
  setRescheduleMode: React.Dispatch<React.SetStateAction<'single' | 'shift'>>
  rescheduleDate: string
  setRescheduleDate: React.Dispatch<React.SetStateAction<string>>
  showReschedule: boolean
  setShowReschedule: React.Dispatch<React.SetStateAction<boolean>>

  // Add workout dialog
  showAddWorkoutDialog: boolean
  setShowAddWorkoutDialog: React.Dispatch<React.SetStateAction<boolean>>
  selectedDate: Date | null
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>
  newWorkoutName: string
  setNewWorkoutName: React.Dispatch<React.SetStateAction<string>>
  newWorkoutMuscles: string[]
  setNewWorkoutMuscles: React.Dispatch<React.SetStateAction<string[]>>

  // Post-workout dialog
  showPostWorkoutDialog: boolean
  setShowPostWorkoutDialog: React.Dispatch<React.SetStateAction<boolean>>
  exerciseRatings: Record<string, 'easy' | 'normal' | 'hard'>
  setExerciseRatings: React.Dispatch<React.SetStateAction<Record<string, 'easy' | 'normal' | 'hard'>>>
  editingActivities: AdditionalActivity[]
  setEditingActivities: React.Dispatch<React.SetStateAction<AdditionalActivity[]>>

  // Exercise card dialog
  showExerciseCardDialog: boolean
  setShowExerciseCardDialog: React.Dispatch<React.SetStateAction<boolean>>
  selectedExerciseCard: GymExercise | null
  exerciseHistory: Array<{ date: string; weight?: number; scheme?: string; completed: boolean }>
  isLoadingHistory: boolean

  // Additional activities
  newActivityType: AdditionalActivity['type']
  setNewActivityType: React.Dispatch<React.SetStateAction<AdditionalActivity['type']>>
  newActivityValue: string
  setNewActivityValue: React.Dispatch<React.SetStateAction<string>>

  // Saving indicator
  savingSets: Set<string>

  // Template select dialog
  showTemplateSelectDialog: boolean
  setShowTemplateSelectDialog: React.Dispatch<React.SetStateAction<boolean>>
  templates: Array<{
    id: string
    name: string
    muscleGroup?: string
    currentWeight?: number
    defaultScheme?: string
    defaultReps?: number
    defaultSets?: number
    nextWeight?: number
    techniqueNotes?: string
  }>
  isLoadingTemplates: boolean
  personalRecords: Record<string, number>

  // Quick complete dialog
  showQuickCompleteDialog: boolean
  setShowQuickCompleteDialog: React.Dispatch<React.SetStateAction<boolean>>
  quickCompleteNextWeights: Record<string, { weight: number; reps: number; sets: number }>
  setQuickCompleteNextWeights: React.Dispatch<React.SetStateAction<Record<string, { weight: number; reps: number; sets: number }>>>
  workoutNote: string
  setWorkoutNote: React.Dispatch<React.SetStateAction<string>>
  stretchingDone: boolean
  setStretchingDone: React.Dispatch<React.SetStateAction<boolean>>

  // Completion preview
  showCompletionPreview: boolean
  setShowCompletionPreview: React.Dispatch<React.SetStateAction<boolean>>
  completionData: {
    exercises: Array<{ name: string; weight?: number; reps?: number; sets?: number; nextWeight?: number }>
    note?: string
  }

  // Drag for schedule
  scheduleDraggedIdx: number | null
  scheduleDragOverIdx: number | null

  // Computed/derived
  calendarDays: (null | { date: Date; workout: GymWorkout | undefined; dayNum: number })[]
  periodProgress: number
  nextWorkout: GymWorkout | null
  completedWorkouts: number
  calendarPreview: { date: Date; item: DayScheduleItem; isToday: boolean }[]

  // Handlers
  loadPeriods: () => Promise<void>
  loadTodayData: () => Promise<void>
  applyTemplate: (templateId: string) => void
  handleDragStart: (index: number) => void
  handleDragOver: (e: React.DragEvent, index: number) => void
  handleDragEnd: () => void
  handleScheduleDragStart: (index: number) => void
  handleScheduleDragOver: (e: React.DragEvent, index: number) => void
  handleScheduleDragEnd: () => void
  handleSaveSchedule: () => Promise<void>
  handleSkipWorkout: (shiftSchedule: boolean) => Promise<void>
  handleRescheduleWorkout: (mode: 'single' | 'shift') => Promise<void>
  handleAddWorkoutToDate: () => Promise<void>
  handleCreatePeriod: () => Promise<void>
  resetWizard: () => void
  handleCompleteWorkout: (workoutId: string) => Promise<void>
  openQuickCompleteDialog: () => void
  getUnfilledSetsInfo: () => Array<{ exerciseName: string; exerciseId: string; setNum: number; setId: string }>
  handleAutoFillSets: () => void
  handleConfirmQuickComplete: () => Promise<void>
  handleUndoComplete: () => Promise<void>
  finalizeWorkout: (workoutId: string, ratings: Record<string, 'easy' | 'normal' | 'hard'>, activities: AdditionalActivity[], note?: string, stretchingDone?: boolean) => Promise<void>
  loadWorkoutDetails: (workout: GymWorkout) => Promise<void>
  loadExerciseHistory: (exercise: GymExercise) => Promise<void>
  loadTemplates: () => Promise<void>
  openExerciseCard: (exercise: GymExercise) => Promise<void>
  handleAddFromTemplate: (template: { id: string; name: string; currentWeight?: number; nextWeight?: number; defaultReps?: number; defaultSets?: number; defaultScheme?: string }) => Promise<void>
  handleAddExercise: () => Promise<void>
  handleAddSet: (exercise: GymExercise, isWarmup?: boolean) => Promise<void>
  handleUpdateSet: (exerciseId: string, setId: string, updates: Partial<GymExerciseSet>, immediate?: boolean) => Promise<void>
  handleDeleteSet: (exerciseId: string, setId: string) => Promise<void>
  handleSaveAdditionalActivities: (activities: AdditionalActivity[]) => Promise<void>
  handleDeleteExercise: (exerciseId: string) => Promise<void>
  handleToggleIncludeInFutureCycles: (exerciseId: string, currentValue: boolean) => Promise<void>
  toggleDayType: (index: number) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GymContext = createContext<GymContextValue | null>(null)

export function useGymContext(): GymContextValue {
  const ctx = useContext(GymContext)
  if (!ctx) throw new Error('useGymContext must be used within GymProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GymProvider({ children }: { children: ReactNode }) {
  const { user } = useAppStore()

  // Core data
  const [periods, setPeriods] = useState<GymPeriod[]>([])
  const [activePeriod, setActivePeriod] = useState<GymPeriod | null>(null)
  const [workouts, setWorkouts] = useState<GymWorkout[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [showPeriodList, setShowPeriodList] = useState(false)

  // Today data
  const [todayData, setTodayData] = useState<TodayData | null>(null)
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
  const [daySchedule, setDaySchedule] = useState<DayScheduleItem[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [wizardExercises, setWizardExercises] = useState<GymContextValue['wizardExercises']>({})
  const [showWizardExercisePicker, setShowWizardExercisePicker] = useState(false)
  const [selectedWorkoutNumForExercise, setSelectedWorkoutNumForExercise] = useState<number | null>(null)

  // Exercise library
  const [showExerciseLibraryDialog, setShowExerciseLibraryDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<GymContextValue['editingTemplate']>(null)
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState<string | null>(null)

  // Parsed day schedule
  const [parsedDaySchedule, setParsedDaySchedule] = useState<DayScheduleItem[]>([])

  // Workout detail
  const [selectedWorkout, setSelectedWorkout] = useState<GymWorkout | null>(null)
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false)

  // Exercise editor
  const [editingExercise, setEditingExercise] = useState<GymExercise | null>(null)
  const [showExerciseEditor, setShowExerciseEditor] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseMuscle, setNewExerciseMuscle] = useState('')

  // Schedule edit
  const [scheduleEdited, setScheduleEdited] = useState(false)

  // Skip / reschedule
  const [showSkipDialog, setShowSkipDialog] = useState(false)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [rescheduleMode, setRescheduleMode] = useState<'single' | 'shift'>('single')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [showReschedule, setShowReschedule] = useState(false)

  // Add workout dialog
  const [showAddWorkoutDialog, setShowAddWorkoutDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newWorkoutName, setNewWorkoutName] = useState('')
  const [newWorkoutMuscles, setNewWorkoutMuscles] = useState<string[]>([])

  // Post-workout dialog
  const [showPostWorkoutDialog, setShowPostWorkoutDialog] = useState(false)
  const [exerciseRatings, setExerciseRatings] = useState<Record<string, 'easy' | 'normal' | 'hard'>>({})
  const [editingActivities, setEditingActivities] = useState<AdditionalActivity[]>([])

  // Exercise card dialog
  const [showExerciseCardDialog, setShowExerciseCardDialog] = useState(false)
  const [selectedExerciseCard, setSelectedExerciseCard] = useState<GymExercise | null>(null)
  const [exerciseHistory, setExerciseHistory] = useState<Array<{ date: string; weight?: number; scheme?: string; completed: boolean }>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Additional activities
  const [newActivityType, setNewActivityType] = useState<AdditionalActivity['type']>('walk')
  const [newActivityValue, setNewActivityValue] = useState('')

  // Saving indicator
  const [savingSets, setSavingSets] = useState<Set<string>>(new Set())

  // Auto-save refs
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pendingUpdates = useRef<Record<string, { setId: string; updates: Record<string, unknown> }>>({})

  // Personal records (templateId → maxWeight)
  const [personalRecords, setPersonalRecords] = useState<Record<string, number>>({})

  // Template select dialog
  const [showTemplateSelectDialog, setShowTemplateSelectDialog] = useState(false)
  const [templates, setTemplates] = useState<GymContextValue['templates']>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Quick complete dialog
  const [showQuickCompleteDialog, setShowQuickCompleteDialog] = useState(false)
  const [quickCompleteNextWeights, setQuickCompleteNextWeights] = useState<Record<string, { weight: number; reps: number; sets: number }>>({})
  const [workoutNote, setWorkoutNote] = useState('')
  const [stretchingDone, setStretchingDone] = useState(false)

  // Completion preview
  const [showCompletionPreview, setShowCompletionPreview] = useState(false)
  const [completionData, setCompletionData] = useState<GymContextValue['completionData']>({ exercises: [] })

  // Schedule drag
  const [scheduleDraggedIdx, setScheduleDraggedIdx] = useState<number | null>(null)
  const [scheduleDragOverIdx, setScheduleDragOverIdx] = useState<number | null>(null)

  // ─── Cleanup debounce timers on unmount ────────────────────────────────────

  useEffect(() => {
    return () => {
      Object.entries(debounceTimers.current).forEach(([key, timer]) => {
        if (timer) clearTimeout(timer)
        const pending = pendingUpdates.current[key]
        if (pending) {
          fetch('/api/gym/exercises/sets', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setId: pending.setId, ...pending.updates }),
          }).catch(console.error)
        }
      })
      debounceTimers.current = {}
      pendingUpdates.current = {}
    }
  }, [])

  // ─── Load periods ──────────────────────────────────────────────────────────

  const loadPeriods = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/gym?userId=${user.id}`)
      const data = await response.json()
      setPeriods(data.periods || [])
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

  // ─── Load today data ───────────────────────────────────────────────────────

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

  // Load personal records (max weight per template)
  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/gym/records?userId=${user.id}`)
      .then(r => r.json())
      .then(data => { if (data.records) setPersonalRecords(data.records) })
      .catch(() => {/* silent */})
  }, [user?.id])

  // ─── Load workouts for active period ──────────────────────────────────────

  useEffect(() => {
    const loadWorkouts = async () => {
      if (!activePeriod?.id) return
      try {
        const response = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
        const data = await response.json()
        const parsedWorkouts = (data.workouts || []).map((w: GymWorkout) => ({
          ...w,
          muscleGroups: (() => {
            if (!w.muscleGroups) return []
            try {
              return typeof w.muscleGroups === 'string'
                ? JSON.parse(w.muscleGroups as unknown as string)
                : w.muscleGroups
            } catch { return [] }
          })(),
        }))
        setWorkouts(parsedWorkouts)
      } catch (error) {
        console.error('Failed to load workouts:', error)
      }
    }
    loadWorkouts()
  }, [activePeriod?.id])

  // ─── Parse day schedule ────────────────────────────────────────────────────

  useEffect(() => {
    if (activePeriod?.daySchedule) {
      try {
        const schedule = typeof activePeriod.daySchedule === 'string'
          ? JSON.parse(activePeriod.daySchedule)
          : activePeriod.daySchedule
        const sortedSchedule = [...schedule].sort((a: DayScheduleItem, b: DayScheduleItem) => a.dayNum - b.dayNum)
        setParsedDaySchedule(sortedSchedule)
      } catch {
        setParsedDaySchedule([])
      }
    } else {
      setParsedDaySchedule([])
    }
    setScheduleEdited(false)
  }, [activePeriod?.daySchedule])

  // ─── Initialize wizard days ────────────────────────────────────────────────

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
    if (wizardStep === 3 && daySchedule.length === 0) {
      const schedule = generateInitialSchedule(wizardConfig.cycleLength, wizardConfig.workoutsPerCycle, workoutDays)
      setDaySchedule(schedule)
    }
  }, [wizardStep, wizardConfig.cycleLength, wizardConfig.workoutsPerCycle, wizardConfig.splitType, workoutDays.length, daySchedule.length, selectedTemplate])

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function generateInitialSchedule(cycleLen: number, workoutsCount: number, days?: WorkoutDayConfig[]): DayScheduleItem[] {
    const schedule: DayScheduleItem[] = []
    const workoutPositions: number[] = []
    for (let i = 0; i < workoutsCount; i++) {
      workoutPositions.push(Math.floor((i * cycleLen) / workoutsCount) + 1)
    }
    for (let dayNum = 1; dayNum <= cycleLen; dayNum++) {
      if (workoutPositions.includes(dayNum)) {
        const workoutNum = workoutPositions.indexOf(dayNum) + 1
        const dayConfig = days?.find(d => d.dayNum === workoutNum)
        schedule.push({ type: 'workout', dayNum, workoutNum, name: dayConfig?.name || `Тренировка ${workoutNum}`, muscleGroups: dayConfig?.muscles || [] })
      } else {
        schedule.push({ type: 'rest', dayNum })
      }
    }
    return schedule
  }

  // ─── Computed values ───────────────────────────────────────────────────────

  const getCalendarDays = useCallback((): (null | { date: Date; workout: GymWorkout | undefined; dayNum: number })[] => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = (firstDay.getDay() + 6) % 7
    const days: (null | { date: Date; workout: GymWorkout | undefined; dayNum: number })[] = []
    for (let i = 0; i < startPadding; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const workout = workouts.find(w => w.date.split('T')[0] === dateStr)
      days.push({ date, workout, dayNum: d })
    }
    return days
  }, [currentMonth, workouts])

  const getPeriodProgress = useCallback(() => {
    if (!activePeriod) return 0
    const completedCount = workouts.filter(w => w.completed).length
    const total = activePeriod.totalCycles * activePeriod.workoutsPerCycle
    return Math.min(100, (completedCount / total) * 100)
  }, [activePeriod, workouts])

  const getNextWorkout = useCallback((): GymWorkout | null => {
    if (!activePeriod) return null
    const today = new Date().toISOString().split('T')[0]
    return workouts
      .filter(w => !w.completed && w.date.split('T')[0] >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null
  }, [activePeriod, workouts])

  const generateCalendarPreview = useCallback(() => {
    if (daySchedule.length === 0) return []
    const today = new Date()
    const days: { date: Date; item: DayScheduleItem; isToday: boolean }[] = []
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const scheduleIdx = i % daySchedule.length
      days.push({ date, item: daySchedule[scheduleIdx], isToday: i === 0 })
    }
    return days
  }, [daySchedule])

  const calendarDays = getCalendarDays()
  const periodProgress = getPeriodProgress()
  const nextWorkout = getNextWorkout()
  const completedWorkouts = workouts.filter(w => w.completed).length
  const calendarPreview = generateCalendarPreview()

  // ─── Handlers: wizard ─────────────────────────────────────────────────────

  const applyTemplate = (templateId: string) => {
    const template = WORKOUT_TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    setSelectedTemplate(templateId)
    setWizardConfig(prev => ({ ...prev, cycleLength: template.cycleLength, workoutsPerCycle: template.workoutsPerCycle, splitType: template.splitType }))
    const days: WorkoutDayConfig[] = template.daySchedule
      .filter(d => d.type === 'workout')
      .map((d, idx) => ({ dayNum: idx + 1, muscles: d.muscleGroups || [], name: d.name || `Тренировка ${idx + 1}` }))
    setWorkoutDays(days)
    const schedule: DayScheduleItem[] = template.daySchedule.map((item, idx) => ({ ...item, dayNum: idx + 1 }))
    setDaySchedule(schedule)
  }

  const handleDragStart = (index: number) => setDraggedIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newSchedule = [...daySchedule]
      const [item] = newSchedule.splice(draggedIndex, 1)
      newSchedule.splice(dragOverIndex, 0, item)
      newSchedule.forEach((s, idx) => { s.dayNum = idx + 1 })
      setDaySchedule(newSchedule)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleScheduleDragStart = (index: number) => setScheduleDraggedIdx(index)
  const handleScheduleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setScheduleDragOverIdx(index) }
  const handleScheduleDragEnd = () => {
    if (scheduleDraggedIdx !== null && scheduleDragOverIdx !== null && scheduleDraggedIdx !== scheduleDragOverIdx) {
      const newSchedule = [...parsedDaySchedule]
      const [item] = newSchedule.splice(scheduleDraggedIdx, 1)
      newSchedule.splice(scheduleDragOverIdx, 0, item)
      newSchedule.forEach((s, idx) => { s.dayNum = idx + 1 })
      setParsedDaySchedule(newSchedule)
      setScheduleEdited(true)
    }
    setScheduleDraggedIdx(null)
    setScheduleDragOverIdx(null)
  }

  const handleSaveSchedule = async () => {
    if (!activePeriod || parsedDaySchedule.length === 0) return
    if (!isOnline()) { showErrorToast(new Error('Нет подключения к интернету'), 'сохранение расписания'); return }
    try {
      await fetch('/api/gym', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: activePeriod.id, daySchedule: parsedDaySchedule }),
      })
      setScheduleEdited(false)
      showSuccessToast('Расписание сохранено')
      loadPeriods()
    } catch (error) {
      showErrorToast(error, 'сохранение расписания')
    }
  }

  const toggleDayType = (index: number) => {
    const newSchedule = [...daySchedule]
    const item = newSchedule[index]
    if (item.type === 'rest') {
      const maxWorkoutNum = Math.max(...newSchedule.filter(d => d.type === 'workout').map(d => d.workoutNum || 0), 0)
      newSchedule[index] = { type: 'workout', dayNum: item.dayNum, workoutNum: maxWorkoutNum + 1, name: `Тренировка ${maxWorkoutNum + 1}`, muscleGroups: [] }
    } else {
      newSchedule[index] = { type: 'rest', dayNum: item.dayNum }
      let workoutCount = 0
      newSchedule.forEach(d => { if (d.type === 'workout') { workoutCount++; d.workoutNum = workoutCount } })
    }
    setDaySchedule(newSchedule)
  }

  const resetWizard = () => {
    setWizardStep(1)
    setWizardConfig({ type: 'strength', customName: '', cycleLength: 7, workoutsPerCycle: 3, totalCycles: 8, splitType: 'split' })
    setWorkoutDays([])
    setDaySchedule([])
    setSelectedTemplate(null)
    setWizardExercises({})
  }

  const handleCreatePeriod = async () => {
    if (!user?.id) return
    const name = wizardConfig.type === 'custom' ? wizardConfig.customName :
      TRAINING_TYPES.find(t => t.value === wizardConfig.type)?.label || 'Период'
    const finalSchedule = daySchedule.map((item, idx) => {
      if (item.type === 'workout' && item.workoutNum) {
        const dayConfig = workoutDays.find(d => d.dayNum === item.workoutNum)
        return { ...item, dayNum: idx + 1, name: dayConfig?.name || item.name || `Тренировка ${item.workoutNum}`, muscleGroups: dayConfig?.muscles || item.muscleGroups || [] }
      }
      return { ...item, dayNum: idx + 1 }
    })
    try {
      const response = await fetch('/api/gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, name, type: wizardConfig.splitType,
          cycleLength: wizardConfig.cycleLength, workoutsPerCycle: wizardConfig.workoutsPerCycle,
          totalCycles: wizardConfig.totalCycles,
          workoutDays: workoutDays.map(d => ({ workoutNum: d.dayNum, name: d.name, muscleGroups: d.muscles })),
          daySchedule: finalSchedule, workoutExercises: wizardExercises,
        }),
      })
      const data = await response.json()
      if (data.period) {
        setPeriods(prev => [...prev, data.period])
        setActivePeriod(data.period)
        setShowWizard(false)
        resetWizard()
        showSuccessToast('Период тренировок создан')
      }
    } catch (error) {
      showErrorToast(error, 'создание периода')
    }
  }

  // ─── Handlers: skip/reschedule ─────────────────────────────────────────────

  const handleSkipWorkout = async (shiftSchedule: boolean) => {
    if (!selectedWorkout || !activePeriod) return
    try {
      const response = await fetch('/api/gym/workouts/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: selectedWorkout.id, periodId: activePeriod.id, shiftSchedule }),
      })
      const data = await response.json()
      if (data.success) {
        setShowSkipDialog(false)
        setShowWorkoutDetail(false)
        const res = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
        const wData = await res.json()
        setWorkouts((wData.workouts || []).map((w: GymWorkout) => ({
          ...w,
          muscleGroups: (() => { try { return typeof w.muscleGroups === 'string' ? JSON.parse(w.muscleGroups as unknown as string) : (w.muscleGroups || []) } catch { return [] } })()
        })))
      }
    } catch (error) {
      console.error('Failed to skip workout:', error)
    }
  }

  const handleRescheduleWorkout = async (mode: 'single' | 'shift') => {
    if (!selectedWorkout || !activePeriod || !rescheduleDate) return
    try {
      await fetch('/api/gym/workouts/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: selectedWorkout.id, periodId: activePeriod.id, newDate: rescheduleDate, ...(mode === 'shift' ? { shiftCycle: true } : {}) }),
      })
      setShowRescheduleDialog(false)
      setShowWorkoutDetail(false)
      setRescheduleDate('')
      const res = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
      const wData = await res.json()
      setWorkouts((wData.workouts || []).map((w: GymWorkout) => ({
        ...w,
        muscleGroups: (() => { try { return typeof w.muscleGroups === 'string' ? JSON.parse(w.muscleGroups as unknown as string) : (w.muscleGroups || []) } catch { return [] } })()
      })))
    } catch (error) {
      console.error('Failed to reschedule workout:', error)
    }
  }

  // ─── Handlers: add workout to calendar ────────────────────────────────────

  const handleAddWorkoutToDate = async () => {
    if (!selectedDate || !activePeriod || !user?.id) return
    const name = newWorkoutName || `Тренировка ${workouts.length + 1}`
    try {
      const response = await fetch('/api/gym/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: activePeriod.id, date: selectedDate.toISOString(), name, muscleGroups: newWorkoutMuscles, workoutNum: workouts.filter(w => !w.completed).length + 1, isManual: true }),
      })
      const data = await response.json()
      if (data.workout) {
        setShowAddWorkoutDialog(false)
        setSelectedDate(null)
        setNewWorkoutName('')
        setNewWorkoutMuscles([])
        const res = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`)
        const wData = await res.json()
        setWorkouts((wData.workouts || []).map((w: GymWorkout) => ({
          ...w,
          muscleGroups: (() => { try { return typeof w.muscleGroups === 'string' ? JSON.parse(w.muscleGroups as unknown as string) : (w.muscleGroups || []) } catch { return [] } })()
        })))
      }
    } catch (error) {
      console.error('Failed to add workout:', error)
    }
  }

  // ─── Handlers: complete workout ────────────────────────────────────────────

  const handleCompleteWorkout = async (workoutId: string) => {
    if (!selectedWorkout) return
    if (selectedWorkout.exercises && selectedWorkout.exercises.length > 0) {
      const initialRatings: Record<string, 'easy' | 'normal' | 'hard'> = {}
      selectedWorkout.exercises.forEach(ex => { initialRatings[ex.id] = 'normal' })
      setExerciseRatings(initialRatings)
      setEditingActivities(selectedWorkout.additionalActivities || [])
      setShowPostWorkoutDialog(true)
    } else {
      await finalizeWorkout(workoutId, {}, [])
    }
  }

  const openQuickCompleteDialog = () => {
    if (!selectedWorkout) return
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
    setWorkoutNote('')
    setShowQuickCompleteDialog(true)
  }

  const getUnfilledSetsInfo = () => {
    if (!selectedWorkout?.exercises) return []
    const unfilled: Array<{ exerciseName: string; exerciseId: string; setNum: number; setId: string }> = []
    selectedWorkout.exercises.forEach(ex => {
      ex.sets?.forEach((set, idx) => {
        if (!set.isWarmup && (!set.weight || !set.reps)) {
          unfilled.push({ exerciseName: ex.name, exerciseId: ex.id, setNum: idx + 1, setId: (set as GymExerciseSet).id })
        }
      })
    })
    return unfilled
  }

  const handleAutoFillSets = () => {
    if (!selectedWorkout?.exercises) return
    selectedWorkout.exercises.forEach(ex => {
      const workingSets = ex.sets?.filter(s => !s.isWarmup) || []
      const lastFilled = workingSets.filter(s => s.weight && s.reps).pop()
      if (lastFilled) {
        workingSets.forEach(set => {
          if (!set.weight || !set.reps) {
            handleUpdateSet(ex.id, (set as GymExerciseSet).id, { weight: lastFilled.weight, reps: lastFilled.reps }, true)
          }
        })
      }
    })
  }

  const handleConfirmQuickComplete = async () => {
    if (!selectedWorkout) return
    try {
      const exercisesData = selectedWorkout.exercises?.map(ex => {
        const nextWeightConfig = quickCompleteNextWeights[ex.id]
        return {
          id: ex.id, templateId: ex.templateId,
          weight: ex.sets?.[0]?.weight || ex.template?.currentWeight,
          nextWeight: nextWeightConfig?.weight || ex.template?.currentWeight,
          nextTargetReps: nextWeightConfig?.reps || ex.targetReps,
          nextTargetSets: nextWeightConfig?.sets || ex.targetSets,
          sets: ex.sets?.map(s => ({ id: (s as GymExerciseSet).id, weight: s.weight, reps: s.reps, completed: s.completed }))
        }
      })
      const response = await fetch('/api/gym/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: selectedWorkout.id, completed: true, exercises: exercisesData, cycleNote: workoutNote }),
      })
      if (response.ok) {
        const previewExercises = selectedWorkout.exercises?.map(ex => {
          const nextConfig = quickCompleteNextWeights[ex.id]
          const workingSets = ex.sets?.filter(s => !s.isWarmup) || []
          const firstWorkingSet = workingSets[0]
          return {
            name: ex.name,
            weight: firstWorkingSet?.weight || ex.weight || ex.template?.currentWeight,
            reps: firstWorkingSet?.reps || ex.targetReps || ex.template?.defaultReps,
            sets: workingSets.length || ex.targetSets || ex.template?.defaultSets || 4,
            nextWeight: nextConfig?.weight || firstWorkingSet?.weight || ex.template?.currentWeight
          }
        }) || []
        setCompletionData({ exercises: previewExercises, note: workoutNote || undefined })
        setWorkouts(prev => prev.map(w => w.id === selectedWorkout.id ? { ...w, completed: true, status: 'completed' } : w))
        setShowQuickCompleteDialog(false)
        setShowWorkoutDetail(false)
        setShowCompletionPreview(true)
        showSuccessToast('Тренировка завершена! 💪')
        loadTodayData()
      }
    } catch (error) {
      showErrorToast(error, 'завершение тренировки')
    }
  }

  const handleUndoComplete = async () => {
    if (!selectedWorkout) return
    try {
      const response = await fetch('/api/gym/workouts/undo-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: selectedWorkout.id }),
      })
      if (response.ok) {
        setWorkouts(prev => prev.map(w => w.id === selectedWorkout.id ? { ...w, completed: false, status: 'in_progress' } : w))
        setSelectedWorkout(prev => prev ? { ...prev, completed: false, status: 'in_progress' } : null)
        loadTodayData()
      }
    } catch (error) {
      console.error('Failed to undo completion:', error)
    }
  }

  const finalizeWorkout = async (
    workoutId: string,
    ratings: Record<string, 'easy' | 'normal' | 'hard'>,
    activities: AdditionalActivity[],
    note?: string,
    stretching?: boolean
  ) => {
    if (!selectedWorkout) return
    try {
      const exercisesData = selectedWorkout.exercises?.map(ex => {
        const rating = ratings[ex.id] || 'normal'
        const currentWeight = ex.sets?.[0]?.weight || ex.template?.currentWeight
        const step = (ex.template as (GymContextValue['templates'][0] & { progressionStep?: number }) | undefined)?.progressionStep || 2.5
        let newNextWeight = ex.nextWeight || ex.template?.nextWeight || currentWeight
        if (currentWeight) {
          if (rating === 'easy') newNextWeight = currentWeight + step
          else if (rating === 'hard') newNextWeight = Math.max(0, currentWeight - step)
          else newNextWeight = currentWeight
        }
        return {
          id: ex.id, templateId: ex.templateId, weight: currentWeight, nextWeight: newNextWeight, repsScheme: ex.repsScheme,
          sets: ex.sets?.map(s => ({ id: (s as GymExerciseSet).id, weight: s.weight, reps: s.reps, completed: s.completed }))
        }
      })
      await fetch('/api/gym/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, completed: true, additionalActivities: activities, exercises: exercisesData, cycleNote: note, stretchingDone: stretching ?? false }),
      })
      setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, completed: true } : w))
      setShowPostWorkoutDialog(false)
      setShowWorkoutDetail(false)
      setWorkoutNote('')
      setStretchingDone(false)
      loadTodayData()
    } catch (error) {
      console.error('Failed to finalize workout:', error)
    }
  }

  // ─── Handlers: workout detail ─────────────────────────────────────────────

  const loadWorkoutDetails = async (workout: GymWorkout) => {
    try {
      const response = await fetch(`/api/gym/workouts/${workout.id}`)
      const data = await response.json()
      let muscleGroups: string[] = []
      if (data.workout?.muscleGroups) {
        try { muscleGroups = typeof data.workout.muscleGroups === 'string' ? JSON.parse(data.workout.muscleGroups) : data.workout.muscleGroups } catch { muscleGroups = [] }
      }
      setSelectedWorkout({ ...workout, muscleGroups, exercises: data.workout?.exercises || [] })
      setShowWorkoutDetail(true)
    } catch (error) {
      console.error('Failed to load workout details:', error)
      let muscleGroups: string[] = []
      if (workout.muscleGroups) { try { muscleGroups = typeof workout.muscleGroups === 'string' ? JSON.parse(workout.muscleGroups as unknown as string) : workout.muscleGroups } catch { muscleGroups = [] } }
      setSelectedWorkout({ ...workout, muscleGroups })
      setShowWorkoutDetail(true)
    }
  }

  const loadExerciseHistory = async (exercise: GymExercise) => {
    if (!exercise.templateId) { setExerciseHistory([]); return }
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/gym/templates/${exercise.templateId}/history`)
      const data = await response.json()
      setExerciseHistory(data.history || [])
    } catch { setExerciseHistory([]) } finally { setIsLoadingHistory(false) }
  }

  const loadTemplates = async () => {
    if (!user?.id) return
    setIsLoadingTemplates(true)
    try {
      const response = await fetch(`/api/gym/templates?userId=${user.id}`)
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch { setTemplates([]) } finally { setIsLoadingTemplates(false) }
  }

  const openExerciseCard = async (exercise: GymExercise) => {
    setSelectedExerciseCard(exercise)
    setShowExerciseCardDialog(true)
    await loadExerciseHistory(exercise)
  }

  const handleAddFromTemplate = async (template: { id: string; name: string; currentWeight?: number; nextWeight?: number; defaultReps?: number; defaultSets?: number; defaultScheme?: string }) => {
    if (!selectedWorkout) return
    try {
      const response = await fetch('/api/gym/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: selectedWorkout.id, name: template.name, templateId: template.id, order: (selectedWorkout.exercises?.length || 0) + 1, targetReps: template.defaultReps, targetSets: template.defaultSets || 4, weight: template.currentWeight || template.nextWeight, createSets: true }),
      })
      const data = await response.json()
      if (data.exercise) {
        setSelectedWorkout(prev => prev ? { ...prev, exercises: [...(prev.exercises || []), data.exercise] } : null)
        setShowTemplateSelectDialog(false)
      }
    } catch (error) { console.error('Failed to add exercise from template:', error) }
  }

  const handleAddExercise = async () => {
    if (!selectedWorkout || !newExerciseName) return
    try {
      const response = await fetch('/api/gym/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: selectedWorkout.id, name: newExerciseName, muscleGroup: newExerciseMuscle, order: (selectedWorkout.exercises?.length || 0) + 1 }),
      })
      const data = await response.json()
      if (data.exercise) {
        setSelectedWorkout(prev => prev ? { ...prev, exercises: [...(prev.exercises || []), data.exercise] } : null)
        setNewExerciseName('')
        setNewExerciseMuscle('')
        setShowExerciseEditor(false)
      }
    } catch (error) { console.error('Failed to add exercise:', error) }
  }

  const handleAddSet = async (exercise: GymExercise, isWarmup: boolean = false) => {
    try {
      const response = await fetch('/api/gym/exercises/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: exercise.id, isWarmup, weight: isWarmup ? undefined : exercise.weight, reps: isWarmup ? undefined : exercise.targetReps }),
      })
      const data = await response.json()
      if (data.set) {
        setSelectedWorkout(prev => prev ? {
          ...prev,
          exercises: prev.exercises?.map(e => e.id === exercise.id ? { ...e, sets: [...(e.sets || []), data.set].sort((a: GymExerciseSet, b: GymExerciseSet) => a.setNum - b.setNum) } : e),
        } : null)
      }
    } catch (error) { console.error('Failed to add set:', error) }
  }

  const handleUpdateSet = useCallback(async (exerciseId: string, setId: string, updates: Partial<GymExerciseSet>, immediate: boolean = false) => {
    setSelectedWorkout(prev => prev ? {
      ...prev,
      exercises: prev.exercises?.map(e => e.id === exerciseId ? { ...e, sets: e.sets?.map(s => (s as GymExerciseSet).id === setId ? { ...s, ...updates } : s) } : e),
    } : null)

    if (immediate || updates.completed !== undefined) {
      setSavingSets(prev => new Set(prev).add(setId))
      try {
        const response = await fetch('/api/gym/exercises/sets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setId, ...updates }),
        })
        const data = await response.json()
        if (data.workoutStatusChanged) loadTodayData()
      } catch (error) { console.error('Failed to update set:', error) } finally {
        setTimeout(() => setSavingSets(prev => { const next = new Set(prev); next.delete(setId); return next }), 500)
      }
      return
    }

    const timerKey = setId
    if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey])
    pendingUpdates.current[timerKey] = { setId, updates }
    debounceTimers.current[timerKey] = setTimeout(async () => {
      setSavingSets(prev => new Set(prev).add(setId))
      delete pendingUpdates.current[timerKey]
      try {
        await fetch('/api/gym/exercises/sets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setId, ...updates }) })
      } catch (error) { console.error('Failed to update set:', error) } finally {
        setTimeout(() => setSavingSets(prev => { const next = new Set(prev); next.delete(setId); return next }), 500)
      }
    }, 300)
  }, [loadTodayData])

  const handleDeleteSet = async (exerciseId: string, setId: string) => {
    if (!confirm('Удалить этот подход?')) return
    try {
      await fetch(`/api/gym/exercises/sets?setId=${setId}`, { method: 'DELETE' })
      setSelectedWorkout(prev => prev ? {
        ...prev,
        exercises: prev.exercises?.map(e => e.id === exerciseId ? { ...e, sets: e.sets?.filter(s => (s as GymExerciseSet).id !== setId) } : e),
      } : null)
    } catch (error) { console.error('Failed to delete set:', error) }
  }

  const handleSaveAdditionalActivities = useCallback(async (activities: AdditionalActivity[]) => {
    if (!selectedWorkout) return
    try {
      await fetch('/api/gym/workouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: selectedWorkout.id, additionalActivities: activities }),
      })
    } catch (error) { console.error('Failed to save additional activities:', error) }
  }, [selectedWorkout])

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Удалить упражнение из этой тренировки?')) return
    try {
      await fetch(`/api/gym/exercises?exerciseId=${exerciseId}`, { method: 'DELETE' })
      setSelectedWorkout(prev => prev ? { ...prev, exercises: prev.exercises?.filter(e => e.id !== exerciseId) } : null)
    } catch (error) { console.error('Failed to delete exercise:', error) }
  }

  const handleToggleIncludeInFutureCycles = async (exerciseId: string, currentValue: boolean) => {
    const newValue = !currentValue
    setSelectedWorkout(prev => prev ? { ...prev, exercises: prev.exercises?.map(e => e.id === exerciseId ? { ...e, includeInFutureCycles: newValue } : e) } : null)
    try {
      await fetch('/api/gym/exercises', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId, includeInFutureCycles: newValue }),
      })
    } catch (error) {
      console.error('Failed to toggle includeInFutureCycles:', error)
      setSelectedWorkout(prev => prev ? { ...prev, exercises: prev.exercises?.map(e => e.id === exerciseId ? { ...e, includeInFutureCycles: currentValue } : e) } : null)
    }
  }

  // ─── Context value ─────────────────────────────────────────────────────────

  const value: GymContextValue = {
    user,
    periods, setPeriods, activePeriod, setActivePeriod, workouts, setWorkouts,
    currentMonth, setCurrentMonth, isLoading, showPeriodList, setShowPeriodList,
    todayData, isLoadingToday,
    showWizard, setShowWizard, wizardStep, setWizardStep, wizardConfig, setWizardConfig,
    workoutDays, setWorkoutDays, daySchedule, setDaySchedule, selectedTemplate, setSelectedTemplate,
    draggedIndex, dragOverIndex,
    wizardExercises, setWizardExercises, showWizardExercisePicker, setShowWizardExercisePicker,
    selectedWorkoutNumForExercise, setSelectedWorkoutNumForExercise,
    showExerciseLibraryDialog, setShowExerciseLibraryDialog, editingTemplate, setEditingTemplate,
    libraryMuscleFilter, setLibraryMuscleFilter,
    parsedDaySchedule, setParsedDaySchedule,
    selectedWorkout, setSelectedWorkout, showWorkoutDetail, setShowWorkoutDetail,
    editingExercise, setEditingExercise, showExerciseEditor, setShowExerciseEditor,
    newExerciseName, setNewExerciseName, newExerciseMuscle, setNewExerciseMuscle,
    scheduleEdited,
    showSkipDialog, setShowSkipDialog, showRescheduleDialog, setShowRescheduleDialog,
    rescheduleMode, setRescheduleMode, rescheduleDate, setRescheduleDate,
    showReschedule, setShowReschedule,
    showAddWorkoutDialog, setShowAddWorkoutDialog, selectedDate, setSelectedDate,
    newWorkoutName, setNewWorkoutName, newWorkoutMuscles, setNewWorkoutMuscles,
    showPostWorkoutDialog, setShowPostWorkoutDialog, exerciseRatings, setExerciseRatings,
    editingActivities, setEditingActivities,
    showExerciseCardDialog, setShowExerciseCardDialog, selectedExerciseCard,
    exerciseHistory, isLoadingHistory,
    newActivityType, setNewActivityType, newActivityValue, setNewActivityValue,
    savingSets,
    showTemplateSelectDialog, setShowTemplateSelectDialog, templates, isLoadingTemplates, personalRecords,
    showQuickCompleteDialog, setShowQuickCompleteDialog,
    quickCompleteNextWeights, setQuickCompleteNextWeights, workoutNote, setWorkoutNote, stretchingDone, setStretchingDone,
    showCompletionPreview, setShowCompletionPreview, completionData,
    scheduleDraggedIdx, scheduleDragOverIdx,
    calendarDays, periodProgress, nextWorkout, completedWorkouts, calendarPreview,
    loadPeriods, loadTodayData, applyTemplate,
    handleDragStart, handleDragOver, handleDragEnd,
    handleScheduleDragStart, handleScheduleDragOver, handleScheduleDragEnd,
    handleSaveSchedule, handleSkipWorkout, handleRescheduleWorkout,
    handleAddWorkoutToDate, handleCreatePeriod, resetWizard,
    handleCompleteWorkout, openQuickCompleteDialog, getUnfilledSetsInfo,
    handleAutoFillSets, handleConfirmQuickComplete, handleUndoComplete,
    finalizeWorkout, loadWorkoutDetails, loadExerciseHistory, loadTemplates,
    openExerciseCard, handleAddFromTemplate, handleAddExercise, handleAddSet,
    handleUpdateSet, handleDeleteSet, handleSaveAdditionalActivities,
    handleDeleteExercise, handleToggleIncludeInFutureCycles, toggleDayType,
  }

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>
}
