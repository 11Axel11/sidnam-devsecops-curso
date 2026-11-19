import { create } from "zustand";
import type { PatologiasState } from "./enfermeriaStoreTypes";


export const usePatologiasStore = create<PatologiasState>((set) => ({
    patologias: [],

    agregarPatologia: (id) => {
        set((state) => {
            const nuevasPatologias = [...new Set([...state.patologias, id])];
            return { patologias: nuevasPatologias };
        });
    },

    quitarPatologia: (id) => {
        set((state) => {
            const nuevasPatologias = state.patologias.filter((p) => p !== id);
            return { patologias: nuevasPatologias };
        });
    },

    setPatologias: (ids) => {
        set({ patologias: ids });
    },

    limpiarPatologias: () => {
        set({ patologias: [] });
    }
}));