'use client'

import { useGymContext } from '@/features/gym/GymContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
  Dumbbell,
  Calendar,
  ChevronLeft,
  Plus,
  X,
  ArrowRight,
  GripVertical,
  Coffee,
  Zap,
} from 'lucide-react'
import {
  TRAINING_TYPES,
  SPLIT_TYPES,
  MUSCLE_GROUPS,
  WEEKDAYS,
  WORKOUT_TEMPLATES,
} from '@/features/gym'

export function GymWizardDialogs() {
  const {
    showWizard, setShowWizard,
    wizardStep, setWizardStep,
    wizardConfig, setWizardConfig,
    workoutDays, setWorkoutDays,
    daySchedule,
    selectedTemplate, setSelectedTemplate,
    draggedIndex, dragOverIndex,
    wizardExercises, setWizardExercises,
    showWizardExercisePicker, setShowWizardExercisePicker,
    selectedWorkoutNumForExercise, setSelectedWorkoutNumForExercise,
    calendarPreview,
    templates, isLoadingTemplates,
    handleDragStart, handleDragOver, handleDragEnd,
    handleCreatePeriod, resetWizard, applyTemplate,
    loadTemplates,
    setShowExerciseLibraryDialog,
    toggleDayType,
  } = useGymContext()

  return (
    <>
      {/* Wizard Dialog */}
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

              {wizardConfig.type === 'custom' && !selectedTemplate && (
                <Input
                  placeholder="Название периода"
                  value={wizardConfig.customName}
                  onChange={e => setWizardConfig(prev => ({ ...prev, customName: e.target.value }))}
                />
              )}

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
                <Button className="flex-1 bg-primary" onClick={() => setWizardStep(3)}>
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
                        isWorkout ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
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
                <Button className="flex-1 bg-primary" onClick={() => setWizardStep(4)}>
                  Далее
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : wizardStep === 4 ? (
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
                <Button className="flex-1 bg-primary" onClick={handleCreatePeriod}>
                  Создать период
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Wizard Exercise Picker Dialog */}
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
                        setWizardExercises({
                          ...wizardExercises,
                          [day.dayNum]: [
                            ...currentExercises,
                            {
                              templateId: template.id,
                              name: template.name,
                              muscleGroup: template.muscleGroup,
                              order: currentExercises.length + 1,
                            },
                          ],
                        })
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
    </>
  )
}
