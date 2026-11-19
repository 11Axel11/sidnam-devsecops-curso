import { Link } from "@tanstack/react-router";
import type { ValoracionDetalle } from "../models/valoracion";

// El formulario de la valoración no edita los antecedentes traumáticos (se guardan al instante en su
// propia pestaña); esta franja deja ver cuántos lleva el borrador y da el acceso.
export default function ResumenAntecedentesTraumaticos({ expedienteId, valoracion }: { expedienteId: number; valoracion: ValoracionDetalle }) {
  const n = valoracion.antecedentesTraumaticos.length;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-muted/40 p-3 text-sm">
      <span>
        Antecedentes traumáticos: <strong>{n === 0 ? "ninguno registrado" : n === 1 ? "1 registrado" : `${n} registrados`}</strong>
      </span>
      <Link
        to="/residentes/$id/terapia-fisica/antecedentes-traumaticos"
        params={{ id: expedienteId } as never}
        search={{ valoracion: valoracion.id }}
        className="ml-auto font-medium underline underline-offset-4"
      >
        Gestionar antecedentes traumáticos
      </Link>
    </div>
  );
}
