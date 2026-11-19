import WebLoader from '@/components/Loader';
import { SmartPagination } from '@/components/PaginationComponent';
import { Button } from '@/components/ui/button';
import CardPreviewExpedienteResidente from '@/modules/residentes/components/CardPreviewExpedienteResidente';
import { useGetPreviewExpedientesResidente } from '@/modules/residentes/hooks/expedientesHooks';
import type { PreviewExpedienteResidente } from '@/modules/residentes/models/expedienteResidente';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react';
import { File } from 'lucide-react';
import { useExpedienteSearch } from '@/modules/residentes/hooks/useSearchExpediente';
import BuscarExpedienteDialog from '@/modules/residentes/components/SearchExpedietes';
import VerEDUS from '@/modules/residentes/components/VerEDUS';

export const Route = createFileRoute('/residentes/historial')({
  component: RouteComponent,
    beforeLoad: async ({ context, location }) => {
      const perms = await ensurePerms(context.queryClient)
      const { canAny } = makeCan(perms)
      const ok = canAny([
        'Residencia.General Expedientes:Ver',
      ])
      if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
    },
})

function RouteComponent() {
  const limit = 8;
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const { expedientesResidentes, totalExpedientesResidentes, isPlaceholderData, loadingExpedientesResidentes } =
    useGetPreviewExpedientesResidente(2, page, limit);

  const {
    searchMode,
    searchTerm,
    isTyping,
    results: searchResults,
    isSearchLoading,
  } = useExpedienteSearch({ enabled: true, initialMode: 'cedula' });

  const verExpediente = (id: number) => {
    navigate({ to: "/residentes/$id", params: { id: Number(id) } });
  };

  const gotoResidentes = () => navigate({ to: "/residentes" });

  const totalPages = Math.ceil(totalExpedientesResidentes / limit);
  const handlePageChange = (newPage: number) => {
    if (isPlaceholderData) return;
    setPage(newPage);
  };

  if (loadingExpedientesResidentes) return <WebLoader />;

  const showingSearch = searchTerm.trim() !== '';

  return (
    <section>
      <nav className='lg:m-5 flex justify-between gap-4'>
        <BuscarExpedienteDialog onSelect={(id) => verExpediente(id)} />

        <div className='flex items-center gap-3'>
          <VerEDUS />
          <Button variant="read" onClick={gotoResidentes}>
            <File/>
            Ver todos
          </Button>
        </div>
      </nav>

      {showingSearch ? (
        <div className="mt-3">
          {isTyping || isSearchLoading ? (
            <WebLoader />
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 w-full">
              <p className="text-muted-foreground">
                No se encontraron expedientes en historial con ese {searchMode === 'cedula' ? 'número de cédula' : 'nombre'}.
              </p>
            </div>
          ) : (
            <div className="flex gap-5 flex-wrap justify-center mt-3 mb-3">
              {searchResults.map((expediente: PreviewExpedienteResidente) => (
                <CardPreviewExpedienteResidente
                  key={expediente.id_expediente}
                  expediente={expediente}
                  clickAction={() => verExpediente(expediente.id_expediente)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-5 flex-wrap justify-center mt-3 mb-3">
            {expedientesResidentes.length === 0 ? (
              <div className="text-center py-8 w-full">
                <p className="text-muted-foreground">No hay expedientes aun.</p>
              </div>
            ) : (
              expedientesResidentes.map((expediente: PreviewExpedienteResidente) => (
                <CardPreviewExpedienteResidente
                  key={expediente.id_expediente}
                  expediente={expediente}
                  clickAction={() => verExpediente(expediente.id_expediente)}
                />
              ))
            )}
          </div>

          <SmartPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            maxVisiblePages={4}
            isLoading={isPlaceholderData}
            className="mt-6"
          />
        </>
      )}
    </section>
  );
}
