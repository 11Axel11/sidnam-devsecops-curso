import type { ReactNode } from "react";

export interface ParteRespondida {
  titulo: string;
  respondidos: number;
  total: number;
}

type Props = {
  respondidos: number;
  total: number;
  /** Conteo por parte (p. ej. Tinetti): solo cuántos ítems se respondieron, nunca puntos. */
  partes?: ParteRespondida[];
  /**
   * Espacio reservado para un resultado en vivo traído del backend cuando exista un endpoint de vista
   * previa. Hoy no se pasa nada: el frontend no calcula ni muestra totales parciales.
   */
  vistaPrevia?: ReactNode;
  /** Botones de acción (guardar, cancelar). */
  acciones: ReactNode;
};

// Barra inferior del formulario de un instrumento: avance de respuestas («X de N») y acciones.
export default function BarraAyudaEvaluacion({ respondidos, total, partes, vistaPrevia, acciones }: Props) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border bg-muted/95 p-4 shadow-sm backdrop-blur">
      <div aria-live="polite" role="status" className="space-y-0.5">
        <p className="text-xs text-muted-foreground">Ítems respondidos</p>
        <p className="text-lg font-semibold">{respondidos} de {total}</p>
        {partes && (
          <p className="text-xs text-muted-foreground">
            {partes.map((p) => `${p.titulo}: ${p.respondidos} de ${p.total}`).join(" · ")}
          </p>
        )}
      </div>
      {vistaPrevia && <div className="min-w-0 flex-1">{vistaPrevia}</div>}
      <div className="ml-auto flex flex-wrap gap-3">{acciones}</div>
    </div>
  );
}
