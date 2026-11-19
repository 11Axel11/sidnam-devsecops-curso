import { traducirFormatoComun } from "@/components/app/clinico/erroresFormato";
import { dataDe, esErrorDeRed, mensajeError, statusDe } from "@/utils/apiError";
import { MNA_V1 } from "../instrumentos/mnaV1";

// Campos del DTO (para mapear los 400 de formato por su primera palabra).
export const CAMPOS_MNA = [
  "fecha", "controlNutricionalId", ...MNA_V1.secciones.flatMap((s) => s.items.map((i) => i.campo)),
] as const;

// Los 400 de formato de cada ítem vienen en español («itemD debe ser uno de los valores permitidos: 0, 2»,
// un solo mensaje por ítem); el resto son de class-validator. Se mapean por nombre de campo (contrato §2).
export function traducirFormatoMna(campo: string, msg: string): string {
  if (/debe ser uno de los valores permitidos/.test(msg)) return "Selecciona una opción";
  if (campo === "controlNutricionalId") return "Selecciona un control válido o «Sin vincular»";
  return traducirFormatoComun(msg) ?? msg;
}

// Los `errores` sobre el vínculo empiezan por «controlNutricionalId …»: van bajo el selector; el resto
// (fecha, `itemF no coincide con el IMC…`, segunda parte) va al banner.
export function separarErroresControl(lista: string[]): { control: string[]; otros: string[] } {
  return {
    control: lista.filter((m) => m.startsWith("controlNutricionalId")),
    otros: lista.filter((m) => !m.startsWith("controlNutricionalId")),
  };
}

// Mensajes de un fallo de la vista previa (400 `errores`, 400 de formato, 404, 409, red, 403).
export function mensajesVistaPrevia(err: unknown): string[] {
  const status = statusDe(err);
  const data = dataDe<{ errores?: string[]; message?: string | string[] }>(err);
  if (status === 400 && Array.isArray(data?.errores)) return data.errores;
  if (status === 400 && Array.isArray(data?.message)) return data.message.map((m) => traducirFormatoMna(m.split(" ")[0], m));
  if (esErrorDeRed(err)) return ["Sin conexión con el servidor: no se pudo calcular el resultado."];
  return [mensajeError(err, "No se pudo calcular el resultado.")];
}
