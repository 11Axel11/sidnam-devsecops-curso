export interface BitacoraStore {
    tipoSeleccionado: number | null;
    tipoConsultaEspecialistaSeleccionado: number | null;
    datos: any[];
    loading: boolean;
    expedienteActual: number | null; 

    setTipoSeleccionado: (tipo: number, idResidente: number) => Promise<void>;
    setTipoConsultaEspecialista: (tipoConsulta: number, idResidente: number) => Promise<void>;
    initializeDefault: (idResidente: number) => Promise<void>;
    resetForNewExpediente: (idResidente: number) => void; 
}