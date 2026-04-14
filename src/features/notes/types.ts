"use client";

export interface NoteLink {
  id: string;
  entity: string;
  entityId: string;
  fragment: string | null;
  entityDetails?: {
    type: "task" | "ritual" | "chain";
    text?: string;
    title?: string;
    chain?: { id: string; title: string } | null;
    status?: string;
  };
}

export interface Note {
  id: string;
  text: string;
  type: string;
  zone: string;
  date: string;
  createdAt: string;
  links: NoteLink[];
}

export interface ActiveChain {
  id: string;
  title: string;
}
