import { Button } from '@/components/ui/button'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { FileClock, Plus } from 'lucide-react';
import CardPreviewExpedienteResidente from '@/modules/residentes/components/CardPreviewExpedienteResidente';
import { useGetPreviewExpedientesResidente } from '@/modules/residentes/hooks/expedientesHooks';
import { useState } from 'react';
import { SmartPagination } from '@/components/PaginationComponent';
import VerEDUS from '@/modules/residentes/components/VerEDUS';
import type { PreviewExpedienteResidente } from '@/modules/residentes/models/expedienteResidente';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import IfPerm from '@/components/auth/IfPerm';
import BuscarExpedienteDialog from '@/modules/residentes/components/SearchExpedietes';

export const Route = createFileRoute('/residentes/')({
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
  const { expedientesResidentes, totalExpedientesResidentes, isPlaceholderData } = useGetPreviewExpedientesResidente(1, page, limit)

  const gotoCrearResidente = () => {
    navigate({ to: "/residentes/crear" });
  };

  const gotoHistorialResidentes = () => {
    navigate({ to: "/residentes/historial" });
  };

  const verExpediente = (id: number) => {
    const idNum = Number(id);
    navigate({
      to: "/residentes/$id",
      params: { id: idNum },
    });
  };


  const totalPages = Math.ceil(totalExpedientesResidentes / limit);

  const handlePageChange = (newPage: number) => {
    if (isPlaceholderData) return;
    setPage(newPage);
  };

  return <section className="px-2 pb-4">
    <nav className='flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center'>
      <BuscarExpedienteDialog onSelect={(id) => verExpediente(id)} />

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <VerEDUS />
        <Button className="w-full sm:w-auto" variant={"read"} onClick={gotoHistorialResidentes}>
          <FileClock />Ver historial
        </Button>
        <IfPerm perm="Residencia.General Expedientes:Crear">
          <Button className="w-full sm:w-auto" variant={"create"} onClick={gotoCrearResidente}>
            <Plus /> Crear expediente
          </Button>
        </IfPerm>
      </div>
    </nav>

    <div className="flex gap-5 flex-wrap justify-center mt-4 mb-4">
      {expedientesResidentes.length == 0 ? (
        <div className="text-center py-8 w-full">
          <p className="text-center text-gray-500">
            {'No hay expedientes aun. '}
          </p>
        </div>
      ) : expedientesResidentes.map((expediente: PreviewExpedienteResidente) => (
        <CardPreviewExpedienteResidente
          key={expediente.id_expediente}
          expediente={expediente}
          clickAction={() => verExpediente(expediente.id_expediente)}
        />
      ))}
    </div>

    <SmartPagination
      currentPage={page}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      maxVisiblePages={4}
      isLoading={isPlaceholderData}
      className="mt-4"
    />
  </section>
}