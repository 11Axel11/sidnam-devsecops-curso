import type { ReactNode } from "react";
import CalendarField from "@/components/CalendarField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { rangoInvertido } from "./serie";

type Props = {
  desde: string;
  hasta: string;
  incluirAnulados: boolean;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
  onIncluirAnulados: (v: boolean) => void;
  /** Filtros propios de la serie (p. ej. el tipo de evento), junto a las fechas. */
  extra?: ReactNode;
};

// Filtros de las series históricas: rango de fechas («Desde»/«Hasta», vacío = sin límite) e
// interruptor «Mostrar anulados» (el backend los excluye por defecto: `?incluirAnulados=true`).
export default function FiltrosSerie({ desde, hasta, incluirAnulados, onDesde, onHasta, onIncluirAnulados, extra }: Props) {
  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>Desde</Label>
          <CalendarField className="w-[200px]" disableFuture value={desde} onChange={onDesde} />
        </div>
        <div className="space-y-1">
          <Label>Hasta</Label>
          <CalendarField className="w-[200px]" disableFuture value={hasta} onChange={onHasta} />
        </div>
        {extra}
        {(!!desde || !!hasta) && (
          <Button type="button" variant="ghost" onClick={() => { onDesde(""); onHasta(""); }}>
            Limpiar fechas
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <Switch id="mostrar-anulados" checked={incluirAnulados} onCheckedChange={onIncluirAnulados} />
          <Label htmlFor="mostrar-anulados" className="cursor-pointer">Mostrar anulados</Label>
        </div>
      </div>
      {rangoInvertido(desde, hasta) && (
        <p className="text-sm text-red-700" role="alert">«Desde» no puede ser posterior a «Hasta».</p>
      )}
    </>
  );
}
