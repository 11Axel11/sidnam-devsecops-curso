// Control nutricional tal como lo devuelve el backend (contrato del control nutricional §1 y §4).
// No tiene estados ni edición: cada control es un registro independiente de la serie histórica.
export interface ControlNutricional {
  id: number;
  expedienteId: number;
  fecha: string; // YYYY-MM-DD, sin hora
  /** Calculada por el backend: años cumplidos a la `fecha` del control. */
  edadMomentoControl: number;
  peso: number; // kg
  talla: number; // cm
  circunferenciaBraquial: number | null; // cm
  circunferenciaPantorrilla: number | null; // cm
  alturaRodilla: number | null; // cm
  fuerzaMuscular: number | null; // kgf
  /** Calculado por el backend (kg/m²) y almacenado: nunca se calcula ni se envía desde la interfaz. */
  imc: number;
  interpretacion: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
  anuladoPorId: number | null;
  anuladoPorNombre?: string | null;
  fechaAnulacion: string | null;
  creadoPorId: number | null;
  creadoPorNombre?: string | null;
  fechaCreacion: string;
  modificadoPorId: number | null;
  modificadoPorNombre?: string | null;
  fechaModificacion: string;
}

// Fila del listado: el control más la diferencia con el control NO anulado anterior (contrato §3).
export interface ControlNutricionalFila extends ControlNutricional {
  variacionPeso: number | null;
  variacionImc: number | null;
}

export interface FiltrosControl {
  desde?: string;
  hasta?: string;
  incluirAnulados: boolean;
}

// Cuerpo del POST: solo `peso` y `talla` son obligatorios; el resto se omite si no se registra.
// Nunca `imc`, `edadMomentoControl` ni `expedienteId` (el backend responde 400).
export interface ControlNutricionalPayload {
  fecha?: string;
  peso: number;
  talla: number;
  circunferenciaBraquial?: number;
  circunferenciaPantorrilla?: number;
  alturaRodilla?: number;
  fuerzaMuscular?: number;
  interpretacion?: string;
}
