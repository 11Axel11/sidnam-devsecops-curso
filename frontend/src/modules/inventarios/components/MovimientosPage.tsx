import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus } from "lucide-react";
import DataTable from "@/components/DataTable";
import WebLoader from "@/components/Loader";
import IfPerm from "@/components/auth/IfPerm";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DescargarReportePopover } from "@/components/DescargarReportePopover";
import type { Sede } from "@/store/sedeStore";
import { PERM_SALIDAS_ACTUALIZAR, requireFor } from "../permissions";
import { useMovimientosCategoria } from "../hooks/existenciaHooks";
import {
  useGetReporteEntradasPorMes, useGetReporteSalidasPorMes, usePostEntrada, usePostSalida,
} from "../hooks/inventarioHooks";
import type { MovimientoFila } from "../models/existencia";
import type { EntradaSalida } from "../models/inventario";
import AgregarMovimientoDialogo from "./AgregarMovimientoDialogo";
import { toast } from "sonner";
import { mensajeError } from "@/utils/apiError";

type Props = {
  tipo: 'entradas' | 'salidas';
  sede: Sede;
  categoryId: number;
  nombreCategoria: string;
  inventarioIdInicial?: number;
};

const formatearFecha = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

export default function MovimientosPage({ tipo, sede, categoryId, nombreCategoria, inventarioIdInicial }: Props) {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const mesParam = `${anio}-${String(mes).padStart(2, '0')}`;
  const { filas, isLoading, isError, error } = useMovimientosCategoria({ tipo, sede, categoria: categoryId, mes: mesParam });

  const reporteEntradas = useGetReporteEntradasPorMes();
  const reporteSalidas = useGetReporteSalidasPorMes();
  const { mutateAsync: postEntrada } = usePostEntrada();
  const { mutateAsync: postSalida } = usePostSalida();

  const esSalida = tipo === 'salidas';
  const etiqueta = esSalida ? 'salida' : 'entrada';

  const registrar = async (productos: EntradaSalida[]) => {
    try {
      await (esSalida ? postSalida : postEntrada)({ productos });
      toast.success(esSalida ? 'Salidas registradas exitosamente' : 'Entradas registradas exitosamente');
    } catch (err) {
      toast.error(mensajeError(err, `Error al registrar las ${tipo}. Intenta de nuevo.`), { duration: 5000 });
      throw err;
    }
  };


  const columns = useMemo<ColumnDef<MovimientoFila>[]>(() => [
    { header: "Código", accessorKey: "codigo" },
    { header: "Nombre", accessorKey: "nombre" },
    { header: "Unidad de medida", accessorKey: "unidad" },
    { header: "Fecha", accessorKey: "fecha", cell: ({ row }) => formatearFecha(row.original.fecha) },
    { header: "Cantidad", accessorKey: "cantidad" },
    {
      header: "Registrado por",
      id: "registradoPor",
      cell: ({ row }) => row.original.usuarioResponsable?.nombre ?? '—',
    },
  ], []);

  const meses = Array.from({ length: 12 }, (_, i) => {
    const n = format(new Date(2020, i, 1), 'MMMM', { locale: es });
    return { value: String(i + 1), label: n.charAt(0).toUpperCase() + n.slice(1) };
  });
  const anios = Array.from({ length: 6 }, (_, i) => String(hoy.getFullYear() - i));

  const toolbar = (
    <div className="flex gap-2">
      <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar mes" /></SelectTrigger>
        <SelectContent>
          {meses.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Año" /></SelectTrigger>
        <SelectContent>
          {anios.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="p-4">
      <nav className="flex justify-between mb-4">
        <IfPerm perm={esSalida ? PERM_SALIDAS_ACTUALIZAR : requireFor(String(categoryId), 'Crear')!}>
          <AgregarMovimientoDialogo
            key={`${tipo}-${inventarioIdInicial ?? 0}`}
            categoryId={categoryId}
            sede={sede}
            tipo={etiqueta}
            onSuccess={registrar}
            defaultInventarioId={inventarioIdInicial}
          >
            <Button variant="create">
              <Plus /> Agregar {etiqueta}
            </Button>
          </AgregarMovimientoDialogo>
        </IfPerm>
        {sede === 'hogar' && (
          <DescargarReportePopover
            onDownload={async (month) => {
              const base = { mes: month.getMonth() + 1, anio: month.getFullYear(), categoryId, categoryName: nombreCategoria };
              if (esSalida) await reporteSalidas.mutateAsync(base);
              else await reporteEntradas.mutateAsync(base);
            }}
            successMessage={`Reporte de ${tipo} de ${nombreCategoria} generado correctamente`}
            errorMessage={`No existen ${tipo} de ${nombreCategoria} para el mes seleccionado`}
          />
        )}
      </nav>

      {isLoading ? (
        <WebLoader />
      ) : isError ? (
        <p className="text-center text-red-700">{mensajeError(error, 'Ocurrió un error al cargar los movimientos.')}</p>
      ) : (
        <>
          <DataTable columns={columns} data={filas} toolbar={toolbar} />
        </>
      )}
    </div>
  );
}
