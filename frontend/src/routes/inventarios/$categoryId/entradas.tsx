import { createFileRoute, redirect } from '@tanstack/react-router'
import { useGetEntradas, useGetReporteEntradasMedicamentosPorMes } from '@/modules/inventarios/hooks/inventarioHooks'
import { useState } from 'react'
import type { RegistroEntradaSalida, EntradaSalida } from '@/modules/inventarios/models/inventario'
import type { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/DataTable'
import WebLoader from '@/components/Loader'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import AgregarMovimientoDialogo from '@/modules/inventarios/components/AgregarMovimientoDialogo'
import { DescargarReportePopover } from "@/components/DescargarReportePopover";
import { useGetReporteEntradasPorMes } from "@/modules/inventarios/hooks/inventarioHooks";
import { usePostEntrada } from "@/modules/inventarios/hooks/inventarioHooks";
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AgregarEntradaMedicamento from '@/modules/inventarios/components/AgregarEntradaMedicamento'
import TablaEntradasMedicamentos from '@/modules/inventarios/components/TablaEntradasMedicamentos'
import { esCategoriaLegacy, nombreCategoria, permsEntradasCategoria } from '@/modules/inventarios/permissions'
import MovimientosPage from '@/modules/inventarios/components/MovimientosPage'
import { ensurePerms, makeCan } from '@/services/authHelpers'

export const Route = createFileRoute('/inventarios/$categoryId/entradas')({
  beforeLoad: async ({ context, params, location }) => {
    const need = permsEntradasCategoria(params.categoryId);
    if (!need.length) throw redirect({ to: '/404' });
    const perms = await ensurePerms(context.queryClient);
    const { canAny } = makeCan(perms);
    if (!canAny(need)) throw redirect({ to: '/403', search: { from: location.href } });
  },
  component: EntradasPage,
})

function EntradasPage() {
  const { categoryId } = Route.useParams();
  const { sede, inventarioId } = Route.useSearch();
  if (esCategoriaLegacy(categoryId)) return <EntradasPageLegacy />;
  if (!sede) return null;
  return (
    <MovimientosPage
      tipo="entradas"
      sede={sede}
      categoryId={Number(categoryId)}
      nombreCategoria={nombreCategoria[categoryId] ?? ''}
      inventarioIdInicial={inventarioId}
    />
  );
}

function EntradasPageLegacy() {
    const { categoryId } = Route.useParams();
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number | undefined>(new Date().getFullYear());

    const { entradas, totalEntradas, loadingEntradas, fetchingEntradas, errorEntradas } = 
        useGetEntradas(selectedYear ?? new Date().getFullYear(), selectedMonth ?? new Date().getMonth() + 1,Number(categoryId), pageIndex + 1, pageSize);

    const {mutateAsync: agregarEntrada} = usePostEntrada();
    const queryClient = useQueryClient();

    const handleAgregarEntrada = async (movimientos: EntradaSalida[]) => {
      try {
        await agregarEntrada({ productos: movimientos });
        await queryClient.invalidateQueries({ queryKey: ['entradas'] });
        await queryClient.invalidateQueries({ queryKey: ['inventario'] });
        toast.success("Entrada registrada exitosamente");
      } catch (error) {
        console.error('Error al registrar la entrada:', error);
        toast.error("Error al registrar la entrada. Por favor, intente de nuevo.");
      }
    };

    const descargarReporte = useGetReporteEntradasPorMes();
    const { mutateAsync: descargarReporteMedicamentos } = useGetReporteEntradasMedicamentosPorMes();

    let nombreCategoria = "";
    if(categoryId === "1") {
        nombreCategoria = "Alimentos"
      } else if(categoryId === "2") {
        nombreCategoria = "Limpieza"
      } else if(categoryId === "3") {
        nombreCategoria = "Medicamentos"
      } else if(categoryId === "4") {
        nombreCategoria = "Otros"
      }

    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const monthName = format(new Date(2020, i, 1), 'MMMM', { locale: es });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        return {
            value: (i + 1).toString(),
            label: capitalizedMonth
        };
    });
  
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => ({
        value: (currentYear - i).toString(),
        label: (currentYear - i).toString()
    }));
    
    const toolbar = (
      <div className="flex gap-2">
          <Select
              value={selectedMonth?.toString()}
              onValueChange={(value) => {
                  setSelectedMonth(Number(value));
                  setPageIndex(0);
              }}
          >
              <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent>
                  {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                          {month.label}
                      </SelectItem>
                  ))}
              </SelectContent>
          </Select>
          <Select
              value={selectedYear?.toString()}
              onValueChange={(value) => {
                  setSelectedYear(Number(value));
                  setPageIndex(0);
              }}
          >
              <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                  {yearOptions.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                          {year.label}
                      </SelectItem>
                  ))}
              </SelectContent>
          </Select>
      </div>
    )
    
    const columns: ColumnDef<RegistroEntradaSalida>[] = [
      { header: "Codigo", accessorKey: "codigo_producto" },
      { header: "Nombre", accessorKey: "nombre" },
      {
        header: "Unidad de medida", 
        accessorKey: "unidadMedida",
        cell: ({row}) => {
          return row.original.unidadMedida.nombre + ' (' + row.original.unidadMedida.abreviatura +')'
        }
      },
      { 
        header: "Fecha", 
        accessorKey: "fecha",
        cell: ({ row }) => {
          const date = new Date(row.original.fecha);
          return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      },
      { header: "Cantidad", accessorKey: "cantidad" }
    ];

    if (loadingEntradas || fetchingEntradas || errorEntradas) {
      return <><WebLoader/></>
    }

  return (
    <div className="p-4">
      <nav className="flex justify-between mb-4">
        {categoryId === "3" ? (
          <AgregarEntradaMedicamento onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["entradas", categoryId] });
            queryClient.invalidateQueries({ queryKey: ["inventario"] });
          }}>
            <Button variant="create">
              <Plus />
              Agregar entrada
            </Button>
          </AgregarEntradaMedicamento>
        ) : (
          <>
          <AgregarMovimientoDialogo
            categoryId={Number(categoryId)}
            sede="hogar"
            tipo="entrada" 
            onSuccess={handleAgregarEntrada}
          >
          <Button variant="create" >
            <Plus />
            Agregar entrada
          </Button>
        </AgregarMovimientoDialogo>
        </>
      )}
      <div className="flex gap-2">
        {categoryId === "3" ? (
          <DescargarReportePopover
            onDownload={async (month) => {
              await descargarReporteMedicamentos({ 
                anio: month.getFullYear(), 
                mes: month.getMonth() + 1 
              });
            }}
            successMessage="Reporte de entradas de medicamentos generado correctamente"
            errorMessage="No existen entradas de medicamentos para el mes seleccionado"
          />
        ) : (
          <DescargarReportePopover
            onDownload={async (month) => {
              await descargarReporte.mutateAsync({ 
                mes: month.getMonth() + 1,
                anio: month.getFullYear(),
                categoryId: Number(categoryId), 
                categoryName: nombreCategoria 
              });
            }}
            successMessage={`Reporte de entradas de ${nombreCategoria} generado correctamente`}
            errorMessage={`No existen entradas de ${nombreCategoria} para el mes seleccionado`}
          />
        )}
      </div>
      </nav>
      <div className="mx-auto">
        {categoryId === "3" ? (
          <TablaEntradasMedicamentos />
        ) : (
          <DataTable
          columns={columns}
          data={entradas}
          total={totalEntradas}
          pageIndex={pageIndex}
          pageSize={pageSize}
          setPageIndex={setPageIndex}
          setPageSize={setPageSize}
          toolbar={toolbar}
        />
        )}
      </div>
    </div>
  )
}
