import DataTable from "@/components/DataTable";
import WebLoader from "@/components/Loader";
import SelectFiltrosTablas from "@/components/SelectFiltrosTablas";
import { Badge } from "@/components/ui/badge";
import { useVoluntariadoRealtime } from "@/hooks/useVoluntariadoRealtime";
import { useReadState } from "@/modules/donaciones/store/donacionesStore";
import { useGetEstadosSolicitudesVoluntario } from "@/modules/voluntariado/hooks/solicitudesVoluntariado/solicitudesHooks";
import { useSolicitudesVoluntariadoFiltradas } from "@/modules/voluntariado/hooks/solicitudesVoluntariado/usePreviewSolicitudAMostrar";
import type { SolicitudVoluntariadoPreview } from "@/modules/voluntariado/models/solicitudVoluntario";
import { ensurePerms, makeCan } from "@/services/authHelpers";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import type { CellContext, ColumnDef } from "@tanstack/react-table";
import { useCallback, useState } from "react";

export const Route = createFileRoute("/voluntarios/solicitudes/")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Voluntariado.Solicitudes Voluntariado:Ver',
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
    void queryClient.invalidateQueries({ queryKey: ["solicitudesVoluntario"] });
  }, [queryClient]);

  const { loadingEstadosSolicitudesVoluntariado, fetchingEstadosSolicitudesVoluntariado, estadosSolicitudesVoluntariado = [] } = useGetEstadosSolicitudesVoluntario();
  const { data: mostrarDatos, total: mostrarTotal } = useSolicitudesVoluntariadoFiltradas(estadoId, pageIndex + 1, pageSize);

  useVoluntariadoRealtime({
    initialCount: pendingCount,
    setCount: setPendingCount,
    refreshTable,
    notify: () => {}, // Notifications are handled globally by useSolicitudesSocket
  });

  const toolbar =
    estadosSolicitudesVoluntariado.length > 1 ? (
      <SelectFiltrosTablas
        placeholder="Filtrar por estado"
        opciones={estadosSolicitudesVoluntariado}
        includeTodasOption={true}
        value={estadoId?.toString() ?? "0"}
        onClickAction={(id) => {
          const parsed = Number(id);
          setEstadoId(parsed === 0 ? undefined : parsed);
          setPageIndex(0);
        }}
      />
    ) : null;

  const columns: ColumnDef<SolicitudVoluntariadoPreview>[] = [
    { header: "Fecha", accessorKey: "creadoEn" },
    {
      header: "Nombre del solicitante",
      accessorKey: "nombre",
      cell: ({ row }) => {
        const { nombre, apellido1, apellido2 } = row.original;
        return `${nombre} ${apellido1} ${apellido2}`;
      },
    },
    {
      header: "Estado",
      accessorKey: "estado",
      cell: (props: CellContext<SolicitudVoluntariadoPreview, unknown>) => {
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

  const verSolicitud = (row: SolicitudVoluntariadoPreview) => {
    const idNum = Number(row.id);

    navigate({
      to: "/voluntarios/solicitudes/$id",
      params: { id: idNum },
    });
  };

  if (loadingEstadosSolicitudesVoluntariado || fetchingEstadosSolicitudesVoluntariado) {
    return <><WebLoader /></>
  }

  return (
    <div className="m-5">
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
  );
}
