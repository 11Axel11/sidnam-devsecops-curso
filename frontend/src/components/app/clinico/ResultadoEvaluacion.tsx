import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ResultadoItem {
  etiqueta: string;
  valor: string;
}

type Props = {
  titulo: string;
  resultados: ResultadoItem[];
  onCerrar?: () => void;
};

// Panel con lo que el BACKEND devolvió al registrar (total, grado/riesgo, subtotales, N.º de control,
// edad, versión). Solo presenta valores recibidos: no calcula nada. Mismo componente servirá para una
// vista previa en vivo si el backend agrega ese endpoint. Color: el acento de marca del Figma
// (#A7074D) para cualquier valor, sin criterio de bueno/malo.
export default function ResultadoEvaluacion({ titulo, resultados, onCerrar }: Props) {
  return (
    <section role="status" aria-label={titulo} className="relative rounded-md border bg-muted/40 p-4">
      {onCerrar && (
        <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="Cerrar resultado" onClick={onCerrar}>
          <X />
        </Button>
      )}
      <h4 className="mb-3 text-sm font-semibold">{titulo}</h4>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">
        {resultados.map((r) => (
          <div key={r.etiqueta}>
            <dt className="text-xs text-muted-foreground">{r.etiqueta}</dt>
            <dd className="text-lg font-semibold text-[#A7074D]">{r.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
