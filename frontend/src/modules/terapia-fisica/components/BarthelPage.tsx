import CeldaSerie from "@/components/app/clinico/CeldaSerie";
import { BARTHEL_V1 } from "../instrumentos/barthelV1";
import InstrumentoSeriePage, { type ConfigSerie } from "./InstrumentoSeriePage";

// Total y grado de dependencia: lo calcula y devuelve el backend (tabla confirmada P1; con total 90 y
// «Deambular = silla de ruedas» ya llega «Independencia — uso de silla de ruedas»). Aquí solo se muestran.
const CONFIG: ConfigSerie<"barthel"> = {
  instrumento: "barthel",
  titulo: "Índice de Barthel",
  definicion: BARTHEL_V1,
  columnas: (c) => [
    c.fecha,
    {
      header: "Puntuación total (0–100)",
      id: "puntajeTotal",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{e.puntajeTotal}</CeldaSerie>,
    },
    {
      header: "Grado de dependencia",
      id: "gradoDependencia",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado} className="whitespace-normal">{e.gradoDependencia}</CeldaSerie>,
    },
    c.examinador,
    c.observaciones,
    c.version,
  ],
  anchos: { puntajeTotal: "min-w-[130px]", gradoDependencia: "min-w-[220px]" },
  resultado: (e) => [
    { etiqueta: "Puntuación total", valor: `${e.puntajeTotal} / 100` },
    { etiqueta: "Grado de dependencia", valor: e.gradoDependencia },
    { etiqueta: "Versión del instrumento", valor: e.versionInstrumento },
  ],
  descripcionAnulacion:
    "La evaluación no se elimina: queda anulada con el motivo, la persona y la fecha. Después puedes " +
    "registrar la evaluación correcta con «Nueva evaluación».",
};

type Props = { expedienteId: number; nueva?: boolean; onNueva: () => void; onVolver: () => void };

export default function BarthelPage(props: Props) {
  return <InstrumentoSeriePage config={CONFIG} {...props} />;
}
