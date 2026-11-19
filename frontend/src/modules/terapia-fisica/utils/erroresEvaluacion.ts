import { traducirFormatoComun } from "@/components/app/clinico/erroresFormato";

// Los 400 de formato de los instrumentos: los de cada ítem vienen ya en español
// («comer debe ser uno de los valores permitidos: 10, 5, 0», un solo mensaje por ítem); el resto
// (`observaciones`, `fecha`…) son de class-validator. Se mapean por nombre de campo (contrato §3).
export function traducirFormatoEvaluacion(_campo: string, msg: string): string {
  if (/debe ser uno de los valores permitidos/.test(msg)) return "Selecciona una opción";
  return traducirFormatoComun(msg) ?? msg;
}
