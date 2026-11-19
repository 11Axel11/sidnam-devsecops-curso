import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Encabezado de las pantallas de una valoración concreta (nueva o abierta): vuelve al historial.
export default function EncabezadoVolver({ titulo, onVolver }: { titulo: string; onVolver: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="ghost" size="sm" onClick={onVolver}>
        <ArrowLeft /> Volver al historial
      </Button>
      <h3 className="text-lg font-semibold">{titulo}</h3>
    </div>
  );
}
