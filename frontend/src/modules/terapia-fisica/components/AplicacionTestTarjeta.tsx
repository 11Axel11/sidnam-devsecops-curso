import { Trash2 } from "lucide-react";
import AuditoriaRegistro from "@/components/app/clinico/AuditoriaRegistro";
import FechaConAnulacion from "@/components/app/clinico/FechaConAnulacion";
import { formatearFechaClinica } from "@/components/app/clinico/fechaClinica";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";
import IfPerm from "@/components/auth/IfPerm";
import { Button } from "@/components/ui/button";
import { PERM } from "@/lib/permisosClinicos";
import { cn } from "@/lib/utils";
import type { AplicacionTest } from "../models/testMovimiento";

type Props = {
  aplicacion: AplicacionTest;
  /** «Aplicación actual», «Aplicación anterior» o «Aplicación». */
  rotulo: string;
  onAnular: (id: number) => void;
};

// Tarjeta de una aplicación del test (como el Figma): fecha y responsable arriba y UNA COLUMNA POR EJERCICIO
// con modalidad, modificación (si hay) y resultado. Los ejercicios van ordenados por `ejercicioId`, así dos
// tarjetas apiladas se comparan ejercicio por ejercicio (CA-10). Una aplicación anulada se atenúa y conserva
// sus ejercicios.
export default function AplicacionTestTarjeta({ aplicacion: a, rotulo, onAnular }: Props) {
  const ejercicios = [...a.ejercicios].sort((x, y) => x.ejercicioId - y.ejercicioId);
  const fecha = formatearFechaClinica(a.fecha);

  return (
    <article className={cn("space-y-3 rounded-lg border p-4", a.anulado && "bg-muted/30")} aria-label={`${rotulo} del ${fecha}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-semibold"><FechaConAnulacion registro={a} textoFecha={`${rotulo} — ${fecha}`} /></h4>
          <p className="text-sm text-muted-foreground">
            Responsable: <ResponsableValoracion id={a.usuarioResponsableId} nombre={a.usuarioResponsableNombre} />
          </p>
          <AuditoriaRegistro registro={a} compacta />
        </div>
        {!a.anulado && (
          <IfPerm perm={PERM.terapiaFisica.anular}>
            <Button type="button" size="sm" variant="outline" aria-label={`Anular aplicación del ${fecha}`} onClick={() => onAnular(a.id)}>
              <Trash2 /> Anular
            </Button>
          </IfPerm>
        )}
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {ejercicios.map((e) => (
          <div key={e.id} className={cn("space-y-1 rounded-md border bg-background p-3 text-sm", a.anulado && "text-muted-foreground")}>
            <p className="font-medium">
              {e.ejercicio.nombre}{!e.ejercicio.activo && " (desactivado)"}
            </p>
            <p className="whitespace-pre-wrap break-words"><span className="text-muted-foreground">Modalidad: </span>{e.modalidad}</p>
            {e.modificacion?.trim() && (
              <p className="whitespace-pre-wrap break-words"><span className="text-muted-foreground">Modificación: </span>{e.modificacion}</p>
            )}
            <p className="whitespace-pre-wrap break-words"><span className="text-muted-foreground">Resultado: </span>{e.resultado}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
