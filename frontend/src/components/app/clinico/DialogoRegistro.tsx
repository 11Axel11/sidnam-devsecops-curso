import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import AvisoSalirDialogo from "./AvisoSalirDialogo";
import BotonRegistro from "./BotonRegistro";
import { useAvisoSalirSinGuardar } from "./useAvisoSalirSinGuardar";

type Props = {
  /** Expediente: con él inactivo, «guardar» queda deshabilitado con el motivo. */
  expedienteId: number;
  titulo: string;
  descripcion: string;
  textoGuardar: string;
  /** Hay datos escritos distintos de los iniciales. */
  sinGuardar: boolean;
  guardando: boolean;
  /** Avisos del servidor o de red que se muestran arriba del formulario. */
  aviso: string | null;
  erroresServidor: string[];
  /** Qué se perdería al salir: «los datos de este control». */
  perdida: string;
  /** Deshabilita «guardar» (p. ej. no hay nada que registrar). */
  guardarDeshabilitado?: boolean;
  /** Ancho del diálogo (clase de Tailwind). */
  anchoClase?: string;
  /** Valida y envía; devuelve `true` si se guardó (entonces se cierra el diálogo). */
  onGuardar: () => Promise<boolean>;
  onClose: () => void;
  children: ReactNode;
};

// Armazón de un diálogo de ALTA de un registro de una serie (control, evento, test de movimiento): banner
// de errores, pie con Cancelar/Guardar, confirmación al cerrar con cambios y aviso al salir de la
// ruta o recargar con cambios sin guardar. El padre lo monta solo mientras está abierto, así cada
// apertura arranca con su estado. Lo propio de cada registro va en `children` (los campos).
export default function DialogoRegistro({
  expedienteId, titulo, descripcion, textoGuardar, sinGuardar, guardando, aviso, erroresServidor, perdida,
  guardarDeshabilitado, anchoClase = "sm:max-w-2xl", onGuardar, onClose, children,
}: Props) {
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const { bloqueo, marcarGuardado } = useAvisoSalirSinGuardar(sinGuardar);

  const intentarCerrar = () => {
    if (guardando) return;
    if (sinGuardar) setConfirmarCierre(true);
    else onClose();
  };

  const enviar = async () => {
    const guardado = await onGuardar();
    if (guardado) {
      marcarGuardado();
      onClose();
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(abierto) => { if (!abierto) intentarCerrar(); }}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto ${anchoClase}`}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
            {(erroresServidor.length > 0 || aviso) && (
              <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-left text-sm text-red-900">
                {aviso && <p>{aviso}</p>}
                {erroresServidor.length > 0 && (
                  <ul className="list-disc pl-5">
                    {erroresServidor.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                )}
              </div>
            )}

            {children}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={intentarCerrar} disabled={guardando}>Cancelar</Button>
              <BotonRegistro expedienteId={expedienteId} type="submit" variant="create" disabled={guardando || guardarDeshabilitado}>
                {guardando ? "Guardando…" : textoGuardar}
              </BotonRegistro>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cerrar el diálogo con cambios sin guardar. */}
      <Dialog open={confirmarCierre} onOpenChange={setConfirmarCierre}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hay cambios sin guardar</DialogTitle>
            <DialogDescription>Si cierras ahora, {perdida} no guardados se perderán.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmarCierre(false)}>Seguir editando</Button>
            <Button type="button" variant="destructive" onClick={onClose}>Descartar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salir a otra ruta o recargar con cambios sin guardar. */}
      <AvisoSalirDialogo bloqueo={bloqueo} descripcion={`Si sales ahora, ${perdida} que no has guardado se perderán.`} />
    </>
  );
}
