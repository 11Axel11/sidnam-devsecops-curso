import CeldaSerie from "@/components/app/clinico/CeldaSerie";
import { TINETTI_V1 } from "../instrumentos/tinettiV1";
import InstrumentoSeriePage, { type ConfigSerie } from "./InstrumentoSeriePage";

// Subtotales, total, riesgo, edad y N.º de control los calcula/asigna y devuelve el backend (tabla de
// riesgo confirmada P6). Aquí solo se muestran; el N.º de control no es editable (P8 pendiente).
const CONFIG: ConfigSerie<"tinetti"> = {
  instrumento: "tinetti",
  titulo: "Escala de Tinetti",
  definicion: TINETTI_V1,
  avisoSistema: "El N.º de control y la edad al momento de la evaluación los asigna el sistema al guardar.",
  columnas: (c) => [
    {
      header: "N.º de control",
      id: "numeroControl",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{e.numeroControl}</CeldaSerie>,
    },
    c.fecha,
    {
      header: "Edad (años)",
      id: "edad",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{e.edadMomentoEvaluacion}</CeldaSerie>,
    },
    {
      header: "Total de equilibrio (máx. 16)",
      id: "puntajeEquilibrio",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{e.puntajeEquilibrio}</CeldaSerie>,
    },
    {
      header: "Total de marcha (máx. 12)",
      id: "puntajeMarcha",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{e.puntajeMarcha}</CeldaSerie>,
    },
    {
      header: "Puntuación total general (máx. 28)",
      id: "puntajeTotal",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado}>{e.puntajeTotal}</CeldaSerie>,
    },
    {
      header: "Riesgo de caídas",
      id: "riesgoCaida",
      cell: ({ row: { original: e } }) => <CeldaSerie anulado={e.anulado} className="whitespace-normal">{e.riesgoCaida}</CeldaSerie>,
    },
    c.examinador,
    c.observaciones,
    c.version,
  ],
  anchos: {
    numeroControl: "min-w-[100px]", puntajeEquilibrio: "min-w-[130px]", puntajeMarcha: "min-w-[130px]",
    puntajeTotal: "min-w-[150px]", riesgoCaida: "min-w-[180px]",
  },
  resultado: (e) => [
    { etiqueta: "N.º de control", valor: String(e.numeroControl) },
    { etiqueta: "Edad al momento (años)", valor: String(e.edadMomentoEvaluacion) },
    { etiqueta: "Total de equilibrio", valor: `${e.puntajeEquilibrio} / 16` },
    { etiqueta: "Total de marcha", valor: `${e.puntajeMarcha} / 12` },
    { etiqueta: "Puntuación total general", valor: `${e.puntajeTotal} / 28` },
    { etiqueta: "Riesgo de caídas", valor: e.riesgoCaida },
    { etiqueta: "Versión del instrumento", valor: e.versionInstrumento },
  ],
  descripcionAnulacion:
    "La evaluación no se elimina: queda anulada con el motivo, la persona y la fecha. Su N.º de control no " +
    "se reutiliza: la evaluación que registres después recibirá el siguiente número. Después puedes registrar " +
    "la evaluación correcta con «Nueva evaluación».",
};

type Props = { expedienteId: number; nueva?: boolean; onNueva: () => void; onVolver: () => void };

export default function TinettiPage(props: Props) {
  return <InstrumentoSeriePage config={CONFIG} {...props} />;
}
