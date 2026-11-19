import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { mensajeError } from "@/utils/apiError";
import EstadoValoracionBadge from "./EstadoValoracionBadge";
import { formatearFechaClinica } from "./fechaClinica";
import ResponsableValoracion from "./ResponsableValoracion";
import type { ValoracionBase } from "./tipos";

type Props = {
  /** Resultado del historial del módulo (más reciente primero). */
  datos?: ValoracionBase[];
  cargando: boolean;
  error: unknown;
  onAbrir: (id: number) => void;
};

export default function HistorialValoraciones({ datos, cargando, error, onAbrir }: Props) {
  const columns = useMemo<ColumnDef<ValoracionBase>[]>(() => [
    { header: "Fecha", id: "fecha", cell: ({ row }) => formatearFechaClinica(row.original.fecha) },
    {
      header: "Estado",
      id: "estado",
      cell: ({ row }) => <EstadoValoracionBadge estado={row.original.estado} anulado={row.original.anulado} />,
    },
    {
      header: "Responsable",
      id: "responsable",
      cell: ({ row }) => <ResponsableValoracion id={row.original.usuarioResponsableId} nombre={row.original.usuarioResponsableNombre} />,
    },
    {
      header: "Acciones",
      id: "acciones",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => onAbrir(row.original.id)}>
          Abrir
        </Button>
      ),
    },
  ], [onAbrir]);

  if (cargando) return <p className="text-sm text-muted-foreground">Cargando historial…</p>;
  if (error) {
    return <p className="text-sm text-red-700" role="alert">{mensajeError(error, "No se pudo cargar el historial de valoraciones.")}</p>;
  }

  return <DataTable columns={columns} data={datos ?? []} emptyMessage="Sin valoraciones registradas" />;
}
