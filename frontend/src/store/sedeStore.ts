import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Sede = 'hogar' | 'cecuidam';

type SedeState = {
  sede: Sede | null;
  setSede: (sede: Sede) => void;
  clearSede: () => void;
};

export const useSedeStore = create<SedeState>()(
  persist(
    (set) => ({
      sede: null,
      setSede: (sede) => set({ sede }),
      clearSede: () => set({ sede: null }),
    }),
    { name: 'inventario-sede-storage', storage: createJSONStorage(() => localStorage) }
  )
);
