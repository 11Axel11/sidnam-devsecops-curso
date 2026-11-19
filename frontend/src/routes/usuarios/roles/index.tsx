import IfPerm from '@/components/auth/IfPerm';
import DataTable from '@/components/DataTable';
import WebLoader from '@/components/Loader';
import { Badge } from '@/components/ui/badge';
import FormCrearRol from '@/modules/gestionPermisos/roles/components/FormCrearRol';
import { useGetAllRoles } from '@/modules/gestionPermisos/roles/hooks/rolesHooks';
import type { Rol } from '@/modules/gestionPermisos/roles/models/roles';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import type { CellContext, ColumnDef } from '@tanstack/react-table';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

export const Route = createFileRoute('/usuarios/roles/')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Seguridad.Usuarios:Ver',
      'Seguridad.Roles:Ver'
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { Roles, loadingRoles } = useGetAllRoles();
  const navigate = useNavigate()
  const rows = useMemo(() => Roles ?? [], [Roles]);

  const verRol = (row: Rol) => {
    const idNum = String(row.id_rol);

    navigate({
      to: "/usuarios/roles/$rolId",
      params: { rolId: idNum },
    });
  };
  const columns: ColumnDef<Rol>[] = [
    {
      header: "Nombre del rol",
      accessorKey: "nombre",
    },
    { header: "Descripción", accessorKey: "descripcion" },
    {
      header: "Estado",
      accessorKey: "estado",
      cell: (props: CellContext<Rol, unknown>) => {
        const estado = props.getValue()
        const estadoRender = estado === true ? "Activo" : "Inactivo"
        const variant =
          estado === true
            ? "accepted"
            : "outline";

        return <Badge variant={variant}>{estadoRender}</Badge>;
      },
    },
  ];


  if (loadingRoles) {
    return <WebLoader />
  }

  return <section>
    <header className='lg:m-5 flex justify-between gap-4'>
      <nav className='flex justify-between gap-2 items-center'>
        <Link to={"/usuarios"}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className='font-semibold text-lg'>Gestionar roles del sistema</h1>
      </nav>
      <IfPerm perm="Seguridad.Roles:Crear">
        <FormCrearRol />
      </IfPerm>
    </header>
    <main className='ml-4 mr-4'>
      {Roles &&
        <DataTable
          columns={columns}
          data={rows}
          action={verRol}
        />
      }
      {!Roles && (
        <p className='text-muted'>No hay roles registrados.</p>
      )}
    </main>
  </section>
}
