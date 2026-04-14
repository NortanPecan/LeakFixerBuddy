"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  StickyNote,
  Send,
  Calendar,
  Link2,
  Edit3,
  MoreHorizontal,
  RefreshCw,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { NoteDetailDialog } from "@/features/notes/components/note-detail-dialog";
import { ChainStepModal } from "@/features/notes/components/chain-step-modal";
import { formatDate, getPreviewText } from "@/features/notes/lib/note-formatters";

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

      <NoteDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        selectedNote={selectedNote}
        reframeDetailData={reframeDetailData}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        editText={editText}
        setEditText={setEditText}
        editType={editType}
        setEditType={setEditType}
        editZone={editZone}
        setEditZone={setEditZone}
        isCreatingRitual={isCreatingRitual}
        handleUpdate={handleUpdate}
        handleDelete={handleDelete}
        handleCreateTask={handleCreateTask}
        handleCreateRitual={handleCreateRitual}
        handleRemoveLink={handleRemoveLink}
        openChainModal={openChainModal}
        handleCreateTaskFromAction={handleCreateTaskFromAction}
        openChainModalForAction={openChainModalForAction}
        handleCreateRitualFromAction={handleCreateRitualFromAction}
      />

      <ChainStepModal
        open={showChainModal}
        onOpenChange={setShowChainModal}
        activeChains={activeChains}
        isLoadingChains={isLoadingChains}
        selectedChainId={selectedChainId}
        setSelectedChainId={setSelectedChainId}
        chainStepText={chainStepText}
        setChainStepText={setChainStepText}
        handleCreateChainStep={handleCreateChainStep}
      />

      {/* Reframe Modal — kept inline: just a Dialog wrapper around ReframeForm */}
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
