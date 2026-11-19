import type { EstadoValoracion } from "./estadoValoracion";

// Cabecera común de las valoraciones clínicas (Terapia Física y Nutrición): identificación, estado,
// anulación y auditoría tal como las devuelve el backend. Cada módulo agrega sus campos propios.
export interface ValoracionBase {
  id: number;
  expedienteId: number;
  fecha: string; // YYYY-MM-DD, sin hora
  usuarioResponsableId: number;
  estado: EstadoValoracion;
  anulado: boolean;
  motivoAnulacion: string | null;
  anuladoPorId: number | null;
  fechaAnulacion: string | null;
  creadoPorId: number | null;
  fechaCreacion: string;
  modificadoPorId: number | null;
  fechaModificacion: string;
  // Nombres (CA-26, solo lectura): los resuelve el backend junto a cada id; `null` si el usuario no se
  // puede resolver. Nunca se envían.
  usuarioResponsableNombre?: string | null;
  anuladoPorNombre?: string | null;
  creadoPorNombre?: string | null;
  modificadoPorNombre?: string | null;
}

// Campos mínimos de un registro de una serie sin estados que puede anularse (control, evaluaciones,
// eventos). `fecha` es opcional: los eventos llevan fecha y hora y pasan su propio `textoFecha`.
export interface RegistroAnulable {
  fecha?: string;
  anulado: boolean;
  motivoAnulacion: string | null;
  anuladoPorId: number | null;
  /** Nombre de quien anuló (CA-26, solo lectura). */
  anuladoPorNombre?: string | null;
  fechaAnulacion: string | null;
}

// Quién registró y quién modificó un registro, y cuándo (CA-26). Todo viene del backend; los nombres son
// de solo lectura.
export interface RegistroAuditable {
  creadoPorId: number | null;
  creadoPorNombre?: string | null;
  fechaCreacion: string;
  modificadoPorId: number | null;
  modificadoPorNombre?: string | null;
  fechaModificacion: string;
}
