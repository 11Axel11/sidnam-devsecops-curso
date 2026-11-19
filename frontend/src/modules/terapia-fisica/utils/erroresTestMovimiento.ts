import { traducirFormatoComun } from "@/components/app/clinico/erroresFormato";

export const CAMPOS_FILA = ["modalidad", "modificacion", "resultado"] as const;
export type CampoFila = (typeof CAMPOS_FILA)[number];
export type ErroresFilas = Record<number, Partial<Record<CampoFila, string>>>;

// Campos de la cabecera del DTO (los de cada ejercicio llegan como `ejercicios.N.campo`).
export const CAMPOS_APLICACION = ["fecha", "ejercicios"] as const;

const traducirFila = (msg: string): string => {
  if (/shorter than or equal to 255 characters/.test(msg)) return "No puede superar los 255 caracteres";
  if (/should not be empty|must be a string/.test(msg)) return "Obligatorio";
  return msg;
};

// 400 de formato de la cabecera (el texto de cada ejercicio se reparte aparte, por fila).
export function traducirFormatoAplicacion(campo: string, msg: string): string {
  const comun = traducirFormatoComun(msg);
  if (comun) return comun;
  if (/mismo ejercicioId repetido/.test(msg)) return "Hay un ejercicio repetido en la aplicación";
  if (campo === "ejercicios") return "La aplicación debe incluir los ejercicios del catálogo";
  return msg;
}

export type FormatoRepartido = { filas: ErroresFilas; fecha?: string; otros: string[] };

// Reparte los `message[]` de un 400 de formato: `ejercicios.N.campo …` va a la fila del ejercicio que
// estaba en la posición N del arreglo enviado (`enviados`, los ejercicioId en el orden del POST); `fecha …`
// al campo fecha y lo demás (ejercicios repetidos, propiedades no permitidas) al banner.
export function repartirErroresFormato(mensajes: string[], enviados: readonly number[]): FormatoRepartido {
  const r: FormatoRepartido = { filas: {}, otros: [] };
  for (const m of mensajes) {
    const fila = /^ejercicios\.(\d+)\.(\w+) /.exec(m);
    if (fila && (CAMPOS_FILA as readonly string[]).includes(fila[2]) && enviados[Number(fila[1])] !== undefined) {
      const id = enviados[Number(fila[1])];
      const campo = fila[2] as CampoFila;
      r.filas[id] = { ...r.filas[id], [campo]: r.filas[id]?.[campo] ?? traducirFila(m) };
    } else if (m.startsWith("fecha ")) {
      r.fecha = r.fecha ?? traducirFormatoAplicacion("fecha", m);
    } else {
      const nuevo = traducirFormatoAplicacion(m.split(" ")[0], m);
      if (!r.otros.includes(nuevo)) r.otros.push(nuevo);
    }
  }
  return r;
}
