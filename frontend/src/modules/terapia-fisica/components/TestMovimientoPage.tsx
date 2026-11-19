import { useState } from "react";
import { Plus } from "lucide-react";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import AvisoSinEdicion from "@/components/app/clinico/AvisoSinEdicion";
import FiltrosSerie from "@/components/app/clinico/FiltrosSerie";
import { rangoInvertido as esRangoInvertido } from "@/components/app/clinico/serie";
import IfPerm from "@/components/auth/IfPerm";
import WebLoader from "@/components/Loader";
import { PERM } from "@/lib/permisosClinicos";
import { mensajeError } from "@/utils/apiError";
import { useAplicaciones } from "../hooks/testMovimientoHooks";
import AnularAplicacionDialogo from "./AnularAplicacionDialogo";
import AplicacionTestDialogo from "./AplicacionTestDialogo";
import AplicacionTestTarjeta from "./AplicacionTestTarjeta";

type Props = { expedienteId: number };

// Historial de aplicaciones del Test de Movimiento y Coordinación (RF-TF-10): una tarjeta por aplicación,
// de la más reciente a la más antigua. Sin filtros, la más reciente vigente es «Aplicación actual» y la
// siguiente «Aplicación anterior» (como el Figma); con filtros todas se rotulan solo «Aplicación».
export default function TestMovimientoPage({ expedienteId }: Props) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [incluirAnulados, setIncluirAnulados] = useState(false);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [anularId, setAnularId] = useState<number | null>(null);

  const rangoInvertido = esRangoInvertido(desde, hasta);
  const hayFiltro = !!desde || !!hasta;
  const serie = useAplicaciones(
    expedienteId,
    { desde: desde || undefined, hasta: hasta || undefined, incluirAnulados },
    !rangoInvertido,
  );

  const aplicaciones = serie.data ?? [];
  const rotuloDe = (id: number): string => {
    if (hayFiltro) return "Aplicación";
    const vigentes = aplicaciones.filter((a) => !a.anulado);
    if (vigentes[0]?.id === id) return "Aplicación actual";
    if (vigentes[1]?.id === id) return "Aplicación anterior";
    return "Aplicación";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Historial de aplicaciones</h3>
        <IfPerm perm={PERM.terapiaFisica.crear}>
          <BotonRegistro expedienteId={expedienteId} motivoVisible type="button" variant="create" onClick={() => setNuevaAbierta(true)}>
            <Plus /> Nueva aplicación
          </BotonRegistro>
        </IfPerm>
      </div>

      <AvisoSinEdicion sujeto="Las aplicaciones" correccion="anula la aplicación (con motivo) y regístrala de nuevo" />

      <FiltrosSerie
        desde={desde} hasta={hasta} incluirAnulados={incluirAnulados}
        onDesde={setDesde} onHasta={setHasta} onIncluirAnulados={setIncluirAnulados}
      />

      {serie.isLoading ? (
        <WebLoader />
      ) : serie.error ? (
        <p className="text-sm text-red-700" role="alert">{mensajeError(serie.error, "No se pudo cargar el historial de aplicaciones.")}</p>
      ) : rangoInvertido ? null : aplicaciones.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          {hayFiltro ? "Ninguna aplicación en el rango de fechas" : "Sin aplicaciones registradas"}
        </p>
      ) : (
        <div className="space-y-4">
          {aplicaciones.map((a) => (
            <AplicacionTestTarjeta key={a.id} aplicacion={a} rotulo={rotuloDe(a.id)} onAnular={setAnularId} />
          ))}
        </div>
      )}

      {nuevaAbierta && <AplicacionTestDialogo expedienteId={expedienteId} onClose={() => setNuevaAbierta(false)} />}
      {anularId !== null && (
        <AnularAplicacionDialogo
          aplicacionId={anularId}
          open
          onOpenChange={(abierto) => { if (!abierto) setAnularId(null); }}
        />
      )}
    </div>
  );
}
