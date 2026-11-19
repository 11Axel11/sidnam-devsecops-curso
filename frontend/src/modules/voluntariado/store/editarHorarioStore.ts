import { create } from "zustand";

interface HorarioEditState {
  eliminado: boolean;
  setEliminado: (valor: boolean) => void;
}

export const useHorarioEditStore = create<HorarioEditState>((set) => ({
  eliminado: false,
  setEliminado: (valor) => set({ eliminado: valor }),
}));
