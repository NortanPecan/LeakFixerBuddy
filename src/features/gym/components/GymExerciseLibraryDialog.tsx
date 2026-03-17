'use client'

import { useGymContext } from '@/features/gym/GymContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Dumbbell, Plus, Edit3, Trash2, X, Save } from 'lucide-react'
import { MUSCLE_GROUPS } from '@/features/gym'

export function GymExerciseLibraryDialog() {
  const {
    user,
    showExerciseLibraryDialog, setShowExerciseLibraryDialog,
    editingTemplate, setEditingTemplate,
    libraryMuscleFilter, setLibraryMuscleFilter,
    templates, isLoadingTemplates,
    selectedWorkout,
    loadTemplates,
    handleAddFromTemplate,
  } = useGymContext()

  return (
    <Dialog open={showExerciseLibraryDialog} onOpenChange={(open) => {
      setShowExerciseLibraryDialog(open)
      if (!open) {
        setEditingTemplate(null)
        loadTemplates()
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
              {/* Muscle group filter */}
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
                    techniqueNotes: undefined,
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
                                techniqueNotes: template.techniqueNotes,
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
                                  method: 'DELETE',
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
                              techniqueNotes: editingTemplate.techniqueNotes,
                            }),
                          })
                        } else {
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
                              techniqueNotes: editingTemplate.techniqueNotes,
                            }),
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
  )
}
