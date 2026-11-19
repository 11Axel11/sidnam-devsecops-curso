import { create } from 'zustand';
import { getConsultasEspecialista, getConsultasEBAIS, getCuraciones } from '../services/enfermeriaServices';
import type { BitacoraStore } from './bitacorasStoreTypes';

export const useBitacoraStore = create<BitacoraStore>((set, get) => ({
    tipoSeleccionado: 4,
    tipoConsultaEspecialistaSeleccionado: null,
    datos: [],
    loading: false,
    expedienteActual: null,

    setTipoSeleccionado: async (tipo, idResidente) => {
        const { expedienteActual } = get();

        if (expedienteActual !== null && expedienteActual !== idResidente) {
            set({
                datos: [],
                tipoConsultaEspecialistaSeleccionado: null,
                expedienteActual: idResidente
            });
        }

        set({ loading: true, tipoSeleccionado: tipo, datos: [], expedienteActual: idResidente });

        let raw: any[] = [];

        try {
            switch (tipo) {
                case 1: // Consultas Especialista
                    const consultasEspResponse = await getConsultasEspecialista(tipo, idResidente);
                    raw = (consultasEspResponse?.data ?? []).map(r => ({
                        id: r.id_consulta_especialista,
                        titulo: r.titulo,
                        nota: r.descripcion,
                        fecha: r.fecha_consulta
                    }));
                    break;

                case 2: // Consultas EBAIS
                    const consultasEbaisResponse = await getConsultasEBAIS(idResidente);
                    raw = (consultasEbaisResponse?.data ?? []).map(r => ({
                        id: r.id_consulta_ebais,
                        titulo: r.titulo,
                        nota: r.descripcion,
                        fecha: r.fecha_consulta
                    }));
                    break;

                case 3: // Curaciones
                    const curacionesResponse = await getCuraciones(idResidente);
                    raw = (curacionesResponse?.data ?? []).map(r => ({
                        id: r.id_curacion,
                        titulo: r.titulo,
                        nota: r.descripcion,
                        fecha: r.fecha_curacion
                    }));
                    break;

                case 4: // Notas de Enfermería
                    raw = [];
                    break;

                default:
                    raw = [];
            }

            set({ datos: raw, loading: false });
        } catch (error) {
            console.error('Error loading bitácora data:', error);
            set({ datos: [], loading: false });
        }
    },

    setTipoConsultaEspecialista: async (tipoConsulta: number, idResidente: number) => {
        const { expedienteActual } = get();

        if (expedienteActual !== idResidente) {
            set({ expedienteActual: idResidente });
        }

        set({ loading: true, tipoConsultaEspecialistaSeleccionado: tipoConsulta, datos: [] });

        try {
            const raw = await getConsultasEspecialista(tipoConsulta, idResidente);
            const data = (raw?.data ?? []).map(r => ({
                id: r.id_consulta_especialista,
                titulo: r.titulo,
                nota: r.descripcion,
                fecha: r.fecha_consulta
            }));

            set({ datos: data, loading: false });
        } catch (error) {
            console.error('Error loading consultas especialista:', error);
            set({ datos: [], loading: false });
        }
    },

    initializeDefault: async (idResidente) => {
        const { tipoSeleccionado, expedienteActual, setTipoSeleccionado } = get();

        if (expedienteActual !== idResidente || tipoSeleccionado === null || tipoSeleccionado === 4) {
            await setTipoSeleccionado(4, idResidente);
        }
    },

    resetForNewExpediente: (idResidente: number) => {
        set({
            datos: [],
            tipoConsultaEspecialistaSeleccionado: null,
            loading: false,
            expedienteActual: idResidente,
        });
    }
}));