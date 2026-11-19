import type { ReactNode } from "react";

type Props = {
  etiqueta: string;
  /** Valor principal; `null` si el bloque no trae datos (entonces se muestra el motivo). */
  valor: ReactNode | null;
  /** Motivo del backend cuando no hay datos. */
  motivo: string | null;
  /** Texto tenue a la derecha (fecha). */
  aparte?: ReactNode;
};

// Fila de la ficha: etiqueta tenue, valor y, a la derecha, una fecha tenue. Si el bloque no trae datos
// muestra su `motivo` en texto tenue: nunca es un error.
export default function FilaFicha({ etiqueta, valor, motivo, aparte }: Props) {
  return (
    <div className="border-b py-3 text-left last:border-b-0">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      {valor === null ? (
        <p className="text-sm italic text-muted-foreground">{motivo ?? "—"}</p>
      ) : (
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-medium text-foreground">{valor}</p>
          {aparte ? <p className="shrink-0 text-xs text-muted-foreground">{aparte}</p> : null}
        </div>
      )}
    </div>
  );
}
