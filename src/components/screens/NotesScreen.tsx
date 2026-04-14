"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  StickyNote,
  Send,
  Link2,
  Calendar,
  Edit3,
  Sparkles,
  ListTodo,
  Target,
  MoreHorizontal,
  RefreshCw,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NOTE_TYPES,
  NOTE_ZONES,
  getNoteTypeInfo,
  getNoteZoneInfo,
  parseReframeData,
  getReframePreview,
  countLinkedActions,
} from "@/lib/notes-config";
import { ReframeForm } from "@/components/ReframeForm";
import { useNotesScreen } from "@/features/notes/hooks/use-notes-screen";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function getPreviewText(text: string, maxLength = 80): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function NotesScreen() {
  const {
    notes,
    isLoading,
    quickNote,
    setQuickNote,
    isSaving,
    activeFilter,
    setActiveFilter,
    activeZone,
    setActiveZone,
    selectedNote,
    showDetail,
    setShowDetail,
    editText,
    setEditText,
    editType,
    setEditType,
    editZone,
    setEditZone,
    isEditing,
    setIsEditing,
    showChainModal,
    setShowChainModal,
    activeChains,
    selectedChainId,
    setSelectedChainId,
    chainStepText,
    setChainStepText,
    isLoadingChains,
    isCreatingRitual,
    showReframeModal,
    setShowReframeModal,
    reframeEditData,
    setReframeEditData,
    reframeEditZone,
    isSavingReframe,
    reframeDetailData,
    handleQuickSave,
    handleDelete,
    handleUpdate,
    handleCreateTask,
    handleCreateRitual,
    handleRemoveLink,
    openChainModal,
    handleCreateChainStep,
    openNewReframeModal,
    openEditReframeModal,
    handleSaveReframe,
    handleCreateTaskFromAction,
    openChainModalForAction,
    handleCreateRitualFromAction,
    openNoteDetail,
    setScreen,
  } = useNotesScreen();

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="text-primary h-6 w-6" />
          <h1 className="text-2xl font-bold">Заметки</h1>
        </div>
        <Badge variant="secondary" className="text-xs">
          {notes.length} заметок
        </Badge>
      </div>

      {/* Quick input */}
      <Card className="bg-card/50 border-primary/20 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Написать заметку..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="bg-muted/50 min-h-[60px] resize-none border-0 focus-visible:ring-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleQuickSave();
                }
              }}
            />
            <div className="flex shrink-0 flex-col gap-1 self-end">
              <Button
                size="icon"
                onClick={() => void handleQuickSave()}
                disabled={!quickNote.trim() || isSaving}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={openNewReframeModal}
            >
              <RefreshCw className="h-4 w-4" />
              Рефрейминг
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Type filters */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant={activeFilter === "all" ? "default" : "outline"}
          onClick={() => setActiveFilter("all")}
          className="shrink-0"
        >
          Все
        </Button>
        {NOTE_TYPES.map((type) => (
          <Button
            key={type.id}
            size="sm"
            variant={activeFilter === type.id ? "default" : "outline"}
            onClick={() => setActiveFilter(type.id)}
            className="shrink-0 gap-1"
          >
            <span>{type.icon}</span>
            {type.label}
          </Button>
        ))}
      </div>

      {/* Zone filter */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant={activeZone === "all" ? "secondary" : "ghost"}
          onClick={() => setActiveZone("all")}
          className="shrink-0 text-xs"
        >
          Все зоны
        </Button>
        {NOTE_ZONES.map((zone) => (
          <Button
            key={zone.id}
            size="sm"
            variant={activeZone === zone.id ? "secondary" : "ghost"}
            onClick={() => setActiveZone(zone.id)}
            className="shrink-0 gap-1 text-xs"
          >
            <span>{zone.icon}</span>
            {zone.label}
          </Button>
        ))}
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Загрузка...</div>
      ) : notes.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <StickyNote className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
            <p className="text-muted-foreground">Нет заметок</p>
            <p className="text-muted-foreground/70 mt-1 text-sm">Напиши первую заметку выше</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const typeInfo = getNoteTypeInfo(note.type);
            const zoneInfo = getNoteZoneInfo(note.zone);
            const isReframe = note.type === "reframe";
            const reframeData = isReframe ? parseReframeData(note.text) : null;

            if (isReframe && reframeData) {
              const preview = getReframePreview(reframeData);
              const linkedCount = countLinkedActions(reframeData);
              return (
                <Card
                  key={note.id}
                  className="bg-card/50 hover:bg-card/70 border-primary/20 cursor-pointer backdrop-blur transition-colors"
                  onClick={() => openNoteDetail(note)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 text-lg">🔄</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">
                          <span className="text-destructive">&quot;{preview.oldThought}&quot;</span>
                          <span className="text-muted-foreground mx-1.5">→</span>
                          <span className="text-emerald-600">&quot;{preview.newView}&quot;</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {zoneInfo.icon} {zoneInfo.label}
                          </Badge>
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            📋 {reframeData.actions.filter((a) => a.text.trim()).length} действ.
                          </Badge>
                          {linkedCount > 0 && (
                            <Badge variant="default" className="gap-0.5 px-1.5 py-0 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" />
                              {linkedCount} связей
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditReframeModal(note);
                            }}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(note.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card
                key={note.id}
                className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
                onClick={() => openNoteDetail(note)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-lg">{typeInfo.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm">{getPreviewText(note.text)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          {zoneInfo.icon} {zoneInfo.label}
                        </Badge>
                        <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                          <Calendar className="h-3 w-3" />
                          {formatDate(note.createdAt)}
                        </span>
                        {note.links.length > 0 && (
                          <Badge variant="secondary" className="gap-0.5 px-1.5 py-0 text-[10px]">
                            <Link2 className="h-3 w-3" />
                            {note.links.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openNoteDetail(note);
                          }}
                        >
                          <Edit3 className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(note.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Note Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
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
                                  {action.linkedEntity.type === "chainStep" &&
                                    "✓ Шаг цепочки создан"}
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
                <Button
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => setIsEditing(true)}
                >
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

      {/* Chain Step Modal */}
      <Dialog open={showChainModal} onOpenChange={setShowChainModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить шаг в цепочку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {isLoadingChains ? (
              <p className="text-muted-foreground py-4 text-center">Загрузка цепочек...</p>
            ) : activeChains.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-muted-foreground">Нет активных цепочек</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setShowChainModal(false);
                    setScreen("create-chain");
                  }}
                >
                  Создать цепочку
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Выбрать цепочку</Label>
                  <Select value={selectedChainId} onValueChange={setSelectedChainId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите цепочку" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeChains.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          {chain.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Текст шага</Label>
                  <Textarea
                    value={chainStepText}
                    onChange={(e) => setChainStepText(e.target.value)}
                    placeholder="Текст нового шага..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowChainModal(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => void handleCreateChainStep()}
                    disabled={!selectedChainId || !chainStepText.trim()}
                  >
                    Создать
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reframe Modal */}
      <Dialog open={showReframeModal} onOpenChange={setShowReframeModal}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reframeEditData ? "Редактировать рефрейминг" : "Новый рефрейминг"}
            </DialogTitle>
          </DialogHeader>
          <ReframeForm
            initialData={reframeEditData}
            initialZone={reframeEditZone}
            onSubmit={(data, zone) => void handleSaveReframe(data, zone)}
            onCancel={() => {
              setShowReframeModal(false);
              setReframeEditData(undefined);
            }}
            isLoading={isSavingReframe}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
