import type { RegistroAnulable } from "@/components/app/clinico/tipos";

// Un ejercicio dentro de una aplicación (contrato test de movimiento §2.1). `ejercicio.activo` es el estado
// ACTUAL del ítem del catálogo: un ejercicio desactivado después sigue mostrándose en el historial.
export interface EjercicioAplicado {
  id: number;
  ejercicioId: number;
  ejercicio: { id: number; nombre: string; activo: boolean };
  modalidad: string;
  modificacion: string | null;
  resultado: string;
}

// Aplicación del test = cabecera (fecha, responsable) + un elemento por cada ejercicio activo al registrarla.
export interface AplicacionTest extends RegistroAnulable {
  id: number;
  expedienteId: number;
  fecha: string;
  /** Persona responsable = usuario que la registró (solo el id). */
  usuarioResponsableId: number;
  usuarioResponsableNombre?: string | null;
  /** Ordenados por `ejercicioId` para comparar dos aplicaciones ejercicio por ejercicio. */
  ejercicios: EjercicioAplicado[];
  creadoPorId: number | null;
  creadoPorNombre?: string | null;
  fechaCreacion: string;
  modificadoPorId: number | null;
  modificadoPorNombre?: string | null;
  fechaModificacion: string;
}

export interface FiltrosAplicacion {
  desde?: string;
  hasta?: string;
  incluirAnulados: boolean;
}

// Cuerpo del POST: la fecha y exactamente un elemento por cada ejercicio activo. `modificacion` solo si
// tiene texto.
export interface PayloadAplicacion {
  fecha: string;
  ejercicios: {
    ejercicioId: number;
    modalidad: string;
    modificacion?: string;
    resultado: string;
  }[];
}
