import { hoyCostaRica } from "@/components/app/clinico/fechaClinica";
import type { ControlNutricionalPayload } from "../models/controlNutricional";

// Rangos inclusivos del backend (contrato §1, `RANGOS_CONTROL`): anti-error de digitación para una
// persona adulta mayor. Espejo para avisar antes de enviar; el backend valida igualmente.
export const RANGOS_CONTROL = {
  peso: { etiqueta: "El peso", min: 20, max: 250, unidad: "kg" },
  talla: { etiqueta: "La talla", min: 100, max: 220, unidad: "cm" },
  circunferenciaBraquial: { etiqueta: "La circunferencia braquial", min: 10, max: 60, unidad: "cm" },
  circunferenciaPantorrilla: { etiqueta: "La circunferencia de la pantorrilla", min: 15, max: 70, unidad: "cm" },
  alturaRodilla: { etiqueta: "La altura de la rodilla", min: 30, max: 70, unidad: "cm" },
  fuerzaMuscular: { etiqueta: "La fuerza muscular", min: 0, max: 100, unidad: "kgf" },
} as const;

export type CampoMedida = keyof typeof RANGOS_CONTROL;
export const CAMPOS_MEDIDA = Object.keys(RANGOS_CONTROL) as CampoMedida[];
export const MEDIDAS_OBLIGATORIAS: CampoMedida[] = ["peso", "talla"];

// Estado del formulario: todo como texto (lo que se digita); se convierte a número solo al enviar.
export interface ValoresControlNutricional {
  fecha: string;
  peso: string;
  talla: string;
  circunferenciaBraquial: string;
  circunferenciaPantorrilla: string;
  alturaRodilla: string;
  fuerzaMuscular: string;
  interpretacion: string;
}

export const valoresIniciales = (): ValoresControlNutricional => ({
  fecha: hoyCostaRica(),
  peso: "",
  talla: "",
  circunferenciaBraquial: "",
  circunferenciaPantorrilla: "",
  alturaRodilla: "",
  fuerzaMuscular: "",
  interpretacion: "",
});

export type Medida =
  | { tipo: "vacio" }
  | { tipo: "formato" }
  | { tipo: "numero"; valor: number; decimalesDeMas: boolean };

// Acepta coma o punto decimal («58,4» o «58.4»). Más de un decimal se marca aparte para poder
// dar primero el mensaje de rango (p. ej. «1,52» en la talla es metros, no «máximo 1 decimal»).
export function evaluarMedida(texto: string): Medida {
  const t = texto.trim().replace(",", ".");
  if (t === "") return { tipo: "vacio" };
  if (!/^\d+(\.\d+)?$/.test(t)) return { tipo: "formato" };
  const decimales = t.includes(".") ? t.split(".")[1].length : 0;
  return { tipo: "numero", valor: Number(t), decimalesDeMas: decimales > 1 };
}

const numero = (texto: string): number | undefined => {
  const m = evaluarMedida(texto);
  return m.tipo === "numero" ? m.valor : undefined;
};

// POST: solo lo que tiene valor; números JSON (nunca texto). El IMC y la edad no se envían nunca.
// `fuerzaMuscular = 0` es válido, por eso se compara contra undefined y no contra «falsy».
export function construirPayloadCrear(v: ValoresControlNutricional): ControlNutricionalPayload {
  const body: ControlNutricionalPayload = {
    fecha: v.fecha,
    peso: numero(v.peso) as number,
    talla: numero(v.talla) as number,
  };
  for (const c of ["circunferenciaBraquial", "circunferenciaPantorrilla", "alturaRodilla", "fuerzaMuscular"] as const) {
    const n = numero(v[c]);
    if (n !== undefined) body[c] = n;
  }
  const interpretacion = v.interpretacion.trim();
  if (interpretacion) body.interpretacion = interpretacion;
  return body;
}

// ---- presentación (valores tal como los devuelve el backend; nunca se recalculan) ----
const un1 = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const conSigno = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });

export const formatearMedida = (n: number | null | undefined) => (n === null || n === undefined ? "—" : un1.format(n));

// Variación respecto del control anterior: ▲/▼ y signo; sin color (subir o bajar no es bueno ni malo por sí mismo).
export function formatearVariacion(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n > 0) return `▲ ${conSigno.format(n)}`;
  if (n < 0) return `▼ ${conSigno.format(n)}`;
  return un1.format(0);
}
