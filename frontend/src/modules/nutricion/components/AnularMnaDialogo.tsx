import AnularRegistroDialogo from "@/components/app/clinico/AnularRegistroDialogo";
import { mnaKeys, useAnularEvaluacionMna, useLimpiarVistaPreviaMna } from "../hooks/mnaHooks";

type Props = {
  evaluacionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AnularMnaDialogo({ evaluacionId, open, onOpenChange }: Props) {
  const anular = useAnularEvaluacionMna();
  const limpiarVistaPrevia = useLimpiarVistaPreviaMna();

  return (
    <AnularRegistroDialogo
      open={open}
      onOpenChange={onOpenChange}
      titulo="Anular evaluación MNA"
      descripcion={
        "La evaluación no se elimina: queda anulada con el motivo, la persona y la fecha, y libera el control " +
        "nutricional vinculado. Después puedes registrar la evaluación correcta con «Nueva evaluación»."
      }
      textoBoton="Anular evaluación"
      placeholder="Ej. Se evaluó al residente equivocado"
      mensajeObligatorio="El motivo es obligatorio para anular la evaluación."
      mensajeFallo="No se pudo anular la evaluación."
      mensajeExito="Evaluación anulada"
      informativos={{
        409: "La evaluación MNA ya está anulada.",
        404: "La evaluación MNA ya no existe.",
      }}
      enCurso={anular.isPending}
      onAnular={async (motivo) => {
        const r = await anular.mutateAsync({ id: evaluacionId, motivo });
        limpiarVistaPrevia();
        return r;
      }}
      claveRaiz={mnaKeys.raiz}
    />
  );
}
