import { Link } from "@tanstack/react-router";
import type { Valoracion } from "../models/valoracion";
import { formatearFechaClinica } from "@/components/app/clinico/fechaClinica";
import EstadoValoracionBadge from "@/components/app/clinico/EstadoValoracionBadge";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";

type Props = {
  expedienteId: number;
  valoracion: Valoracion;
  /** De dónde salió: la pedida por URL, el borrador abierto o la vigente. */
  origen?: "solicitada" | "borrador" | "vigente";
};

const textoOrigen = {
  solicitada: "Valoración seleccionada",
  borrador: "Borrador abierto",
  vigente: "Valoración vigente",
} as const;

// Franja que dice a qué valoración pertenece la lista que se está viendo.
export default function ContextoValoracion({ expedienteId, valoracion: v, origen }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border bg-muted/40 p-3 text-sm">
      <span className="font-medium">
        {origen ? `${textoOrigen[origen]} · ` : ""}Valoración del {formatearFechaClinica(v.fecha)}
      </span>
      <EstadoValoracionBadge estado={v.estado} anulado={v.anulado} />
      <span className="text-muted-foreground">
        Responsable: <ResponsableValoracion id={v.usuarioResponsableId} nombre={v.usuarioResponsableNombre} />
      </span>
      <Link
        to="/residentes/$id/terapia-fisica/valoracion"
        params={{ id: expedienteId } as never}
        search={{ valoracion: v.id }}
        className="ml-auto text-sm font-medium underline underline-offset-4"
      >
        Ver valoración
      </Link>
    </div>
  );
}
