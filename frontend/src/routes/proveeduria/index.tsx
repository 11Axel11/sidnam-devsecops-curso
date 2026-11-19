
import IfPerm from '@/components/auth/IfPerm';
import { SmartPagination } from '@/components/PaginationComponent';
import CardAreaProveedor from '@/modules/proveeduria/components/CardAreaProveedor';
import FiltrosProveeduria from '@/modules/proveeduria/components/FiltrosProveeduria';
import FormCrearArea from '@/modules/proveeduria/components/FormCrearArea'
import { useGetAreasProveedores } from '@/modules/proveeduria/hooks/proveedoresHooks';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react';

export const Route = createFileRoute('/proveeduria/')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Proveduría.General Proveduría:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
});

function RouteComponent() {
  const limit = 9;
  const [page, setPage] = useState(1);

  const { AreasProveedores, totalAreasProveedores, isPlaceholderData } = useGetAreasProveedores(page, limit);
  const navigate = useNavigate();

  const gotoArea = (id: string) => {
    navigate({ to: "/proveeduria/$idAreaProv", params: { idAreaProv: id } });
  }

  const totalPages = Math.ceil(totalAreasProveedores / limit);

  const handlePageChange = (newPage: number) => {
    if (isPlaceholderData) return;
    setPage(newPage);
  };

  return <section className='lg:ml-3 lg:mr-3 '>
    <nav className='flex lg:mt-3 justify-between items-center'>
      <h1 className='text-md font-semibold'>Áreas de proveeduría</h1>
      <div className='flex gap-4'>
        <FiltrosProveeduria />
        <IfPerm perm="Proveduría.General Proveduría:Crear">
          <FormCrearArea />
        </IfPerm>
      </div>
    </nav>

    <main className='mt-5'>
      <div className=' flex gap-4 justify-between flex-wrap'>
        {AreasProveedores && AreasProveedores.length === 0 && (
          <p className="text-center mt-5 text-gray-500">
            No hay áreas de proveeduría registradas.
            Usa "Agregar área" para registrar una nueva.
          </p>
        )}
        {AreasProveedores?.map(area => (
          <CardAreaProveedor key={area.id_area} area={area} clickAction={gotoArea} />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <SmartPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          maxVisiblePages={4}
          isLoading={isPlaceholderData}
          className="mt-6" />
      </div>
    </main>
  </section>
}
