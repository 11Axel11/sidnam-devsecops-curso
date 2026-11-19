import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import AvisoSinEdicion from "@/components/app/clinico/AvisoSinEdicion";
import { formatearInstanteCR } from "@/components/app/clinico/fechaClinica";
import FechaConAnulacion from "@/components/app/clinico/FechaConAnulacion";
import FiltrosSerie from "@/components/app/clinico/FiltrosSerie";
import AuditoriaRegistro from "@/components/app/clinico/AuditoriaRegistro";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";
import { conAnchos, rangoInvertido as esRangoInvertido } from "@/components/app/clinico/serie";
import CeldaSerie from "@/components/app/clinico/CeldaSerie";
import IfPerm from "@/components/auth/IfPerm";
import DataTable from "@/components/DataTable";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERM } from "@/lib/permisosClinicos";
import { cn } from "@/lib/utils";
import { useCatalogoQuery } from "@/modules/catalogos/hooks/catalogosHooks";
import { mensajeError } from "@/utils/apiError";
import { useEventos } from "../hooks/eventosHooks";
import type { EventoImportante } from "../models/eventos";
import AnularEventoDialogo from "./AnularEventoDialogo";
import EventoDialogo from "./EventoDialogo";

type Props = { expedienteId: number };

const TODOS = "todos";

const ANCHOS: Record<string, string> = {
  fecha: "min-w-[160px]", tipo: "min-w-[150px]", descripcion: "min-w-[260px]", registradoPor: "min-w-[150px]",
  acciones: "min-w-[72px]",
};

// Bitácora de eventos importantes del residente (RF-TF-07), del más reciente al más antiguo. Fecha y hora
// siempre en hora de Costa Rica (`formatearInstanteCR`), nunca en la zona del navegador.
export default function EventosPage({ expedienteId }: Props) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipo, setTipo] = useState(TODOS);
  const [incluirAnulados, setIncluirAnulados] = useState(false);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [anularId, setAnularId] = useState<number | null>(null);

  // El filtro lista solo los tipos ACTIVOS (listar los inactivos exige permiso de Catálogos): los eventos
  // con un tipo ya desactivado se ven en la serie, pero no se pueden filtrar por él.
  const tipos = useCatalogoQuery("tipo-evento-importante");
  const tipoEventoId = tipo === TODOS ? undefined : Number(tipo);

  const rangoInvertido = esRangoInvertido(desde, hasta);
  const hayFiltro = !!desde || !!hasta || tipoEventoId !== undefined;
  const serie = useEventos(
    expedienteId,
    { desde: desde || undefined, hasta: hasta || undefined, tipoEventoId, incluirAnulados },
    !rangoInvertido,
  );

  const columns = useMemo<ColumnDef<EventoImportante>[]>(() => conAnchos([
    {
      header: "Fecha y hora",
      id: "fecha",
      cell: ({ row: { original: e } }) => <FechaConAnulacion registro={e} textoFecha={formatearInstanteCR(e.fechaHora)} />,
    },
    {
      header: "Tipo",
      id: "tipo",
      cell: ({ row: { original: e } }) => (
        <CeldaSerie anulado={e.anulado} className="whitespace-normal">
          {e.tipoEvento.nombre}{!e.tipoEvento.activo && " (desactivado)"}
        </CeldaSerie>
      ),
    },
    {
      header: "Descripción",
      id: "descripcion",
      cell: ({ row: { original: e } }) => (
        <span className={cn("block max-w-md whitespace-pre-wrap break-words text-left", e.anulado && "text-muted-foreground")}>
          {e.descripcion?.trim() ? e.descripcion : "—"}
        </span>
      ),
    },
    {
      header: "Registrado por",
      id: "registradoPor",
      cell: ({ row: { original: e } }) => (
        <CeldaSerie anulado={e.anulado}><ResponsableValoracion id={e.creadoPorId} nombre={e.creadoPorNombre} /><AuditoriaRegistro registro={e} compacta /></CeldaSerie>
      ),
    },
    {
      header: "Acciones",
      id: "acciones",
      cell: ({ row: { original: e } }) =>
        e.anulado ? null : (
          <IfPerm perm={PERM.terapiaFisica.anular}>
            <Button
              size="icon" variant="outline" title="Anular"
              aria-label={`Anular evento del ${formatearInstanteCR(e.fechaHora)}`}
              onClick={() => setAnularId(e.id)}
            >
              <Trash2 />
            </Button>
          </IfPerm>
        ),
    },
  ], ANCHOS), []);

  const filtroTipo = (
    <div className="space-y-1">
      <Label htmlFor="filtro-tipo-evento">Filtrar por tipo</Label>
      <Select value={tipo} onValueChange={setTipo}>
        <SelectTrigger id="filtro-tipo-evento" className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos los tipos</SelectItem>
          {(tipos.data ?? []).filter((t) => t.activo).map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Bitácora de eventos</h3>
        <IfPerm perm={PERM.terapiaFisica.crear}>
          <BotonRegistro expedienteId={expedienteId} motivoVisible type="button" variant="create" onClick={() => setNuevoAbierto(true)}>
            <Plus /> Nuevo evento
          </BotonRegistro>
        </IfPerm>
      </div>

      <AvisoSinEdicion sujeto="Los eventos" correccion="anula el evento (con motivo) y regístralo de nuevo" />

      <FiltrosSerie
        desde={desde} hasta={hasta} incluirAnulados={incluirAnulados}
        onDesde={setDesde} onHasta={setHasta} onIncluirAnulados={setIncluirAnulados}
        extra={filtroTipo}
      />

      {serie.isLoading ? (
        <WebLoader />
      ) : serie.error ? (
        <p className="text-sm text-red-700" role="alert">{mensajeError(serie.error, "No se pudo cargar la bitácora de eventos.")}</p>
      ) : !rangoInvertido ? (
        <DataTable
          columns={columns}
          data={serie.data ?? []}
          emptyMessage={hayFiltro ? "Ningún evento con los filtros elegidos" : "Sin eventos registrados"}
        />
      ) : null}

      {nuevoAbierto && <EventoDialogo expedienteId={expedienteId} onClose={() => setNuevoAbierto(false)} />}
      {anularId !== null && (
        <AnularEventoDialogo
          eventoId={anularId}
          open
          onOpenChange={(abierto) => { if (!abierto) setAnularId(null); }}
        />
      )}
    </div>
  );
}
