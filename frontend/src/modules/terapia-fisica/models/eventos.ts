import type { RegistroAnulable } from "@/components/app/clinico/tipos";

// Evento de la bitácora (contrato eventos §1.3). `fechaHora` llega en UTC (ISO 8601 con Z): se muestra
// siempre en hora de Costa Rica. `tipoEvento.activo` es el estado ACTUAL del tipo (puede haberse desactivado).
export interface EventoImportante extends RegistroAnulable {
  id: number;
  expedienteId: number;
  fechaHora: string;
  tipoEventoId: number;
  descripcion: string | null;
  tipoEvento: { id: number; nombre: string; activo: boolean };
  /** Persona que registró el evento (solo el id). */
  creadoPorId: number | null;
  creadoPorNombre?: string | null;
  fechaCreacion: string;
  modificadoPorId: number | null;
  modificadoPorNombre?: string | null;
  fechaModificacion: string;
}

export interface FiltrosEvento {
  desde?: string;
  hasta?: string;
  tipoEventoId?: number;
  incluirAnulados: boolean;
}

// Cuerpo del POST: `fechaHora` sin zona (el backend la toma como hora de Costa Rica), el tipo y, solo si
// tiene texto, la descripción.
export interface PayloadEvento {
  fechaHora: string;
  tipoEventoId: number;
  descripcion?: string;
}
