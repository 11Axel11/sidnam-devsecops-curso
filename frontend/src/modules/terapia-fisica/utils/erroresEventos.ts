import { traducirFormatoComun } from "@/components/app/clinico/erroresFormato";

// Campos del DTO del evento (para mapear los 400 de formato por su primera palabra). `fechaHora` del
// backend corresponde a la pareja fecha + hora del formulario.
export const CAMPOS_EVENTO = ["fechaHora", "tipoEventoId", "descripcion"] as const;

export function traducirFormatoEvento(campo: string, msg: string): string {
  const comun = traducirFormatoComun(msg);
  if (comun) return comun;
  if (campo === "tipoEventoId") return "Selecciona el tipo de evento";
  if (campo === "fechaHora") return "La fecha y hora del evento no son válidas";
  return msg;
}
