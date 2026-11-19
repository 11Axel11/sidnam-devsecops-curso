import { useEffect, useState } from "react";
import FiltrosProveeduria from '@/modules/proveeduria/components/FiltrosProveeduria'
import TablaFacturas from '@/modules/proveeduria/components/TablaFacturas'
import { useGetEstadosFacturas, useGetFacturas } from '@/modules/proveeduria/hooks/proveedoresHooks'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import SelectFiltrosTablas from "@/components/SelectFiltrosTablas";
import WebLoader from "@/components/Loader";
import AsociarFacturaPorProveedor from "@/modules/proveeduria/components/AsociarFacturaPorProveedor";
import { DescargarReporteMesEstado } from "@/modules/proveeduria/components/DescargarReporteMesEstado";
import { ensurePerms, makeCan } from "@/services/authHelpers";
import IfPerm from "@/components/auth/IfPerm";
import SedeToggle from "@/components/SedeToggle";
import { PERM_FACTURAS_CREAR } from "@/modules/inventarios/permissions";
import type { Sede } from "@/store/sedeStore";

type SedeFiltro = Sede | 'ambas';

export const Route = createFileRoute('/facturacion/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): { sede?: SedeFiltro } => ({
    sede: search.sede === 'hogar' || search.sede === 'cecuidam' || search.sede === 'ambas' ? search.sede : undefined,
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Proveduría.Facturas Proveduría:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const { sede: sedeUrl } = Route.useSearch();
  // El filtro de sede es obligatorio (RN-05); por defecto "hogar". Los permisos no dependen de la sede.
  const sede: SedeFiltro = sedeUrl ?? 'hogar';

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [estadoId, setEstadoId] = useState<number>(0);

  useEffect(() => { setPageIndex(0); }, [sede]);

  const { estadoFactura, loadingEstadosFactura } = useGetEstadosFacturas();

  const {
    Facturas,
    totalFacturas,
    fetchingFacturas,
    errorFacturas,
  } = useGetFacturas(pageIndex + 1, pageSize, estadoId, sede === 'ambas' ? undefined : sede);

  if (loadingEstadosFactura) return <WebLoader />;

  const opcionesSede: SedeFiltro[] = ['hogar', 'cecuidam', 'ambas'];

  const toolbar = (
    <SelectFiltrosTablas
      placeholder="Filtrar por estado"
      opciones={estadoFactura ?? []}
      includeTodasOption={true}
      value={String(estadoId ?? 0)}
      onClickAction={(id) => {
        const parsed = Number(id);
        setEstadoId(Number.isFinite(parsed) ? parsed : 0);
        setPageIndex(0);
      }}
    />
  );

  return (
    <section className="lg:ml-3 lg:mr-3">
      <nav className="flex justify-between items-center mt-3">
        <h1 className="font-semibold">Historial de facturas registradas</h1>
        <div className="flex gap-4">
          <FiltrosProveeduria />
          <DescargarReporteMesEstado />
          <IfPerm perm={PERM_FACTURAS_CREAR}>
            <AsociarFacturaPorProveedor sede={sede === 'ambas' ? undefined : sede} />
          </IfPerm>
        </div>
      </nav>

      <div className="my-3 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Sede:</span>
        <SedeToggle
          opciones={opcionesSede}
          value={sede}
          onChange={(v) => navigate({ to: '/facturacion', search: { sede: v }, replace: true })}
        />
        {fetchingFacturas && <span className="text-sm opacity-70">Actualizando…</span>}
      </div>

      {errorFacturas && <p className="text-red-500">Error al cargar facturas.</p>}

      <main>
        <TablaFacturas
          facturas={Facturas}
          totalOverride={totalFacturas}
          pageIndexExternal={pageIndex}
          pageSizeExternal={pageSize}
          onPageIndexChange={setPageIndex}
          onPageSizeChange={setPageSize}
          toolbar={toolbar}
          mostrarSedeProveedor
        />
      </main>
    </section>
  );
}
