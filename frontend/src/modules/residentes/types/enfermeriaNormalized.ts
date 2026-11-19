import type { Bitacora, Notas, Curacion, ConsultaEspecialista, ConsultaEBAIS, LibroDeCampo } from "../models/enfermeria";


export type EnfermeriaRaw =
  | Bitacora
  | Notas
  | Curacion
  | ConsultaEspecialista
  | ConsultaEBAIS
  | LibroDeCampo;

export type EnfermeriaTipo =
  | "bitacora"
  | "nota"
  | "curacion"
  | "consulta_especialista"
  | "consulta_ebais"
  | "libro_de_campo";

export type EnfermeriaEntry = {
  id: number | string;
  titulo: string;
  nota?: string;           // notas enfermería
  descripcion?: string;    // curaciones, consultas
  descripcionCompleta?: string; // libro de campo
  fecha?: string;
  fecha_curacion?: string;
  fecha_consulta?: string;
  fechaActividad?: string;
  tipo?: EnfermeriaTipo;
};

// --- helpers seguros ---
const has = <K extends PropertyKey>(obj: unknown, key: K): obj is Record<K, unknown> =>
  !!obj && typeof obj === "object" && key in obj;

const stringOrEmpty = (v: unknown) => (typeof v === "string" ? v : "");
const idOr = (v: unknown, fallback: number | string) =>
  (typeof v === "number" || typeof v === "string") ? v : fallback;

// --- type guards por entidad (para TS y legibilidad) ---
const isCuracion = (x: unknown): x is Curacion =>
  has(x, "id_curacion") && has(x, "descripcion") && has(x, "fecha_curacion");

const isConsultaEspecialista = (x: unknown): x is ConsultaEspecialista =>
  has(x, "id_consulta_especialista") && has(x, "descripcion") && has(x, "fecha_consulta");

const isConsultaEBAIS = (x: unknown): x is ConsultaEBAIS =>
  has(x, "id_consulta_ebais") && has(x, "descripcion") && has(x, "fecha_consulta");

const isLibroDeCampo = (x: unknown): x is LibroDeCampo =>
  has(x, "id") && (has(x, "fechaActividad") || has(x, "fecha")) && has(x, "descripcion");

const isBitacora = (x: unknown): x is Bitacora =>
  has(x, "id") && has(x, "titulo") && has(x, "nota") && has(x, "fecha");

const isNotas = (x: unknown): x is Notas =>
  has(x, "id") && has(x, "titulo") && has(x, "nota") && has(x, "fecha");

// --- normalizadores por tipo ---
const normalizeCuracion = (c: Curacion): EnfermeriaEntry => ({
  id: c.id_curacion,
  titulo: stringOrEmpty(c.titulo),
  nota: stringOrEmpty(c.descripcion),
  fecha: stringOrEmpty(c.fecha_curacion),
  tipo: "curacion",
});

const normalizeConsultaEspecialista = (c: ConsultaEspecialista): EnfermeriaEntry => ({
  id: c.id_consulta_especialista,
  titulo: stringOrEmpty(c.titulo),
  nota: stringOrEmpty(c.descripcion),
  fecha: stringOrEmpty(c.fecha_consulta),
  tipo: "consulta_especialista",
});

const normalizeConsultaEBAIS = (c: ConsultaEBAIS): EnfermeriaEntry => ({
  id: c.id_consulta_ebais,
  titulo: stringOrEmpty(c.titulo),
  nota: stringOrEmpty(c.descripcion),
  fecha: stringOrEmpty(c.fecha_consulta),
  tipo: "consulta_ebais",
});

const normalizeLibroDeCampo = (l: LibroDeCampo): EnfermeriaEntry => ({
  id: l.id,
  // Si quieres mostrar otra cosa como título (p. ej. problemática), cámbialo aquí.
  titulo: stringOrEmpty(l.descripcion),
  // Combina piezas útiles en la nota
  nota: [
    l.problematica ? `Problemática: ${l.problematica}` : "",
    l.acuerdoAlcanzado ? `Acuerdo: ${l.acuerdoAlcanzado}` : "",
  ]
    .filter(Boolean)
    .join(" • "),
  // Prioriza fechaActividad y cae a fecha si no viene
  fecha: stringOrEmpty(l.fechaActividad || l.fecha),
  tipo: "libro_de_campo",
});

const normalizeBitacora = (b: Bitacora): EnfermeriaEntry => ({
  id: b.id,
  titulo: stringOrEmpty(b.titulo),
  nota: stringOrEmpty(b.nota),
  fecha: stringOrEmpty(b.fecha),
  tipo: "bitacora",
});

const normalizeNotas = (n: Notas): EnfermeriaEntry => ({
  id: n.id,
  titulo: stringOrEmpty(n.titulo),
  nota: stringOrEmpty(n.nota),
  fecha: stringOrEmpty(n.fecha),
  tipo: "nota",
});

// --- normalizador general ---
export const normalizeEnfermeriaItem = (raw: EnfermeriaRaw): EnfermeriaEntry => {
  if (isCuracion(raw)) return normalizeCuracion(raw);
  if (isConsultaEspecialista(raw)) return normalizeConsultaEspecialista(raw);
  if (isConsultaEBAIS(raw)) return normalizeConsultaEBAIS(raw);
  if (isLibroDeCampo(raw)) return normalizeLibroDeCampo(raw);
  if (isBitacora(raw)) return normalizeBitacora(raw);
  if (isNotas(raw)) return normalizeNotas(raw);

  // Fallback defensivo: intenta mapear campos comunes si algo nuevo llega
  return {
    id: idOr((raw as { id?: number | string })?.id, ""),
    titulo: stringOrEmpty((raw as Record<string, unknown>)?.titulo || (raw as Record<string, unknown>)?.nombre || "Sin título"),
    nota:
      stringOrEmpty(
        (raw as Record<string, unknown>)?.nota ??
          (raw as Record<string, unknown>)?.descripcion ??
          (raw as Record<string, unknown>)?.descripcionCompleta ??
          (raw as Record<string, unknown>)?.observacion ??
          (raw as Record<string, unknown>)?.problematica ??
          (raw as Record<string, unknown>)?.acuerdo_alcanzado
      ) || "—",
    fecha:
      stringOrEmpty(
        (raw as Record<string, unknown>)?.fecha ??
          (raw as Record<string, unknown>)?.fecha_curacion ??
          (raw as Record<string, unknown>)?.fecha_consulta ??
          (raw as Record<string, unknown>)?.fechaActividad ??
          (raw as Record<string, unknown>)?.fecha_actividad
      ) || "",
    tipo: "nota",
  };
};

export const normalizeEnfermeriaList = (items: EnfermeriaRaw[]): EnfermeriaEntry[] =>
  items.map(normalizeEnfermeriaItem);
