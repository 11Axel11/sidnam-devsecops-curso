import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SolicitudesVoluntariadoStore } from "./voluntariadoStoreTypes";

export const useReadState = create<SolicitudesVoluntariadoStore>()(
  persist(
    (set, get) => ({
      readIds: new Set<number>(),
      markAsRead: (id: number) => {
        const updated = new Set(get().readIds);
        updated.add(id);
        set({ readIds: updated });
      },
      isRead: (id: number) => get().readIds.has(id),
    }),
    {
      name: "read-solicitudes",

      partialize: (state) => ({
        readIds: Array.from(state.readIds),
      }),

      merge: (persisted, current) => ({
        ...current,
        readIds: new Set((persisted as any).readIds ?? []),
      }),
    }
  )
);

// pendientes:
// si cambia de compu no se guardan las leidas. soluciones:
// - un get para seleccionar y marcar todas como leidas ? 
// - una tabla para marcar leidas segun usuario ?