import AnularRegistroDialogo from "@/components/app/clinico/AnularRegistroDialogo";
import { evaluacionKeys, useAnularEvaluacion } from "../hooks/evaluacionesHooks";
import type { InstrumentoTF } from "../models/evaluaciones";

type Props = {
  instrumento: InstrumentoTF;
  evaluacionId: number;
  /** Texto propio del instrumento (p. ej. que el N.º de control de Tinetti no se reutiliza). */
  descripcion: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AnularEvaluacionDialogo({ instrumento, evaluacionId, descripcion, open, onOpenChange }: Props) {
  const anular = useAnularEvaluacion(instrumento);

  return (
    <AnularRegistroDialogo
      open={open}
      onOpenChange={onOpenChange}
      titulo="Anular evaluación"
      descripcion={descripcion}
      textoBoton="Anular evaluación"
      placeholder="Ej. Se evaluó al residente equivocado"
      mensajeObligatorio="El motivo es obligatorio para anular la evaluación."
      mensajeFallo="No se pudo anular la evaluación."
      mensajeExito="Evaluación anulada"
      informativos={{
        409: "La evaluación ya está anulada.",
        404: "La evaluación ya no existe.",
      }}
      enCurso={anular.isPending}
      onAnular={(motivo) => anular.mutateAsync({ id: evaluacionId, motivo })}
      claveRaiz={evaluacionKeys.raiz(instrumento)}
    />
  );
}
