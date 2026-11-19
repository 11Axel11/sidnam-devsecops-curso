import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import AvisoSinEdicion from "@/components/app/clinico/AvisoSinEdicion";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import CeldaSerie from "@/components/app/clinico/CeldaSerie";
import { formatearFechaClinica } from "@/components/app/clinico/fechaClinica";
import FechaConAnulacion from "@/components/app/clinico/FechaConAnulacion";
import FiltrosSerie from "@/components/app/clinico/FiltrosSerie";
import AuditoriaRegistro from "@/components/app/clinico/AuditoriaRegistro";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";
import ResultadoEvaluacion, { type ResultadoItem } from "@/components/app/clinico/ResultadoEvaluacion";
import { conAnchos, rangoInvertido as esRangoInvertido } from "@/components/app/clinico/serie";
import IfPerm from "@/components/auth/IfPerm";
import DataTable from "@/components/DataTable";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { useAuthz } from "@/hooks/useAuth";
import { PERM } from "@/lib/permisosClinicos";
import { cn } from "@/lib/utils";
import { mensajeError } from "@/utils/apiError";
import { useEvaluaciones } from "../hooks/evaluacionesHooks";
import type { DefinicionInstrumento } from "@/components/app/clinico/instrumento";
import type { EvaluacionDe, InstrumentoTF } from "../models/evaluaciones";
import AnularEvaluacionDialogo from "./AnularEvaluacionDialogo";
import InstrumentoFormulario from "./InstrumentoFormulario";

// Columnas que comparten todas las series de instrumentos; cada instrumento las ordena a su gusto.
export interface ColumnasComunes<E> {
  fecha: ColumnDef<E>;
  examinador: ColumnDef<E>;
  observaciones: ColumnDef<E>;
  version: ColumnDef<E>;
}

export interface ConfigSerie<I extends InstrumentoTF> {
  instrumento: I;
  /** Nombre del instrumento: título del formulario y de la pantalla. */
  titulo: string;
  definicion: DefinicionInstrumento;
  /** Aviso sobre lo que asigna el sistema al guardar (se muestra en el formulario). */
  avisoSistema?: string;
  /** Columnas de la serie, en orden, SIN la de acciones (la agrega la página). */
  columnas: (comunes: ColumnasComunes<EvaluacionDe<I>>) => ColumnDef<EvaluacionDe<I>>[];
  /** Anchos mínimos por `id` de columna (el DataTable fija `max-w-0` en las celdas). */
  anchos: Record<string, string>;
  /** Lo que devolvió el backend al registrar, para el panel «Resultado registrado». */
  resultado: (e: EvaluacionDe<I>) => ResultadoItem[];
  descripcionAnulacion: string;
}

type Props<I extends InstrumentoTF> = {
  config: ConfigSerie<I>;
  expedienteId: number;
  nueva?: boolean;
  onNueva: () => void;
  onVolver: () => void;
};

// Pantalla de un instrumento: serie histórica (sin estados, sin edición) + registro nuevo en
// `?nueva=true`. Barthel y Tinetti la comparten; lo propio de cada uno va en su `ConfigSerie`.
export default function InstrumentoSeriePage<I extends InstrumentoTF>({ config, expedienteId, nueva, onNueva, onVolver }: Props<I>) {
  type E = EvaluacionDe<I>;
  const { can } = useAuthz({ ignoreWildcard: true, normalize: true });
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [incluirAnulados, setIncluirAnulados] = useState(false);
  const [anularId, setAnularId] = useState<number | null>(null);
  const [resultado, setResultado] = useState<E | null>(null);

  const rangoInvertido = esRangoInvertido(desde, hasta);
  const hayFiltro = !!desde || !!hasta;
  const serie = useEvaluaciones(
    config.instrumento,
    expedienteId,
    { desde: desde || undefined, hasta: hasta || undefined, incluirAnulados },
    !rangoInvertido && !nueva,
  );

  const columns = useMemo<ColumnDef<E>[]>(() => {
    const comunes: ColumnasComunes<E> = {
      fecha: { header: "Fecha", id: "fecha", cell: ({ row: { original: e } }) => <FechaConAnulacion registro={e} /> },
      examinador: {
        header: "Persona examinadora",
        id: "examinador",
        cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}><ResponsableValoracion id={e.usuarioExaminadorId} nombre={e.usuarioExaminadorNombre} /><AuditoriaRegistro registro={e} compacta /></CeldaSerie>,
      },
      observaciones: {
        header: "Observaciones",
        id: "observaciones",
        cell: ({ row: { original: e } }) => (
          <span className={cn("block min-w-[180px] max-w-xs whitespace-pre-wrap break-words text-left", e.anulado && "text-muted-foreground")}>
            {e.observaciones?.trim() ? e.observaciones : "—"}
          </span>
        ),
      },
      version: {
        header: "Versión",
        id: "version",
        cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{e.versionInstrumento}</CeldaSerie>,
      },
    };
    const acciones: ColumnDef<E> = {
      header: "Acciones",
      id: "acciones",
      cell: ({ row: { original: e } }) =>
        e.anulado ? null : (
          <IfPerm perm={PERM.terapiaFisica.actualizar}>
            <Button
              size="icon" variant="outline" title="Anular"
              aria-label={`Anular evaluación del ${formatearFechaClinica(e.fecha)}`}
              onClick={() => setAnularId(e.id)}
            >
              <Trash2 />
            </Button>
          </IfPerm>
        ),
    };
    return conAnchos([...config.columnas(comunes), acciones], {
      fecha: "min-w-[140px]", examinador: "min-w-[150px]", version: "min-w-[110px]", acciones: "min-w-[72px]", ...config.anchos,
    });
  }, [config]);

  // ---- registro nuevo ----
  if (nueva) {
    if (!can(PERM.terapiaFisica.crear)) {
      return <p className="text-sm text-muted-foreground">No tienes permiso para registrar evaluaciones.</p>;
    }
    return (
      <InstrumentoFormulario
        instrumento={config.instrumento}
        expedienteId={expedienteId}
        definicion={config.definicion}
        titulo={`Nueva evaluación — ${config.titulo}`}
        avisoSistema={config.avisoSistema}
        onGuardada={(e) => { setResultado(e as E); onVolver(); }}
        onSalir={onVolver}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{config.titulo} — serie histórica</h3>
        <IfPerm perm={PERM.terapiaFisica.crear}>
          <BotonRegistro expedienteId={expedienteId} motivoVisible type="button" variant="create" onClick={() => { setResultado(null); onNueva(); }}>
            <Plus /> Nueva evaluación
          </BotonRegistro>
        </IfPerm>
      </div>

      <AvisoSinEdicion sujeto="Las evaluaciones" correccion="anula la evaluación (con motivo) y regístrala de nuevo" />

      {resultado && (
        <ResultadoEvaluacion
          titulo="Resultado registrado (calculado por el sistema)"
          resultados={config.resultado(resultado)}
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
        <AnularEvaluacionDialogo
          instrumento={config.instrumento}
          evaluacionId={anularId}
          descripcion={config.descripcionAnulacion}
          open
          onOpenChange={(abierto) => { if (!abierto) setAnularId(null); }}
        />
      )}
    </div>
  );
}
