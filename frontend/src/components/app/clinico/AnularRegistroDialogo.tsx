import { useQueryClient } from "@tanstack/react-query";
import MotivoAnulacionDialogo from "./MotivoAnulacionDialogo";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion: string;
  textoBoton: string;
  placeholder: string;
  mensajeObligatorio: string;
  mensajeFallo: string;
  mensajeExito: string;
  /** Estados HTTP informativos (409 ya anulado, 404 ya no existe) con su texto de respaldo. */
  informativos: Partial<Record<number, string>>;
  /** Llama a la mutación de anular con el motivo; debe lanzar si la petición falla. */
  onAnular: (motivo: string) => Promise<unknown>;
  enCurso: boolean;
  /** Prefijo de claves de la serie: se invalida cuando el estado en pantalla estaba desactualizado. */
  claveRaiz: readonly unknown[];
};

// Anulación de un registro de una serie sin estados (control nutricional, Barthel, Tinetti): motivo
// obligatorio y, ante 409/404, aviso informativo y recarga de la serie (la mutación no invalida sola).
export default function AnularRegistroDialogo({
  open, onOpenChange, titulo, descripcion, textoBoton, placeholder, mensajeObligatorio, mensajeFallo,
  mensajeExito, informativos, onAnular, enCurso, claveRaiz,
}: Props) {
  const qc = useQueryClient();

  return (
    <MotivoAnulacionDialogo
      open={open}
      onOpenChange={onOpenChange}
      titulo={titulo}
      descripcion={descripcion}
      textoBoton={textoBoton}
      textoBotonEnCurso="Anulando…"
      placeholder={placeholder}
      mensajeObligatorio={mensajeObligatorio}
      mensajeFallo={mensajeFallo}
      mensajeExito={mensajeExito}
      informativos={informativos}
      enCurso={enCurso}
      onConfirmar={onAnular}
      onInformativo={() => qc.invalidateQueries({ queryKey: claveRaiz })}
    />
  );
}
