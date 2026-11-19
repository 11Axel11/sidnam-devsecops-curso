import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AntecedentePersonalValoracion } from "../models/valoracion";
import { idCampo } from "@/components/app/clinico/idCampo";

export interface EstadoAntecedente {
  presente: boolean;
  observacion: string;
}

type Props = {
  /** Ítems ACTIVOS del catálogo `antecedente-personal` (no se asume una cantidad fija). */
  items: { id: number; nombre: string }[];
  /** Filas guardadas cuyo ítem se desactivó después: se muestran como historial, no se envían. */
  inactivos: AntecedentePersonalValoracion[];
  valores: Record<number, EstadoAntecedente>;
  /** Ids que ya tienen fila en la valoración; el resto aparece como "Pendiente". */
  guardados: Set<number>;
  /**
   * Solo cuando la valoración ya tiene antecedentes guardados: así "Pendiente" señala los ítems
   * agregados al catálogo después, en lugar de marcar todo en una valoración nueva.
   */
  mostrarPendientes: boolean;
  /** Ids que el backend devolvió como `antecedentePersonal:<id>` al intentar cerrar. */
  faltantes: Set<number>;
  cargando: boolean;
  errorCatalogo: boolean;
  onChange: (id: number, parche: Partial<EstadoAntecedente>) => void;
};

export default function AntecedentesPersonalesChecklist({
  items, inactivos, valores, guardados, mostrarPendientes, faltantes, cargando, errorCatalogo, onChange,
}: Props) {
  if (cargando) return <p className="text-sm text-muted-foreground">Cargando antecedentes…</p>;
  if (errorCatalogo) {
    return <p className="text-sm text-red-700" role="alert">No se pudo cargar el catálogo de antecedentes personales.</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay antecedentes personales activos en el catálogo.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const estado = valores[item.id] ?? { presente: false, observacion: "" };
          const falta = faltantes.has(item.id);
          const pendiente = mostrarPendientes && !guardados.has(item.id);
          return (
            <div
              key={item.id}
              className={cn(
                "rounded-md border p-3 transition-colors",
                falta ? "border-red-600 bg-red-50" : "border-transparent hover:bg-muted/60",
              )}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  // Borde más visible que el del componente compartido, solo para este checklist.
                  className="border-muted-foreground/70 bg-background hover:border-foreground/70"
                  id={idCampo(`antecedente-${item.id}`)}
                  checked={estado.presente}
                  onCheckedChange={(v) => onChange(item.id, { presente: v === true })}
                />
                <Label htmlFor={idCampo(`antecedente-${item.id}`)} className="flex-1 cursor-pointer">
                  {item.nombre}
                </Label>
                {pendiente && <Badge variant="pending" className="shrink-0">Pendiente</Badge>}
              </div>
              {estado.presente && (
                <Input
                  className="mt-2"
                  placeholder="Observación (opcional)"
                  aria-label={`Observación de ${item.nombre}`}
                  value={estado.observacion}
                  onChange={(e) => onChange(item.id, { observacion: e.target.value })}
                />
              )}
              {falta && (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  Falta evaluar «{item.nombre}». Marca si está presente o déjalo sin marcar y guarda.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {inactivos.length > 0 && (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          <p className="mb-1 font-medium">Antecedentes de un catálogo que ya no está activo (solo historial)</p>
          <ul className="list-disc pl-5">
            {inactivos.map((a) => (
              <li key={a.antecedenteId}>
                {a.nombre}: {a.presente ? "presente" : "descartado"}
                {a.observacion ? ` — ${a.observacion}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
