import IfPerm from '@/components/auth/IfPerm';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { capitalize } from '@/lib/pathNameMap';
import FormCrearUsuario from '@/modules/gestionPermisos/usuarios/components/FormCrearUsuario';
import { useGetUsuarios } from '@/modules/gestionPermisos/usuarios/hooks/usuariosHooks';
import type { Usuario } from '@/modules/gestionPermisos/usuarios/models/user';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import type { CellContext, ColumnDef } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/usuarios/')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
      const perms = await ensurePerms(context.queryClient)
      const { canAny } = makeCan(perms)
      const ok = canAny([
        'Seguridad.Usuarios:Ver',
      ])
      if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const [estado, setEstado] = useState<number>(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const { Usuarios, totalUsuarios } = useGetUsuarios(estado, pageIndex + 1, pageSize)
  const navigate = useNavigate();

  const gotoGestionRoles = () => {
    navigate({ to: "/usuarios/roles" });
  };
  
  const verUsuario = (row: Usuario) => {
    const idNum = String(row.cedula);
  
    navigate({
      to: "/usuarios/$cedula",
      params: { cedula: idNum },
    });
  };

  const columns: ColumnDef<Usuario>[] = [
    { header: "Cédula", accessorKey: "cedula" },
    {
      header: "Nombre completo",
      accessorKey: "name",
      cell: ({ row }) => {
        const { name, apellido1, apellido2 } = row.original;
        return `${name} ${apellido1} ${apellido2}`;
      },
    },
    { header: "Correo electrónico", accessorKey: "email" },
    { header: "Rol", accessorKey: "rol.nombre" },
    {
      header: "Estado",
      accessorKey: "estado",
      cell: (props: CellContext<Usuario, unknown>) => {
        const estado = (props.getValue() as string)?.toLowerCase();
        const estadoRender = capitalize((props.getValue() as string))
        const variant =
          estado === "activo"
            ? "accepted"
            : "outline";

        return <Badge variant={variant}>{estadoRender}</Badge>;
      },
    },
  ]; 
  const toolbar = (
    <div className="flex items-center gap-2">
      <Select
        value={String(estado)}
        onValueChange={(v) => {
          setEstado(Number(v));
          setPageIndex(0);
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Filtrar por estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Activo</SelectItem>
          <SelectItem value="2">Inactivo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );


  return <section className='lg:m-5 '>
    <header className='flex justify-between gap-4'>
      <h1 className='font-semibold text-lg'>Usuarios del sistema</h1>
      <nav className='flex justify-between gap-4'>
        <IfPerm perm="Seguridad.Roles:Ver">
          <Button variant={'read'} onClick={gotoGestionRoles}>
            <Settings2 />Gestionar roles
          </Button>
        </IfPerm>
        <IfPerm perm="Seguridad.Usuarios:Crear">
          <FormCrearUsuario />
        </IfPerm>
      </nav>
    </header>
    <main className='ml-4 mr-4'>
      <DataTable
        columns={columns}
        data={Usuarios}
        total={totalUsuarios}
        pageIndex={pageIndex}
        pageSize={pageSize}
        setPageIndex={setPageIndex}
        setPageSize={setPageSize}
        toolbar={toolbar}
        action={verUsuario}
      />
    </main>
  </section>
}
