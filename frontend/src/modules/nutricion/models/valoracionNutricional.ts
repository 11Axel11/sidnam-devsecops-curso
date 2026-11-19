import type { ValoracionBase } from "@/components/app/clinico/tipos";

export const ESTADOS_COGNITIVOS = ["normal", "con_deterioro"] as const;
export type EstadoCognitivo = (typeof ESTADOS_COGNITIVOS)[number];

// Nivel de deterioro cognitivo: lista cerrada (decisión de la Jefatura, octubre 2026). El valor viaja en
// minúsculas; un registro histórico puede traer otro texto (era texto libre): se muestra tal cual.
export const NIVELES_DETERIORO = ["leve", "moderado", "severo"] as const;
export type NivelDeterioro = (typeof NIVELES_DETERIORO)[number];

export const ETIQUETA_NIVEL_DETERIORO: Record<NivelDeterioro, string> = {
  leve: "Leve", moderado: "Moderado", severo: "Severo",
};

export const esNivelDeterioro = (v: string): v is NivelDeterioro => (NIVELES_DETERIORO as readonly string[]).includes(v);

// Etiqueta de un nivel guardado: de la lista → «Leve»; fuera de ella (histórico) → el texto tal cual.
export const etiquetaNivelDeterioro = (v: string) => (esNivelDeterioro(v) ? ETIQUETA_NIVEL_DETERIORO[v] : v);

// Cabecera tal como la devuelve el backend (contrato de Nutrición §1 y §5).
export interface ValoracionNutricional extends ValoracionBase {
  problemaVisual: boolean;
  problemaCavidadOral: boolean;
  alergiaMedicamentos: boolean;
  detalleAlergiaMedicamentos: string | null;
  datoFuncionalId: number | null;
  estadoCognitivo: EstadoCognitivo;
  nivelDeterioroCognitivo: string | null;
  depresion: boolean;
  ansiedad: boolean;
}

// Ítem del catálogo ya resuelto, con su `activo` ACTUAL (puede haberse desactivado después de asignarse).
export interface DatoFuncionalResuelto {
  id: number;
  nombre: string;
  activo: boolean;
}

// Solo `GET …/vigente` y `GET /:id` traen el dato funcional resuelto.
export interface ValoracionNutricionalDetalle extends ValoracionNutricional {
  datoFuncional: DatoFuncionalResuelto | null;
}

// Cuerpo de POST/PATCH: todo opcional. `null` solo vacía `detalleAlergiaMedicamentos`,
// `nivelDeterioroCognitivo` y `datoFuncionalId`; los booleanos y `estadoCognitivo` nunca van en null.
export type ValoracionNutricionalPayload = Partial<{
  fecha: string;
  problemaVisual: boolean;
  problemaCavidadOral: boolean;
  alergiaMedicamentos: boolean;
  detalleAlergiaMedicamentos: string | null;
  datoFuncionalId: number | null;
  estadoCognitivo: EstadoCognitivo;
  nivelDeterioroCognitivo: string | null;
  depresion: boolean;
  ansiedad: boolean;
}>;

// 400 al confirmar (contrato §3): aquí solo hay `faltantes`.
export interface ErrorConfirmarNutricion {
  message: string;
  faltantes: string[];
}
