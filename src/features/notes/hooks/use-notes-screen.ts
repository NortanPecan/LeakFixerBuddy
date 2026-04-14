"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import { parseReframeData, serializeReframeData } from "@/lib/notes-config";
import type { ReframeData } from "@/lib/notes-config";
import type { ActiveChain, Note } from "@/features/notes/types";

export function useNotesScreen() {
  const { user, setScreen } = useAppStore();

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickNote, setQuickNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeZone, setActiveZone] = useState("all");

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState("");
  const [editZone, setEditZone] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [showChainModal, setShowChainModal] = useState(false);
  const [activeChains, setActiveChains] = useState<ActiveChain[]>([]);
  const [selectedChainId, setSelectedChainId] = useState("");
  const [chainStepText, setChainStepText] = useState("");
  const [isLoadingChains, setIsLoadingChains] = useState(false);
  const [isCreatingRitual, setIsCreatingRitual] = useState(false);

  const [showReframeModal, setShowReframeModal] = useState(false);
  const [reframeEditData, setReframeEditData] = useState<ReframeData | undefined>();
  const [reframeEditZone, setReframeEditZone] = useState("general");
  const [isSavingReframe, setIsSavingReframe] = useState(false);

  const [reframeDetailData, setReframeDetailData] = useState<ReframeData | null>(null);
  const [reframeActionIndex, setReframeActionIndex] = useState<number | null>(null);

  const loadNotes = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id, type: activeFilter, zone: activeZone });
      const response = await fetch(`/api/notes?${params}`);
      const data = (await response.json()) as { notes?: Note[] };
      setNotes(data.notes ?? []);
    } catch (error) {
      showErrorToast(error, "load notes");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeFilter, activeZone]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const handleQuickSave = async () => {
    if (!user?.id || !quickNote.trim()) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          text: quickNote.trim(),
          type: "thought",
          zone: "general",
        }),
      });
      const data = (await response.json()) as { note?: Note };
      if (data.note) {
        setNotes((prev) => [data.note!, ...prev]);
        setQuickNote("");
        showSuccessToast("Note created");
      }
    } catch (error) {
      showErrorToast(error, "save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setShowDetail(false);
      setSelectedNote(null);
      showSuccessToast("Note deleted");
    } catch (error) {
      showErrorToast(error, "delete note");
    }
  };

  const handleUpdate = async () => {
    if (!selectedNote) return;
    try {
      const response = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedNote.id,
          text: editText,
          type: editType,
          zone: editZone,
        }),
      });
      const data = (await response.json()) as { note?: Note };
      if (data.note) {
        setNotes((prev) => prev.map((n) => (n.id === data.note!.id ? data.note! : n)));
        setSelectedNote(data.note);
        setIsEditing(false);
        showSuccessToast("Note updated");
      }
    } catch (error) {
      showErrorToast(error, "update note");
    }
  };

  const handleCreateTask = async () => {
    if (!selectedNote || !user?.id) return;
    try {
      const response = await fetch("/api/notes/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: selectedNote.id,
          entity: "task",
          createEntity: true,
          fragment: selectedNote.text.substring(0, 100),
          entityData: { userId: user.id, text: selectedNote.text.substring(0, 200) },
        }),
      });
      const data = (await response.json()) as { link?: unknown };
      if (data.link) {
        void loadNotes();
        setShowDetail(false);
        setScreen("tasks");
      }
    } catch (error) {
      showErrorToast(error, "create task");
    }
  };

  const handleCreateRitual = async () => {
    if (!selectedNote || !user?.id || isCreatingRitual) return;
    setIsCreatingRitual(true);
    try {
      const text = selectedNote.text;
      const firstSentence = text.split(/[.!?\n]/)[0] ?? "";
      const title =
        firstSentence.length > 50
          ? firstSentence.substring(0, 50).trim() + "..."
          : firstSentence.trim() || text.substring(0, 50);

      const response = await fetch("/api/notes/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: selectedNote.id,
          entity: "ritual",
          createEntity: true,
          fragment: text.substring(0, 100),
          entityData: { userId: user.id, title },
        }),
      });
      const data = (await response.json()) as { link?: unknown };
      if (data.link) {
        void loadNotes();
        setShowDetail(false);
        setScreen("rituals");
      }
    } catch (error) {
      showErrorToast(error, "create ritual");
    } finally {
      setIsCreatingRitual(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    if (!confirm("Удалить связь?")) return;
    try {
      await fetch(`/api/notes/link?id=${linkId}`, { method: "DELETE" });
      if (selectedNote) {
        setSelectedNote({
          ...selectedNote,
          links: selectedNote.links.filter((l) => l.id !== linkId),
        });
      }
      void loadNotes();
      showSuccessToast("Связь удалена");
    } catch (error) {
      showErrorToast(error, "remove link");
    }
  };

  const loadActiveChains = async () => {
    if (!user?.id) return;
    setIsLoadingChains(true);
    try {
      const response = await fetch(`/api/chains?userId=${user.id}&status=active`);
      const data = (await response.json()) as { chains?: ActiveChain[] };
      const chains = data.chains ?? [];
      setActiveChains(chains);
      if (chains.length > 0) setSelectedChainId(chains[0].id);
    } catch (error) {
      showErrorToast(error, "load chains");
    } finally {
      setIsLoadingChains(false);
    }
  };

  const openChainModal = () => {
    setChainStepText(selectedNote?.text.substring(0, 200) ?? "");
    setShowDetail(false);
    setShowChainModal(true);
    void loadActiveChains();
  };

  const handleCreateChainStep = async () => {
    if (!user?.id || !selectedChainId || !chainStepText.trim()) return;
    try {
      const response = await fetch("/api/notes/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: selectedNote?.id,
          entity: "task",
          createEntity: true,
          fragment: chainStepText.substring(0, 100),
          entityData: { userId: user.id, text: chainStepText, chainId: selectedChainId },
        }),
      });
      const data = (await response.json()) as { link?: unknown; entityId?: string };
      if (data.link) {
        if (reframeActionIndex !== null && reframeDetailData) {
          const updatedActions = [...reframeDetailData.actions];
          updatedActions[reframeActionIndex] = {
            ...updatedActions[reframeActionIndex],
            linkedEntity: { type: "chainStep" as const, id: data.entityId ?? "" },
          };
          const updatedData = { ...reframeDetailData, actions: updatedActions };
          await fetch("/api/notes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selectedNote?.id, text: serializeReframeData(updatedData) }),
          });
          setReframeDetailData(updatedData);
          setReframeActionIndex(null);
        }
        void loadNotes();
        setShowChainModal(false);
        setSelectedChainId("");
        setChainStepText("");
        setScreen("tasks");
      }
    } catch (error) {
      showErrorToast(error, "create chain step");
    }
  };

  const openNewReframeModal = () => {
    setReframeEditData(undefined);
    setReframeEditZone("general");
    setShowReframeModal(true);
  };

  const openEditReframeModal = (note: Note) => {
    const data = parseReframeData(note.text);
    if (data) {
      setReframeEditData(data);
      setReframeEditZone(note.zone);
      setSelectedNote(note);
      setShowDetail(false);
      setShowReframeModal(true);
    }
  };

  const handleSaveReframe = async (data: ReframeData, zone: string) => {
    if (!user?.id) return;
    setIsSavingReframe(true);
    try {
      if (selectedNote && reframeEditData) {
        const response = await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedNote.id, text: serializeReframeData(data), zone }),
        });
        const result = (await response.json()) as { note?: Note };
        if (result.note) {
          setNotes((prev) => prev.map((n) => (n.id === result.note!.id ? result.note! : n)));
          setShowReframeModal(false);
          setSelectedNote(null);
          setReframeEditData(undefined);
          showSuccessToast("Reframe note updated");
        }
      } else {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            text: serializeReframeData(data),
            type: "reframe",
            zone,
          }),
        });
        const result = (await response.json()) as { note?: Note };
        if (result.note) {
          setNotes((prev) => [result.note!, ...prev]);
          setShowReframeModal(false);
          showSuccessToast("Reframe note created");
        }
      }
    } catch (error) {
      showErrorToast(error, "save reframe");
    } finally {
      setIsSavingReframe(false);
    }
  };

  const handleCreateTaskFromAction = async (actionIndex: number) => {
    if (!selectedNote || !user?.id || !reframeDetailData) return;
    const action = reframeDetailData.actions[actionIndex];
    if (!action?.text.trim()) return;
    try {
      const response = await fetch("/api/notes/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: selectedNote.id,
          entity: "task",
          createEntity: true,
          fragment: action.text.substring(0, 100),
          entityData: { userId: user.id, text: action.text, zone: selectedNote.zone },
        }),
      });
      const data = (await response.json()) as { link?: unknown; entityId?: string };
      if (data.link) {
        const updatedActions = [...reframeDetailData.actions];
        updatedActions[actionIndex] = {
          ...action,
          linkedEntity: { type: "task" as const, id: data.entityId ?? "" },
        };
        const updatedData = { ...reframeDetailData, actions: updatedActions };
        await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedNote.id, text: serializeReframeData(updatedData) }),
        });
        setReframeDetailData(updatedData);
        void loadNotes();
        showSuccessToast("Task created from action");
      }
    } catch (error) {
      showErrorToast(error, "create task from action");
    }
  };

  const openChainModalForAction = (actionIndex: number) => {
    if (!reframeDetailData) return;
    setReframeActionIndex(actionIndex);
    setChainStepText(reframeDetailData.actions[actionIndex]?.text ?? "");
    setShowDetail(false);
    setShowChainModal(true);
    void loadActiveChains();
  };

  const handleCreateRitualFromAction = async (actionIndex: number) => {
    if (!selectedNote || !user?.id || !reframeDetailData) return;
    const action = reframeDetailData.actions[actionIndex];
    if (!action?.text.trim()) return;
    try {
      const response = await fetch("/api/rituals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: action.text.substring(0, 100),
          type: "regular",
          category: "productivity",
          days: [1, 2, 3, 4, 5, 6, 7],
          timeWindow: "any",
          goalShort: `Из рефрейминга: ${reframeDetailData.newView.substring(0, 50)}`,
        }),
      });
      const data = (await response.json()) as { ritual?: { id: string } };
      if (data.ritual) {
        const updatedActions = [...reframeDetailData.actions];
        updatedActions[actionIndex] = {
          ...action,
          linkedEntity: { type: "ritual" as const, id: data.ritual.id },
        };
        const updatedData = { ...reframeDetailData, actions: updatedActions };
        await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedNote.id, text: serializeReframeData(updatedData) }),
        });
        setReframeDetailData(updatedData);
        void loadNotes();
        showSuccessToast("Ritual created from action");
      }
    } catch (error) {
      showErrorToast(error, "create ritual from action");
    }
  };

  const openNoteDetail = (note: Note) => {
    setSelectedNote(note);
    setEditText(note.text);
    setEditType(note.type);
    setEditZone(note.zone);
    setIsEditing(false);
    setReframeDetailData(note.type === "reframe" ? parseReframeData(note.text) : null);
    setShowDetail(true);
  };

  return {
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
    reframeActionIndex,
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
  };
}
