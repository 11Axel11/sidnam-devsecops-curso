import type { RegistroAnulable } from "@/components/app/clinico/tipos";
import type { MNA_V1 } from "../instrumentos/mnaV1";

type CamposDe<D extends { secciones: readonly { items: readonly { campo: string }[] }[] }> =
  D["secciones"][number]["items"][number]["campo"];

// `itemA` … `itemR`: salen de la misma constante que dibuja el formulario.
export type CampoMna = CamposDe<typeof MNA_V1>;

// Evaluación MNA tal como la devuelve el backend (contrato MNA §1.3 y §1.6). No tiene estados ni edición.
// Todo lo calculado (subtotales, global, interpretaciones, `itemF` derivado y versión) lo calcula y
// guarda el backend; la interfaz solo lo muestra.
export type EvaluacionMna = RegistroAnulable & Record<CampoMna, number | null> & {
  id: number;
  expedienteId: number;
  fecha: string; // YYYY-MM-DD, sin hora
  /** Persona responsable = usuario que la registró (solo el id). */
  usuarioResponsableId: number;
  usuarioResponsableNombre?: string | null;
  controlNutricionalId: number | null;
  /** Siempre presente: el enviado o el derivado del IMC del control vinculado. */
  itemF: number;
  subtotalCribaje: number;
  interpretacionCribaje: string;
  /** `null` (con global e interpretación global) si no se registró la segunda parte. */
  subtotalEvaluacion: number | null;
  evaluacionGlobal: number | null;
  interpretacionGlobal: string | null;
  versionInstrumento: string;
  creadoPorId: number | null;
  creadoPorNombre?: string | null;
  fechaCreacion: string;
  modificadoPorId: number | null;
  modificadoPorNombre?: string | null;
  fechaModificacion: string;
};

export interface FiltrosMna {
  desde?: string;
  hasta?: string;
  incluirAnulados: boolean;
}

// De dónde sale cada ítem derivable (F, Q, R) según la vista previa (contrato MNA §1.6.2): con
// `origen: "control"` lo derivó el backend del control vinculado (solo lectura; `medida` y, en Q y R,
// `medidaRedondeada` son los que devolvió, sin recalcular); con `"manual"` se registra a mano y `motivo`
// dice por qué.
export type CampoDerivable = "itemF" | "itemQ" | "itemR";
export interface ItemOrigen {
  valor: number | null;
  origen: "control" | "manual";
  soloLectura: boolean;
  medida?: number;
  medidaRedondeada?: number;
  motivo?: string;
}
export type ItemsOrigen = Partial<Record<CampoDerivable, ItemOrigen>>;

// Respuesta de `POST …/evaluaciones-mna/calcular` (contrato §1.6.2): lo que el servidor calcularía, sin
// guardar. `segundaParte.requerida`/`completa` describen el estado, no son errores.
export interface VistaPreviaMna {
  subtotalCribaje: number;
  interpretacionCribaje: string;
  subtotalEvaluacion: number | null;
  evaluacionGlobal: number | null;
  interpretacionGlobal: string | null;
  versionInstrumento: string;
  /** El `itemF` efectivo: el enviado o el derivado del IMC del control. */
  itemF: number;
  segundaParte: {
    requerida: boolean;
    completa: boolean;
    /** Campos G–R que faltan, en el orden del instrumento. */
    itemsFaltantes: string[];
  };
  itemsOrigen?: ItemsOrigen;
  /** Control vinculado con el que se pidió (lo agrega el servicio): evita usar el origen de otro control. */
  controlId?: number | null;
}

// Cuerpo del POST y de la vista previa (el mismo): fecha, `controlNutricionalId` si hay vínculo y los ítems
// contestados (números JSON, con punto). Nunca subtotales, global, interpretaciones, versión ni `itemF`
// derivado (el backend responde 400).
export type PayloadMna = Record<string, number | string>;
