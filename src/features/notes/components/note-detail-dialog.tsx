"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit3, ListTodo, Target, Sparkles, Link2, Trash2, CheckCircle2 } from "lucide-react";
import { NOTE_TYPES, NOTE_ZONES, getNoteTypeInfo, getNoteZoneInfo } from "@/lib/notes-config";
import type { ReframeData } from "@/lib/notes-config";
import { formatDate } from "@/features/notes/lib/note-formatters";
import type { Note } from "@/features/notes/types";

interface NoteDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNote: Note | null;
  reframeDetailData: ReframeData | null;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  editText: string;
  setEditText: React.Dispatch<React.SetStateAction<string>>;
  editType: string;
  setEditType: React.Dispatch<React.SetStateAction<string>>;
  editZone: string;
  setEditZone: React.Dispatch<React.SetStateAction<string>>;
  isCreatingRitual: boolean;
  handleUpdate: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleCreateTask: () => Promise<void>;
  handleCreateRitual: () => Promise<void>;
  handleRemoveLink: (linkId: string) => Promise<void>;
  openChainModal: () => void;
  handleCreateTaskFromAction: (index: number) => Promise<void>;
  openChainModalForAction: (index: number) => void;
  handleCreateRitualFromAction: (index: number) => Promise<void>;
}

export function NoteDetailDialog({
  open,
  onOpenChange,
  selectedNote,
  reframeDetailData,
  isEditing,
  setIsEditing,
  editText,
  setEditText,
  editType,
  setEditType,
  editZone,
  setEditZone,
  isCreatingRitual,
  handleUpdate,
  handleDelete,
  handleCreateTask,
  handleCreateRitual,
  handleRemoveLink,
  openChainModal,
  handleCreateTaskFromAction,
  openChainModalForAction,
  handleCreateRitualFromAction,
}: NoteDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Редактирование" : "Заметка"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto">
          {isEditing ? (
            <>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[150px]"
              />
              <div className="space-y-2">
                <label className="text-muted-foreground text-sm">Тип</label>
                <div className="flex flex-wrap gap-2">
                  {NOTE_TYPES.map((type) => (
                    <Button
                      key={type.id}
                      size="sm"
                      variant={editType === type.id ? "default" : "outline"}
                      onClick={() => setEditType(type.id)}
                      className="gap-1"
                    >
                      {type.icon} {type.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-muted-foreground text-sm">Зона</label>
                <div className="flex flex-wrap gap-2">
                  {NOTE_ZONES.map((zone) => (
                    <Button
                      key={zone.id}
                      size="sm"
                      variant={editZone === zone.id ? "secondary" : "outline"}
                      onClick={() => setEditZone(zone.id)}
                      className="gap-1"
                    >
                      {zone.icon} {zone.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {selectedNote?.type === "reframe" && reframeDetailData ? (
                <>
                  {reframeDetailData.situation && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Ситуация</p>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        {reframeDetailData.situation}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-destructive text-xs">Старая мысль</p>
                    <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3 text-sm">
                      {reframeDetailData.oldThought}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-emerald-600">Новый взгляд</p>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm">
                      {reframeDetailData.newView}
                    </div>
                  </div>
                  {reframeDetailData.actions.filter((a) => a.text.trim()).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs">Действия</p>
                      {reframeDetailData.actions
                        .filter((a) => a.text.trim())
                        .map((action, index) => (
                          <div key={index} className="bg-muted/30 space-y-2 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              {action.linkedEntity?.id ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <div className="border-muted-foreground h-4 w-4 shrink-0 rounded-full border" />
                              )}
                              <span className="flex-1 text-sm">{action.text}</span>
                            </div>
                            {!action.linkedEntity?.id && (
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px]"
                                  onClick={() =>
                                    void handleCreateTaskFromAction(
                                      reframeDetailData.actions.findIndex(
                                        (a) => a.text === action.text
                                      )
                                    )
                                  }
                                >
                                  <ListTodo className="mr-1 h-3 w-3" />
                                  Дело
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px]"
                                  onClick={() =>
                                    openChainModalForAction(
                                      reframeDetailData.actions.findIndex(
                                        (a) => a.text === action.text
                                      )
                                    )
                                  }
                                >
                                  <Target className="mr-1 h-3 w-3" />В цепочку
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px]"
                                  onClick={() =>
                                    void handleCreateRitualFromAction(
                                      reframeDetailData.actions.findIndex(
                                        (a) => a.text === action.text
                                      )
                                    )
                                  }
                                >
                                  <Sparkles className="mr-1 h-3 w-3" />
                                  Ритуал
                                </Button>
                              </div>
                            )}
                            {action.linkedEntity?.id && (
                              <Badge variant="secondary" className="text-[10px]">
                                {action.linkedEntity.type === "task" && "✓ Дело создано"}
                                {action.linkedEntity.type === "chainStep" && "✓ Шаг цепочки создан"}
                                {action.linkedEntity.type === "ritual" && "✓ Ритуал создан"}
                              </Badge>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {selectedNote?.text}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="gap-1">
                  {getNoteTypeInfo(selectedNote?.type ?? "").icon}
                  {getNoteTypeInfo(selectedNote?.type ?? "").label}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  {getNoteZoneInfo(selectedNote?.zone ?? "").icon}
                  {getNoteZoneInfo(selectedNote?.zone ?? "").label}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {formatDate(selectedNote?.createdAt ?? "")}
                </span>
              </div>

              {selectedNote?.links && selectedNote.links.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Link2 className="h-4 w-4" />
                    Связи
                  </div>
                  {selectedNote.links.map((link) => {
                    let displayText = "";
                    let iconColor = "text-primary";
                    let LinkIcon = ListTodo;

                    if (link.entity === "task") {
                      if (link.entityDetails?.chain) {
                        displayText = `Шаг цепочки: ${link.entityDetails.chain.title}`;
                        LinkIcon = Target;
                        iconColor = "text-emerald-500";
                      } else {
                        displayText = "Дело";
                      }
                    } else if (link.entity === "ritual") {
                      displayText = link.entityDetails?.title ?? "Ритуал";
                      LinkIcon = Sparkles;
                      iconColor = "text-amber-500";
                    } else if (link.entity === "chain") {
                      displayText = link.entityDetails?.title ?? "Цепочка";
                      LinkIcon = Target;
                      iconColor = "text-emerald-500";
                    }

                    return (
                      <div
                        key={link.id}
                        className="bg-muted/30 group flex items-center gap-2 rounded-lg p-2 text-sm"
                      >
                        <LinkIcon className={`h-4 w-4 ${iconColor} shrink-0`} />
                        <span className="flex-1 truncate">{displayText}</span>
                        {link.fragment && !link.entityDetails?.chain && (
                          <span className="text-muted-foreground max-w-[100px] truncate text-xs">
                            &quot;{link.fragment.substring(0, 20)}...&quot;
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRemoveLink(link.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 border-t pt-2">
                <p className="text-muted-foreground text-sm">Создать из заметки:</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => void handleCreateTask()}
                  >
                    <ListTodo className="h-4 w-4" />
                    Дело
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={openChainModal}
                  >
                    <Target className="h-4 w-4" />
                    Шаг в цепочку
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => void handleCreateRitual()}
                    disabled={isCreatingRitual}
                  >
                    <Sparkles className="h-4 w-4" />
                    {isCreatingRitual ? "Создание..." : "Ритуал"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 border-t pt-4">
          {isEditing ? (
            <>
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                Отмена
              </Button>
              <Button className="flex-1" onClick={() => void handleUpdate()}>
                Сохранить
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1 gap-1" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4" />
                Изменить
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-1"
                onClick={() => selectedNote && void handleDelete(selectedNote.id)}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
