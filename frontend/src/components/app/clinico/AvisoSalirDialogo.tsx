import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { BloqueoSalida } from "./useAvisoSalirSinGuardar";

type Props = {
  bloqueo: BloqueoSalida;
  /** Qué se perdería al salir; por defecto, una valoración. */
  descripcion?: string;
};

export default function AvisoSalirDialogo({
  bloqueo,
  descripcion = "Si sales ahora, los cambios de esta valoración que no has guardado se perderán.",
}: Props) {
  return (
    <Dialog open={bloqueo.status === "blocked"} onOpenChange={(abierto) => { if (!abierto) bloqueo.reset?.(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hay cambios sin guardar</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => bloqueo.reset?.()}>Quedarme</Button>
          <Button type="button" variant="destructive" onClick={() => bloqueo.proceed?.()}>Salir sin guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
