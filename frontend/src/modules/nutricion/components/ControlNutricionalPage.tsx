import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import AvisoSinEdicion from "@/components/app/clinico/AvisoSinEdicion";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import CeldaSerie from "@/components/app/clinico/CeldaSerie";
import { formatearFechaClinica } from "@/components/app/clinico/fechaClinica";
import AuditoriaRegistro from "@/components/app/clinico/AuditoriaRegistro";
import FechaConAnulacion from "@/components/app/clinico/FechaConAnulacion";
import FiltrosSerie from "@/components/app/clinico/FiltrosSerie";
import { conAnchos, rangoInvertido as esRangoInvertido } from "@/components/app/clinico/serie";
import IfPerm from "@/components/auth/IfPerm";
import DataTable from "@/components/DataTable";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { PERM } from "@/lib/permisosClinicos";
import { cn } from "@/lib/utils";
import { mensajeError } from "@/utils/apiError";
import { useControlesNutricionales } from "../hooks/controlNutricionalHooks";
import type { ControlNutricionalFila } from "../models/controlNutricional";
import { formatearMedida, formatearVariacion } from "../utils/controlNutricionalForm";
import AnularControlNutricionalDialogo from "./AnularControlNutricionalDialogo";
import ControlNutricionalDialogo from "./ControlNutricionalDialogo";

type Props = { expedienteId: number };

const ANCHOS: Record<string, string> = {
  fecha: "min-w-[140px]", interpretacion: "min-w-[220px]", alturaRodilla: "min-w-[130px]",
  fuerzaMuscular: "min-w-[130px]", acciones: "min-w-[72px]",
};

export default function ControlNutricionalPage({ expedienteId }: Props) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [incluirAnulados, setIncluirAnulados] = useState(false);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [anularId, setAnularId] = useState<number | null>(null);

  const rangoInvertido = esRangoInvertido(desde, hasta);
  const hayFiltro = !!desde || !!hasta;
  const serie = useControlesNutricionales(
    expedienteId,
    { desde: desde || undefined, hasta: hasta || undefined, incluirAnulados },
    !rangoInvertido,
  );

  const columns = useMemo<ColumnDef<ControlNutricionalFila>[]>(() => conAnchos([
    {
      header: "Fecha",
      id: "fecha",
      cell: ({ row: { original: c } }) => (
        <div className="space-y-1">
          <FechaConAnulacion registro={c} />
          <AuditoriaRegistro registro={c} compacta />
        </div>
      ),
    },
    { header: "Edad (años)", id: "edad", cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{c.edadMomentoControl}</CeldaSerie> },
    { header: "Peso (kg)", id: "peso", cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.peso)}</CeldaSerie> },
    { header: "Talla (cm)", id: "talla", cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.talla)}</CeldaSerie> },
    { header: "IMC (kg/m²)", id: "imc", cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.imc)}</CeldaSerie> },
    {
      header: "Var. peso (kg)",
      id: "variacionPeso",
      cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearVariacion(c.variacionPeso)}</CeldaSerie>,
    },
    {
      header: "Var. IMC",
      id: "variacionImc",
      cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearVariacion(c.variacionImc)}</CeldaSerie>,
    },
    {
      header: () => <span title="Circunferencia braquial">CB (cm)</span>,
      id: "cb",
      cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.circunferenciaBraquial)}</CeldaSerie>,
    },
    {
      header: () => <span title="Circunferencia de la pantorrilla">CP (cm)</span>,
      id: "cp",
      cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.circunferenciaPantorrilla)}</CeldaSerie>,
    },
    {
      header: "Altura de la rodilla (cm)",
      id: "alturaRodilla",
      cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.alturaRodilla)}</CeldaSerie>,
    },
    {
      header: "Fuerza muscular (kgf)",
      id: "fuerzaMuscular",
      cell: ({ row: { original: c } }) => <CeldaSerie anulado={c.anulado}>{formatearMedida(c.fuerzaMuscular)}</CeldaSerie>,
    },
    {
      // Solo el texto digitado por la persona profesional: el sistema no muestra ninguna categoría del IMC.
      header: "Interpretación",
      id: "interpretacion",
      cell: ({ row: { original: c } }) => (
        <span className={cn("block min-w-[160px] max-w-xs whitespace-pre-wrap break-words text-left", c.anulado && "text-muted-foreground")}>
          {c.interpretacion?.trim() ? c.interpretacion : "—"}
        </span>
      ),
    },
    {
      header: "Acciones",
      id: "acciones",
      cell: ({ row: { original: c } }) =>
        c.anulado ? null : (
          <IfPerm perm={PERM.nutricion.actualizar}>
            <Button
              size="icon" variant="outline" title="Anular"
              aria-label={`Anular control del ${formatearFechaClinica(c.fecha)}`}
              onClick={() => setAnularId(c.id)}
            >
              <Trash2 />
            </Button>
          </IfPerm>
        ),
    },
  ], ANCHOS), []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Serie histórica de controles</h3>
        <IfPerm perm={PERM.nutricion.crear}>
          <BotonRegistro expedienteId={expedienteId} motivoVisible type="button" variant="create" onClick={() => setNuevoAbierto(true)}>
            <Plus /> Nuevo control
          </BotonRegistro>
        </IfPerm>
      </div>

      <AvisoSinEdicion sujeto="Los controles" correccion="anula el control (con motivo) y regístralo de nuevo" />

      <FiltrosSerie
        desde={desde} hasta={hasta} incluirAnulados={incluirAnulados}
        onDesde={setDesde} onHasta={setHasta} onIncluirAnulados={setIncluirAnulados}
      />

      {serie.isLoading ? (
        <WebLoader />
      ) : serie.error ? (
        <p className="text-sm text-red-700" role="alert">{mensajeError(serie.error, "No se pudo cargar la serie de controles.")}</p>
      ) : !rangoInvertido ? (
        <DataTable
          columns={columns}
          data={serie.data ?? []}
          emptyMessage={hayFiltro ? "Ningún control en el rango de fechas" : "Sin controles registrados"}
        />
      ) : null}

      {nuevoAbierto && (
        <ControlNutricionalDialogo expedienteId={expedienteId} onClose={() => setNuevoAbierto(false)} />
      )}
      {anularId !== null && (
        <AnularControlNutricionalDialogo
          controlId={anularId}
          open
          onOpenChange={(abierto) => { if (!abierto) setAnularId(null); }}
        />
      )}
    </div>
  );
}
