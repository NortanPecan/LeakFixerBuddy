'use client'

import { GymProvider, useGymContext } from '@/features/gym/GymContext'
import { GymWizardDialogs } from '@/features/gym/components/GymWizardDialogs'
import { GymExerciseLibraryDialog } from '@/features/gym/components/GymExerciseLibraryDialog'
import { GymWorkoutDetailDialog } from '@/features/gym/components/GymWorkoutDetailDialog'
import { GymPostWorkoutDialog } from '@/features/gym/components/GymPostWorkoutDialog'
import { GymQuickCompleteDialog } from '@/features/gym/components/GymQuickCompleteDialog'
import { AddWorkoutDialog } from '@/features/gym/components/AddWorkoutDialog'
import { CompletionPreviewDialog } from '@/features/gym/components/CompletionPreviewDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Trash2,
  Edit3,
  GripVertical,
  Coffee,
  CalendarDays,
  Save,
  Repeat,
  Shuffle,
} from 'lucide-react'
import {
  MUSCLE_GROUPS,
  WEEKDAYS,
  type DayScheduleItem,
  type GymWorkout,
  type GymPeriod,
} from '@/features/gym'

function GymScreenContent() {
  const {
    user,
    periods, setPeriods, activePeriod, setActivePeriod,
    workouts, setWorkouts, currentMonth, setCurrentMonth, isLoading,
    showPeriodList, setShowPeriodList,
    todayData, isLoadingToday,
    showWizard, setShowWizard, wizardStep, setWizardStep, wizardConfig, setWizardConfig,
    workoutDays, setWorkoutDays, daySchedule, setDaySchedule, selectedTemplate,
    draggedIndex, dragOverIndex,
    wizardExercises, setWizardExercises,
    showWizardExercisePicker, setShowWizardExercisePicker,
    selectedWorkoutNumForExercise, setSelectedWorkoutNumForExercise,
    showExerciseLibraryDialog, setShowExerciseLibraryDialog,
    editingTemplate, setEditingTemplate,
    libraryMuscleFilter, setLibraryMuscleFilter,
    parsedDaySchedule, setParsedDaySchedule,
    selectedWorkout, setSelectedWorkout, showWorkoutDetail, setShowWorkoutDetail,
    editingExercise, setEditingExercise, showExerciseEditor, setShowExerciseEditor,
    newExerciseName, setNewExerciseName, newExerciseMuscle, setNewExerciseMuscle,
    scheduleEdited,
    showSkipDialog, setShowSkipDialog, showRescheduleDialog, setShowRescheduleDialog,
    rescheduleMode, setRescheduleMode, rescheduleDate, setRescheduleDate,
    showReschedule, setShowReschedule,
    showAddWorkoutDialog, setShowAddWorkoutDialog,
    selectedDate, setSelectedDate, newWorkoutName, setNewWorkoutName, newWorkoutMuscles, setNewWorkoutMuscles,
    showPostWorkoutDialog, setShowPostWorkoutDialog,
    exerciseRatings, setExerciseRatings, editingActivities, setEditingActivities,
    showExerciseCardDialog, setShowExerciseCardDialog, selectedExerciseCard,
    exerciseHistory, isLoadingHistory,
    newActivityType, setNewActivityType, newActivityValue, setNewActivityValue,
    savingSets,
    showTemplateSelectDialog, setShowTemplateSelectDialog, templates, isLoadingTemplates,
    showQuickCompleteDialog, setShowQuickCompleteDialog,
    quickCompleteNextWeights, setQuickCompleteNextWeights,
    workoutNote, setWorkoutNote,
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
  } = useGymContext()
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

      {/* Wizard + Exercise Picker Dialogs */}
      <GymWizardDialogs />

      {/* Exercise Library Dialog */}
      <GymExerciseLibraryDialog />

      {/* Workout Detail Dialog */}
      <GymWorkoutDetailDialog />

      {/* Post-Workout Dialog */}
      <GymPostWorkoutDialog />

      {/* Quick Complete Dialog */}
      <GymQuickCompleteDialog />

      {/* Add Workout Dialog */}
      <AddWorkoutDialog />

      {/* Completion Preview Dialog */}
      <CompletionPreviewDialog />
    </div>
  )
}


export function GymScreen() {
  return (
    <GymProvider>
      <GymScreenContent />
    </GymProvider>
  )
}
