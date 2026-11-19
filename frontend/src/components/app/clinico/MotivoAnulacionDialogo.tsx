import { useState } from "react";
import { toast } from "sonner";
import TextareaAutoexpandible from "@/components/app/TextareaAutoexpandible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { mensajeError, statusDe } from "@/utils/apiError";

const MOTIVO_MAX = 2000;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion: string;
  /** Texto del botón de confirmar (y su forma en curso, p. ej. "Anular" / "Anulando…"). */
  textoBoton: string;
  textoBotonEnCurso: string;
  placeholder: string;
  mensajeObligatorio: string;
  mensajeFallo: string;
  mensajeExito: string;
  /** Estados HTTP que no son un fallo (p. ej. ya estaba anulado): se informa, se cierra y se refresca. */
  informativos: Partial<Record<number, string>>;
  /** Llama a la mutación con el motivo ya recortado; debe lanzar si la petición falla. */
  onConfirmar: (motivo: string) => Promise<unknown>;
  enCurso: boolean;
  onExito?: () => void;
  /** Tras un estado informativo (la pantalla puede estar desactualizada). */
  onInformativo?: () => void;
};

// Diálogo de motivo obligatorio (máx. 2000) compartido por las anulaciones y retiros del módulo.
export default function MotivoAnulacionDialogo({
  open, onOpenChange, titulo, descripcion, textoBoton, textoBotonEnCurso, placeholder,
  mensajeObligatorio, mensajeFallo, mensajeExito, informativos, onConfirmar, enCurso, onExito, onInformativo,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cerrar = (v: boolean) => {
    onOpenChange(v);
    if (!v) { setMotivo(""); setError(null); }
  };

  const confirmar = async () => {
    const limpio = motivo.trim();
    if (!limpio) { setError(mensajeObligatorio); return; }
    if (limpio.length > MOTIVO_MAX) { setError(`El motivo no puede superar los ${MOTIVO_MAX} caracteres.`); return; }
    setError(null);
    try {
      await onConfirmar(limpio);
      toast.success(mensajeExito);
      cerrar(false);
      onExito?.();
    } catch (err) {
      const status = statusDe(err);
      const informativo = status !== undefined ? informativos[status] : undefined;
      if (informativo !== undefined) {
        toast.info(mensajeError(err, informativo));
        cerrar(false);
        onInformativo?.();
      } else {
        setError(mensajeError(err, mensajeFallo));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="motivo-anulacion">Motivo (obligatorio)</Label>
          <TextareaAutoexpandible
            id="motivo-anulacion"
            value={motivo}
            maxLength={MOTIVO_MAX}
            mostrarContador
            placeholder={placeholder}
            onChange={(e) => { setMotivo(e.target.value); setError(null); }}
          />
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
          <Button type="button" variant="destructive" disabled={enCurso} onClick={confirmar}>
            {enCurso ? textoBotonEnCurso : textoBoton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
