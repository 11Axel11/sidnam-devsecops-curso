import WebLoader from '@/components/Loader';
import { Button } from '@/components/ui/button';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import CardPreviewRegistro from '@/modules/donaciones/components/CardPreviewRegistro';
import { FiltroRegistrosDonacion } from '../../../modules/donaciones/components/FiltrosRegistrosDonacion';
import {
  useGetReporteDonacionesPorMes,
  useFiltrarRegistrosDonaciones,
} from '@/modules/donaciones/hooks/gestionDonacion/gestionDonacionesHooks';
import type { FiltrarRegistrosParams } from '../../../modules/donaciones/models/registroDonacion';
import { Plus } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { DescargarReportePopover } from '@/components/DescargarReportePopover';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import IfPerm from '@/components/auth/IfPerm';

export const Route = createFileRoute('/donaciones/gestion/')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient);
    const { canAny } = makeCan(perms);
    if (!canAny(['Donaciones.Gestión Donaciones:Ver']))
      throw redirect({ to: '/403', search: { from: location.href } });

    if (/^\/donaciones\/gestion\/historial\/?$/.test(location.pathname.toLowerCase()))
      throw redirect({ to: '/donaciones/gestion' });
  },
});

type FilterFields = Omit<FiltrarRegistrosParams, 'page' | 'limit'>;

const LIMIT = 12;

function RouteComponent() {
  const navigate = useNavigate();
  const descargarReporte = useGetReporteDonacionesPorMes();

  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState<FilterFields>({});

  const {
    isPlaceholderData,
    totalRegistrosDonacion,
    registrosDonacion,
    fetchingRegistrosDonacion,
    loadingRegistrosDonacion,
  } = useFiltrarRegistrosDonaciones({ ...filtros, page, limit: LIMIT });

  // Reset to page 1 whenever filters change
  const handleFilter = (params: FilterFields) => {
    setFiltros(params);
    setPage(1);
  };

  const totalPages = Math.ceil(totalRegistrosDonacion / LIMIT);
  const isLastPage = page >= totalPages;

  const prevPage = () => setPage((p) => Math.max(p - 1, 1));
  const nextPage = () => { if (!isPlaceholderData && !isLastPage) setPage((p) => p + 1); };

  const maxVisiblePages = 4;

  const getPageRange = () => {
    if (totalPages <= maxVisiblePages)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= maxVisiblePages)
      return Array.from({ length: maxVisiblePages }, (_, i) => i + 1);
    if (page < totalPages)
      return Array.from({ length: maxVisiblePages }, (_, i) => page + i);
    return Array.from({ length: maxVisiblePages }, (_, i) => totalPages - maxVisiblePages + 1 + i);
  };

  const pageRange = getPageRange();

  const verRegistro = (id: number) =>
    navigate({ to: '/donaciones/gestion/$id', params: { id } });

  if (loadingRegistrosDonacion) return <WebLoader />;

  return (
    <section className="px-2 pb-4 flex flex-col gap-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <FiltroRegistrosDonacion onFilter={handleFilter} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row w-full md:w-auto md:justify-end">
            <IfPerm perm="Donaciones.Gestión Donaciones:Ver">
              <DescargarReportePopover
                onDownload={async (month) =>
                  descargarReporte.mutateAsync({
                    mes: month.getMonth() + 1,
                    anio: month.getFullYear(),
                  })
                }
                successMessage="Reporte descargado correctamente. Puede visualizarlo en el apartado de descargas."
                errorMessage="No hay registros para el mes seleccionado."
              />
            </IfPerm>

            <IfPerm perm="Donaciones.Gestión Donaciones:Crear">
              <Button variant="create" onClick={() => navigate({ to: '/donaciones/gestion/crear' })}>
                <Plus />
                Ingresar donación
              </Button>
            </IfPerm>
          </div>
        </div>
      </div>

      {/* Card grid — dims during background fetches instead of showing a full spinner */}
      <div
        className={`flex gap-5 flex-wrap justify-center transition-opacity duration-200 ${fetchingRegistrosDonacion ? 'opacity-60 pointer-events-none' : ''
          }`}
      >
        {registrosDonacion.length === 0 ? (
          <div className="text-center py-8 w-full">
            <p className="text-muted-foreground">No hay donaciones para mostrar</p>
          </div>
        ) : (
          registrosDonacion.map((registro) => (
            <CardPreviewRegistro
              key={registro.id}
              registro={registro}
              clickAction={() => verRegistro(registro.id)}
            />
          ))
        )}
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={prevPage}
              disabled={page === 1}
            />
          </PaginationItem>

          {pageRange.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                onClick={() => setPage(pageNumber)}
                isActive={page === pageNumber}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          ))}

          {totalPages > maxVisiblePages && pageRange[pageRange.length - 1] < totalPages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={nextPage}
              disabled={isLastPage || isPlaceholderData}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </section>
  )
}