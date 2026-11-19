import { formatearNumeroClinico } from "@/components/app/clinico/formatoNumero";
import type { VistaPreviaMna as Datos } from "../models/mna";
import { letraDeCampo } from "../schemas/mnaSchema";

type Props = {
  /** Respuesta del backend para el cuerpo actual (la anterior mientras llega la nueva). */
  datos?: Datos;
  /** Hay datos suficientes (A–F) para pedir la vista previa. */
  disponible: boolean;
  /** Se está esperando al backend (debounce o petición en curso). */
  calculando: boolean;
  /** Mensajes del último fallo de la vista previa (400 `errores`, 409, red…). */
  errores?: string[];
  /** Resumen de una línea para la barra inferior. */
  compacta?: boolean;
};

const MAX_CRIBAJE = 14;
const MAX_EVALUACION = 16;
const MAX_GLOBAL = 30;

const sobre = (n: number | null | undefined, max: number) => `${formatearNumeroClinico(n)} / ${max}`;

// Texto de la segunda parte según lo que informa el backend (`segundaParte.requerida`), no según una
// constante del cliente.
function textoSegundaParte(d: Datos): string {
  if (d.segundaParte.completa) return "La segunda parte (ítems G–R) está completa.";
  return d.segundaParte.requerida
    ? "La segunda parte (ítems G–R) debe completarse para registrar la evaluación."
    : "Con este cribaje (12 o más) no es necesario continuar: la segunda parte (ítems G–R) es opcional. Se registra completa (los 12 ítems) o no se registra.";
}

function textoFaltantes(d: Datos): string | null {
  const { completa, itemsFaltantes, requerida } = d.segundaParte;
  if (completa) return null;
  if (itemsFaltantes.length >= 12) return requerida ? "Faltan los 12 ítems de la segunda parte." : null;
  return `Faltan los ítems: ${itemsFaltantes.map(letraDeCampo).join(", ")}.`;
}

// Panel con lo que devuelve la vista previa del BACKEND mientras se llena el formulario (subtotales,
// global e interpretaciones). Solo presenta valores recibidos: no suma ni interpreta nada. El valor oficial
// es el que devuelve el registro. Color: acento de marca (#A7074D) en los valores, sin criterio bueno/malo.
export default function VistaPreviaMna({ datos, disponible, calculando, errores = [], compacta }: Props) {
  const hayDatos = disponible && !!datos;

  if (compacta) {
    return (
      <p className="text-sm" aria-live="polite">
        {!disponible ? (
          <span className="text-muted-foreground">Responde los ítems A–F para ver el cribaje.</span>
        ) : hayDatos ? (
          <>
            <span className="text-muted-foreground">Cribaje </span>
            <strong className="text-[#A7074D]">{sobre(datos.subtotalCribaje, MAX_CRIBAJE)}</strong>
            {datos.evaluacionGlobal !== null && (
              <>
                <span className="text-muted-foreground"> · Global </span>
                <strong className="text-[#A7074D]">{sobre(datos.evaluacionGlobal, MAX_GLOBAL)}</strong>
              </>
            )}
            {calculando && <span className="text-muted-foreground"> · Calculando…</span>}
          </>
        ) : errores.length > 0 ? (
          <span className="text-red-700">No se pudo calcular el resultado.</span>
        ) : (
          <span className="text-muted-foreground">Calculando…</span>
        )}
      </p>
    );
  }

  return (
    <section aria-label="Resultado calculado por el sistema" className="space-y-3 rounded-md border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Resultado (vista previa del sistema)</h4>
        {disponible && calculando && <span className="text-xs text-muted-foreground" role="status">Calculando…</span>}
      </div>

      {!disponible && (
        <p className="text-sm text-muted-foreground">
          Responde los ítems A–F (cribaje) para ver el subtotal y su interpretación, calculados por el sistema.
        </p>
      )}

      {disponible && errores.length > 0 && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <ul className="list-disc pl-5">{errores.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      {hayDatos && (
        <>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-muted-foreground">Subtotal de cribaje</dt>
              <dd className="text-2xl font-semibold text-[#A7074D]">{sobre(datos.subtotalCribaje, MAX_CRIBAJE)}</dd>
              <dd className="text-sm">{datos.interpretacionCribaje}</dd>
            </div>
            {datos.evaluacionGlobal !== null && (
              <>
                <div>
                  <dt className="text-xs text-muted-foreground">Subtotal de evaluación</dt>
                  <dd className="text-lg font-semibold text-[#A7074D]">{sobre(datos.subtotalEvaluacion, MAX_EVALUACION)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Evaluación global</dt>
                  <dd className="text-2xl font-semibold text-[#A7074D]">{sobre(datos.evaluacionGlobal, MAX_GLOBAL)}</dd>
                  <dd className="text-sm">{datos.interpretacionGlobal}</dd>
                </div>
              </>
            )}
          </dl>
          <div className="space-y-1 border-t pt-3 text-sm">
            <p>{textoSegundaParte(datos)}</p>
            {textoFaltantes(datos) && <p className="text-muted-foreground">{textoFaltantes(datos)}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            Vista previa: el valor oficial es el que devuelve el sistema al guardar. Versión {datos.versionInstrumento}.
          </p>
        </>
      )}
    </section>
  );
}
