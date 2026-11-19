import type { SolicitudDonacionPreview } from '@/modules/donaciones/models/solicitudDonacion';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import type { CellContext, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { useCallback, useState } from 'react'
import DataTable from '@/components/DataTable';
import { useDonacionRealtime } from '@/hooks/useDonacionRealtime';
import { useGetEstadosSolicitudesDonacion } from '@/modules/donaciones/hooks/solicitudesDonacion/solicitudesDonacionHook';
import { useSolicitudesDonacionFiltradas } from '@/modules/donaciones/hooks/solicitudesDonacion/usePreviewSolicitudAMostrar';
import WebLoader from '@/components/Loader';
import SelectFiltrosTablas from '@/components/SelectFiltrosTablas';
import { useReadState } from '@/modules/donaciones/store/donacionesStore';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/donaciones/solicitudes/')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Donaciones.Solicitud Donaciones:Ver'
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { isRead, markAsRead } = useReadState();
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const [estadoId, setEstadoId] = useState<number | undefined>(undefined);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshTable = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['solicitudesDonacion'] });
  }, [queryClient]);

  const { loadingEstadosSolicitudesDonacion, fetchingEstadosSolicitudesDonacion, estadosSolicitudesDonacion = [] } = useGetEstadosSolicitudesDonacion();
  const { data: mostrarDatos, total: mostrarTotal } = useSolicitudesDonacionFiltradas(estadoId, pageIndex + 1, pageSize);

  useDonacionRealtime({
    initialCount: pendingCount,
    setCount: setPendingCount,
    refreshTable,
    notify: () => { }, // Notifications are handled globally by useSolicitudesSocket
  });

  const toolbar =
    estadosSolicitudesDonacion.length > 1 ? (
      <SelectFiltrosTablas
        placeholder="Filtrar por estado"
        opciones={estadosSolicitudesDonacion}
        includeTodasOption={true}
        value={estadoId?.toString() ?? "0"}
        onClickAction={(id) => {
          const parsed = Number(id);
          setEstadoId(parsed === 0 ? undefined : parsed);
          setPageIndex(0);
        }}
      />
    ) : null;

  const columns: ColumnDef<SolicitudDonacionPreview>[] = [
    { header: "Fecha", accessorKey: "creadoEn" },
    {
      header: "Nombre del donante",
      accessorKey: "nombre",
      cell: ({ row }) => {
        const { nombre, apellido1, apellido2 } = row.original;
        return `${nombre} ${apellido1} ${apellido2}`;
      },
    },
    {
      header: "Tipo de donación",
      accessorKey: "tipoDonacion",
    },
    {
      header: "Estado",
      accessorKey: "estado",
      cell: (props: CellContext<SolicitudDonacionPreview, unknown>) => {
        const estado = (props.getValue() as string)?.toLowerCase();
        const estadoRender = (props.getValue() as string)
        const variant =
          estado === "pendiente"
            ? "pending"
            : estado === "aprobada"
              ? "accepted"
              : estado === "rechazada"
                ? "denied"
                : "outline";

        return <Badge variant={variant}>{estadoRender}</Badge>;
      },
    },
  ];

  const verSolicitud = (row: SolicitudDonacionPreview) => {
    const idNum = Number(row.id);

    navigate({
      to: "/donaciones/solicitudes/$id",
      params: { id: idNum },
    });
  };

  if (loadingEstadosSolicitudesDonacion || fetchingEstadosSolicitudesDonacion) {
    return <><WebLoader /></>
  }

  return (
    <div className="px-2 pb-4 w-full overflow-x-auto">
      <div className="min-w-full">
        <DataTable
          columns={columns}
          data={mostrarDatos}
          total={mostrarTotal}
          pageIndex={pageIndex}
          pageSize={pageSize}
          setPageIndex={setPageIndex}
          setPageSize={setPageSize}
          action={verSolicitud}
          isRowRead={(row) => row.id != null && isRead(Number(row.id))}
          onRowClick={(row) => {
            if (row.id != null) markAsRead(Number(row.id));
          }}
          toolbar={toolbar}
        />
      </div>
    </div>
  );
};
