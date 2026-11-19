import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import AvisoSinEdicion from "@/components/app/clinico/AvisoSinEdicion";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import CeldaSerie from "@/components/app/clinico/CeldaSerie";
import { formatearFechaClinica } from "@/components/app/clinico/fechaClinica";
import FechaConAnulacion from "@/components/app/clinico/FechaConAnulacion";
import FiltrosSerie from "@/components/app/clinico/FiltrosSerie";
import { formatearNumeroClinico } from "@/components/app/clinico/formatoNumero";
import AuditoriaRegistro from "@/components/app/clinico/AuditoriaRegistro";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";
import ResultadoEvaluacion from "@/components/app/clinico/ResultadoEvaluacion";
import { conAnchos, rangoInvertido as esRangoInvertido } from "@/components/app/clinico/serie";
import IfPerm from "@/components/auth/IfPerm";
import DataTable from "@/components/DataTable";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { useAuthz } from "@/hooks/useAuth";
import { PERM } from "@/lib/permisosClinicos";
import { mensajeError } from "@/utils/apiError";
import { useControlesNutricionales } from "../hooks/controlNutricionalHooks";
import { useEvaluacionesMna } from "../hooks/mnaHooks";
import type { EvaluacionMna } from "../models/mna";
import { opcionItemF } from "../utils/mnaForm";
import AnularMnaDialogo from "./AnularMnaDialogo";
import MnaFormulario from "./MnaFormulario";

type Props = {
  expedienteId: number;
  nueva?: boolean;
  onNueva: () => void;
  onVolver: () => void;
};

const MAX_CRIBAJE = 14;
const MAX_EVALUACION = 16;
const MAX_GLOBAL = 30;

const ANCHOS: Record<string, string> = {
  fecha: "min-w-[140px]", cribaje: "min-w-[110px]", interpretacionCribaje: "min-w-[220px]",
  evaluacion: "min-w-[110px]", global: "min-w-[110px]", interpretacionGlobal: "min-w-[170px]",
  control: "min-w-[150px]", version: "min-w-[100px]", responsable: "min-w-[150px]", acciones: "min-w-[72px]",
};

const sobre = (n: number | null, max: number) => (n === null ? "—" : `${formatearNumeroClinico(n)} / ${max}`);

// Pantalla del MNA (RF-NU-03): serie histórica (sin estados, sin edición) + «Nueva evaluación» en
// `?nueva=true`. Todo lo que se muestra (subtotales, global, interpretaciones) lo calculó el backend.
export default function MnaPage({ expedienteId, nueva, onNueva, onVolver }: Props) {
  const { can } = useAuthz({ ignoreWildcard: true, normalize: true });
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [incluirAnulados, setIncluirAnulados] = useState(false);
  const [anularId, setAnularId] = useState<number | null>(null);
  const [resultado, setResultado] = useState<EvaluacionMna | null>(null);

  const rangoInvertido = esRangoInvertido(desde, hasta);
  const hayFiltro = !!desde || !!hasta;
  const serie = useEvaluacionesMna(
    expedienteId,
    { desde: desde || undefined, hasta: hasta || undefined, incluirAnulados },
    !rangoInvertido && !nueva,
  );
  // Los controles (con los anulados) solo sirven para mostrar la fecha del control vinculado.
  const controles = useControlesNutricionales(expedienteId, { incluirAnulados: true }, !nueva);
  const fechaDeControl = useMemo(
    () => new Map((controles.data ?? []).map((c) => [c.id, c.fecha])),
    [controles.data],
  );

  const columns = useMemo<ColumnDef<EvaluacionMna>[]>(() => conAnchos([
    { header: "Fecha", id: "fecha", cell: ({ row: { original: e } }) => <FechaConAnulacion registro={e} /> },
    {
      header: "Subtotal de cribaje", id: "cribaje",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{sobre(e.subtotalCribaje, MAX_CRIBAJE)}</CeldaSerie>,
    },
    {
      header: "Interpretación del cribaje", id: "interpretacionCribaje",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado} className="whitespace-normal">{e.interpretacionCribaje}</CeldaSerie>,
    },
    {
      header: "Subtotal de evaluación", id: "evaluacion",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{sobre(e.subtotalEvaluacion, MAX_EVALUACION)}</CeldaSerie>,
    },
    {
      header: "Evaluación global", id: "global",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{sobre(e.evaluacionGlobal, MAX_GLOBAL)}</CeldaSerie>,
    },
    {
      header: "Interpretación global", id: "interpretacionGlobal",
      cell: ({ row: { original: e } }) => (
        <CeldaSerie anulado={e.anulado} className="whitespace-normal">{e.interpretacionGlobal ?? "—"}</CeldaSerie>
      ),
    },
    {
      header: "Control vinculado", id: "control",
      cell: ({ row: { original: e } }) => {
        const fecha = e.controlNutricionalId === null ? undefined : fechaDeControl.get(e.controlNutricionalId);
        return (
          <CeldaSerie anulado={e.anulado}>
            {e.controlNutricionalId === null
              ? "—"
              : fecha ? `Control del ${formatearFechaClinica(fecha)}` : `Control #${e.controlNutricionalId}`}
          </CeldaSerie>
        );
      },
    },
    {
      header: "Versión", id: "version",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{e.versionInstrumento}</CeldaSerie>,
    },
    {
      header: "Persona responsable", id: "responsable",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}><ResponsableValoracion id={e.usuarioResponsableId} nombre={e.usuarioResponsableNombre} /><AuditoriaRegistro registro={e} compacta /></CeldaSerie>,
    },
    {
      header: "Acciones", id: "acciones",
      cell: ({ row: { original: e } }) =>
        e.anulado ? null : (
          <IfPerm perm={PERM.nutricion.actualizar}>
            <Button
              size="icon" variant="outline" title="Anular"
              aria-label={`Anular evaluación del ${formatearFechaClinica(e.fecha)}`}
              onClick={() => setAnularId(e.id)}
            >
              <Trash2 />
            </Button>
          </IfPerm>
        ),
    },
  ], ANCHOS), [fechaDeControl]);

  // ---- registro nuevo ----
  if (nueva) {
    if (!can(PERM.nutricion.crear)) {
      return <p className="text-sm text-muted-foreground">No tienes permiso para registrar evaluaciones.</p>;
    }
    return (
      <MnaFormulario
        expedienteId={expedienteId}
        onGuardada={(e) => { setResultado(e); onVolver(); }}
        onSalir={onVolver}
      />
    );
  }

  const itemF = resultado ? opcionItemF(resultado.itemF) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Mini Nutritional Assessment — serie histórica</h3>
        <IfPerm perm={PERM.nutricion.crear}>
          <BotonRegistro expedienteId={expedienteId} motivoVisible type="button" variant="create" onClick={() => { setResultado(null); onNueva(); }}>
            <Plus /> Nueva evaluación
          </BotonRegistro>
        </IfPerm>
      </div>

      <AvisoSinEdicion sujeto="Las evaluaciones" correccion="anula la evaluación (con motivo) y regístrala de nuevo" />

      {resultado && (
        <ResultadoEvaluacion
          titulo="Resultado registrado (calculado por el sistema)"
          resultados={[
            { etiqueta: "Subtotal de cribaje", valor: sobre(resultado.subtotalCribaje, MAX_CRIBAJE) },
            { etiqueta: "Interpretación del cribaje", valor: resultado.interpretacionCribaje },
            { etiqueta: "Subtotal de evaluación", valor: sobre(resultado.subtotalEvaluacion, MAX_EVALUACION) },
            { etiqueta: "Evaluación global", valor: sobre(resultado.evaluacionGlobal, MAX_GLOBAL) },
            { etiqueta: "Interpretación global", valor: resultado.interpretacionGlobal ?? "—" },
            {
              etiqueta: resultado.controlNutricionalId === null ? "Ítem F" : "Ítem F (del control vinculado)",
              valor: itemF ? `${itemF.etiqueta} (${formatearNumeroClinico(itemF.puntos)})` : formatearNumeroClinico(resultado.itemF),
            },
            { etiqueta: "Versión del instrumento", valor: resultado.versionInstrumento },
          ]}
          onCerrar={() => setResultado(null)}
        />
      )}

      <FiltrosSerie
        desde={desde} hasta={hasta} incluirAnulados={incluirAnulados}
        onDesde={setDesde} onHasta={setHasta} onIncluirAnulados={setIncluirAnulados}
      />

      {serie.isLoading ? (
        <WebLoader />
      ) : serie.error ? (
        <p className="text-sm text-red-700" role="alert">{mensajeError(serie.error, "No se pudo cargar la serie de evaluaciones.")}</p>
      ) : !rangoInvertido ? (
        <DataTable
          columns={columns}
          data={serie.data ?? []}
          emptyMessage={hayFiltro ? "Ninguna evaluación en el rango de fechas" : "Sin evaluaciones registradas"}
        />
      ) : null}

      {anularId !== null && (
        <AnularMnaDialogo
          evaluacionId={anularId}
          open
          onOpenChange={(abierto) => { if (!abierto) setAnularId(null); }}
        />
      )}
    </div>
  );
}
