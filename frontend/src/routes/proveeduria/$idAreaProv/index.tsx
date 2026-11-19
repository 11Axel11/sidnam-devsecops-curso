import IfPerm from '@/components/auth/IfPerm';
import FiltrosProveeduria from '@/modules/proveeduria/components/FiltrosProveeduria';
import FormCrearProveedor from '@/modules/proveeduria/components/FormCrearProveedor';
import TablaProveedores from '@/modules/proveeduria/components/TablaProveedores';
import { useGetAreaById, useGetProveedores } from '@/modules/proveeduria/hooks/proveedoresHooks';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, redirect, useParams } from '@tanstack/react-router';

export const Route = createFileRoute('/proveeduria/$idAreaProv/')({
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
  const { idAreaProv } = useParams({ from: "/proveeduria/$idAreaProv/" });

  const { Area, loadingAreas } = useGetAreaById(idAreaProv)
  const {
    errorProveedores,
  } = useGetProveedores(idAreaProv);


  return (
    <section className='lg:ml-3 lg:mr-3'>
      <nav className='flex justify-between items-center mt-3'>
        <div className='w-50'>
          <h1 className='text-md font-semibold break-words line-clamp-2'>
            Proveedores de{" "}
            {loadingAreas
              ? "cargando…"
              : `${Area?.nombre}`}
          </h1>
        </div>
        <div className='flex gap-4'>
          <FiltrosProveeduria />
          <IfPerm perm="Proveduría.General Proveduría:Crear">
            <FormCrearProveedor />
          </IfPerm>
        </div>
      </nav>

      {errorProveedores && (
        <p className="text-red-700 mt-2">
          No se pudo cargar la información del área.
        </p>
      )}

      <main className='mt-6'>
        <TablaProveedores idArea={idAreaProv} />
      </main>
    </section>
  );
}
