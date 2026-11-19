export interface PatologiasState {
    patologias: number[];
    agregarPatologia: (id: number) => void;
    quitarPatologia: (id: number) => void;
    setPatologias: (ids: number[]) => void;
    limpiarPatologias: () => void;
}
