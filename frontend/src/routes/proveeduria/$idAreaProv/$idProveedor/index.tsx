import FormCrearFactura from '@/modules/proveeduria/components/FormCrearFactura';
import TablaFacturas from '@/modules/proveeduria/components/TablaFacturas';
import { createFileRoute, redirect, useParams } from '@tanstack/react-router'
import { useGetProveedores } from '@/modules/proveeduria/hooks/proveedoresHooks';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import IfPerm from '@/components/auth/IfPerm';
import { useMemo } from 'react';

export const Route = createFileRoute('/proveeduria/$idAreaProv/$idProveedor/')({
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
  const { idAreaProv } = useParams({ from: "/proveeduria/$idAreaProv/$idProveedor/" });
  const { idProveedor } = useParams({ from: "/proveeduria/$idAreaProv/$idProveedor/" });
  const { Proveedores, loadingProveedores } = useGetProveedores(idAreaProv);

  const proveedorActual = useMemo(
    () => Proveedores?.find((proveedor) => String(proveedor.id_proveedor) === String(idProveedor)),
    [Proveedores, idProveedor]
  );

  return <section className='lg:ml-3 lg:mr-3'>
    <nav className='flex justify-between items-center mt-3'>
      <h1>
        Facturas de {loadingProveedores ? "cargando…" : proveedorActual?.nombre ?? "proveedor no encontrado"}
      </h1>
      <IfPerm perm="Proveduría.General Proveduría:Crear">
        <FormCrearFactura />
      </IfPerm>
    </nav>
    <main >
      <TablaFacturas idProveedor={idProveedor} />
    </main>
  </section>
}
