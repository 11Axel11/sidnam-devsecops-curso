import { useMemo, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import AuditoriaRegistro from "@/components/app/clinico/AuditoriaRegistro";
import CeldaSerie from "@/components/app/clinico/CeldaSerie";
import EstadoValoracionBadge from "@/components/app/clinico/EstadoValoracionBadge";
import { formatearFechaClinica } from "@/components/app/clinico/fechaClinica";
import FechaConAnulacion from "@/components/app/clinico/FechaConAnulacion";
import { formatearNumeroClinico } from "@/components/app/clinico/formatoNumero";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";
import { conAnchos } from "@/components/app/clinico/serie";
import DataTable from "@/components/DataTable";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { mensajeError } from "@/utils/apiError";
import { useControlesNutricionales } from "../hooks/controlNutricionalHooks";
import { useEvaluacionesMna } from "../hooks/mnaHooks";
import { useValoracionNutricionalVigente } from "../hooks/valoracionNutricionalHooks";
import type { ControlNutricionalFila } from "../models/controlNutricional";
import type { EvaluacionMna } from "../models/mna";
import { formatearMedida, formatearVariacion } from "../utils/controlNutricionalForm";

type Props = { expedienteId: number };

const MAX_CRIBAJE = 14;
const MAX_GLOBAL = 30;

const ANCHOS_CONTROL: Record<string, string> = {
  fecha: "min-w-[170px]", interpretacion: "min-w-[220px]",
};
const ANCHOS_MNA: Record<string, string> = {
  fecha: "min-w-[170px]", cribaje: "min-w-[110px]", global: "min-w-[110px]", interpretacionGlobal: "min-w-[200px]",
};

const sobre = (n: number | null, max: number) => (n === null ? "—" : `${formatearNumeroClinico(n)} / ${max}`);

// Bloque de la pantalla: título + su propio estado (cargando, error con «Reintentar», vacío o contenido), de
// modo que un fallo en una consulta no afecta a las demás.
function Bloque({ titulo, cargando, error, onReintentar, accion, children }: {
  titulo: string;
  cargando: boolean;
  error: unknown;
  onReintentar: () => void;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3" aria-label={titulo}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{titulo}</h3>
        {accion}
      </div>
      {cargando ? (
        <WebLoader />
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <span>{mensajeError(error, `No se pudo cargar: ${titulo.toLowerCase()}.`)}</span>
          <Button type="button" size="sm" variant="outline" onClick={onReintentar}>Reintentar</Button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function InterruptorAnulados({ id, valor, onCambio }: { id: string; valor: boolean; onCambio: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={valor} onCheckedChange={onCambio} />
      <Label htmlFor={id} className="cursor-pointer">Mostrar anulados</Label>
    </div>
  );
}

// «Historial» de Nutrición (RF-NU-08, CA-21): la valoración vigente, los controles y las evaluaciones MNA en
// una sola pantalla, solo lectura. Se consulta aunque el expediente esté inactivo. Todo lo que se muestra lo
// calculó el backend.
export default function HistorialNutricionPage({ expedienteId }: Props) {
  const [anuladosControles, setAnuladosControles] = useState(false);
  const [anuladosMna, setAnuladosMna] = useState(false);

  const vigente = useValoracionNutricionalVigente(expedienteId);
  const controles = useControlesNutricionales(expedienteId, { incluirAnulados: anuladosControles });
  const mna = useEvaluacionesMna(expedienteId, { incluirAnulados: anuladosMna });

  const columnasControl = useMemo<ColumnDef<ControlNutricionalFila>[]>(() => conAnchos([
    {
      header: "Fecha", id: "fecha",
      cell: ({ row: { original: c } }) => (
        <div className="space-y-1"><FechaConAnulacion registro={c} /><AuditoriaRegistro registro={c} compacta /></div>
      ),
    },
    { header: "Peso (kg)", id: "peso", cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.peso)}</CeldaSerie> },
    { header: "Talla (cm)", id: "talla", cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.talla)}</CeldaSerie> },
    { header: "IMC (kg/m²)", id: "imc", cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.imc)}</CeldaSerie> },
    { header: "Var. peso (kg)", id: "variacionPeso", cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearVariacion(c.variacionPeso)}</CeldaSerie> },
    { header: "Var. IMC", id: "variacionImc", cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearVariacion(c.variacionImc)}</CeldaSerie> },
    {
      header: "Interpretación", id: "interpretacion",
      cell: ({ row: { original: c } }) => (
        <span className={cn("block min-w-[160px] max-w-xs whitespace-pre-wrap break-words text-left", c.anulado && "text-muted-foreground")}>
          {c.interpretacion?.trim() ? c.interpretacion : "—"}
        </span>
      ),
    },
  ], ANCHOS_CONTROL), []);

  const columnasMna = useMemo<ColumnDef<EvaluacionMna>[]>(() => conAnchos([
    {
      header: "Fecha", id: "fecha",
      cell: ({ row: { original: e } }) => (
        <div className="space-y-1"><FechaConAnulacion registro={e} /><AuditoriaRegistro registro={e} compacta /></div>
      ),
    },
    { header: "Subtotal de cribaje", id: "cribaje", cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{sobre(e.subtotalCribaje, MAX_CRIBAJE)}</CeldaSerie> },
    { header: "Evaluación global", id: "global", cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{sobre(e.evaluacionGlobal, MAX_GLOBAL)}</CeldaSerie> },
    {
      header: "Interpretación global", id: "interpretacionGlobal",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado} className="whitespace-normal">{e.interpretacionGlobal ?? "—"}</CeldaSerie>,
    },
  ], ANCHOS_MNA), []);

  const v = vigente.data;

  return (
    <div className="space-y-8">
      <Bloque
        titulo="Valoración nutricional vigente"
        cargando={vigente.isLoading}
        error={vigente.error}
        onReintentar={() => void vigente.refetch()}
      >
        {v ? (
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border p-4">
            <div className="space-y-1 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{formatearFechaClinica(v.fecha)}</span>
                <EstadoValoracionBadge estado={v.estado} anulado={v.anulado} />
              </p>
              <p className="text-muted-foreground">
                Responsable: <ResponsableValoracion id={v.usuarioResponsableId} nombre={v.usuarioResponsableNombre} />
              </p>
              <div className="text-xs text-muted-foreground"><AuditoriaRegistro registro={v} /></div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/residentes/$id/nutricion/valoracion" params={{ id: expedienteId }} search={{ valoracion: v.id }}>
                Ver valoración
              </Link>
            </Button>
          </div>
        ) : (
          <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">Sin valoración vigente</p>
        )}
      </Bloque>

      <Bloque
        titulo="Controles nutricionales"
        cargando={controles.isLoading}
        error={controles.error}
        onReintentar={() => void controles.refetch()}
        accion={<InterruptorAnulados id="historial-anulados-controles" valor={anuladosControles} onCambio={setAnuladosControles} />}
      >
        <DataTable columns={columnasControl} data={controles.data ?? []} emptyMessage="Sin controles registrados" />
      </Bloque>

      <Bloque
        titulo="Evaluaciones MNA"
        cargando={mna.isLoading}
        error={mna.error}
        onReintentar={() => void mna.refetch()}
        accion={<InterruptorAnulados id="historial-anulados-mna" valor={anuladosMna} onCambio={setAnuladosMna} />}
      >
        <DataTable columns={columnasMna} data={mna.data ?? []} emptyMessage="Sin evaluaciones registradas" />
      </Bloque>
    </div>
  );
}
