import type { RegistroAnulable } from "@/components/app/clinico/tipos";
import type { BARTHEL_V1 } from "../instrumentos/barthelV1";
import type { TINETTI_V1 } from "../instrumentos/tinettiV1";

export type InstrumentoTF = "barthel" | "tinetti";

type CamposDe<D extends { secciones: readonly { items: readonly { campo: string }[] }[] }> =
  D["secciones"][number]["items"][number]["campo"];

// Los ítems salen de las mismas constantes que dibujan los formularios: un campo nuevo o renombrado en
// el instrumento se refleja aquí sin retipear.
export type CampoBarthel = CamposDe<typeof BARTHEL_V1>;
export type CampoTinetti = CamposDe<typeof TINETTI_V1>;

// Campos comunes de una evaluación tal como la devuelve el backend (contrato Barthel/Tinetti §1.2 y §2.2).
export interface EvaluacionBase extends RegistroAnulable {
  id: number;
  expedienteId: number;
  /** Persona examinadora = usuario que la registró (solo el id). */
  usuarioExaminadorId: number;
  usuarioExaminadorNombre?: string | null;
  observaciones: string | null;
  /** «Barthel-v1» / «Tinetti-v1» (RN-09). */
  versionInstrumento: string;
  creadoPorId: number | null;
  creadoPorNombre?: string | null;
  fechaCreacion: string;
  modificadoPorId: number | null;
  modificadoPorNombre?: string | null;
  fechaModificacion: string;
}

// Todo lo calculado lo calcula y lo guarda el backend; la interfaz solo lo muestra.
export type EvaluacionBarthel = EvaluacionBase & Record<CampoBarthel, number> & {
  puntajeTotal: number;
  gradoDependencia: string;
};

export type EvaluacionTinetti = EvaluacionBase & Record<CampoTinetti, number> & {
  edadMomentoEvaluacion: number;
  /** Asignado por el servidor, consecutivo por expediente; nunca se reutiliza (cuenta también las anuladas). */
  numeroControl: number;
  puntajeEquilibrio: number;
  puntajeMarcha: number;
  puntajeTotal: number;
  riesgoCaida: string;
};

export interface EvaluacionPorInstrumento {
  barthel: EvaluacionBarthel;
  tinetti: EvaluacionTinetti;
}
export type EvaluacionDe<I extends InstrumentoTF> = EvaluacionPorInstrumento[I];

export interface FiltrosEvaluacion {
  desde?: string;
  hasta?: string;
  incluirAnulados: boolean;
}

// Cuerpo del POST: fecha, los ítems (números JSON) y observaciones. Nunca puntajes, grado, riesgo,
// versión, edad ni número de control (el backend responde 400).
export type PayloadEvaluacion = Record<string, number | string>;
