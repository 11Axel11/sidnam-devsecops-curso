import { useQueryClient } from "@tanstack/react-query";
import MotivoAnulacionDialogo from "@/components/app/clinico/MotivoAnulacionDialogo";
import { useAnularValoracionNutricional, valoracionNutricionalKeys } from "../hooks/valoracionNutricionalHooks";

type Props = {
  valoracionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnulada?: () => void;
};

export default function AnularValoracionNutricionalDialogo({ valoracionId, open, onOpenChange, onAnulada }: Props) {
  const anular = useAnularValoracionNutricional();
  const qc = useQueryClient();

  return (
    <MotivoAnulacionDialogo
      open={open}
      onOpenChange={onOpenChange}
      titulo="Anular valoración"
      descripcion={
        "La valoración no se elimina: queda marcada como anulada con el motivo, la persona y la fecha. " +
        "Si es la vigente, el expediente quedará sin valoración vigente."
      }
      textoBoton="Anular valoración"
      textoBotonEnCurso="Anulando…"
      placeholder="Ej. Cargada en el expediente equivocado"
      mensajeObligatorio="El motivo es obligatorio para anular la valoración."
      mensajeFallo="No se pudo anular la valoración."
      mensajeExito="Valoración anulada"
      informativos={{ 409: "La valoración ya está anulada." }}
      enCurso={anular.isPending}
      onConfirmar={(motivo) => anular.mutateAsync({ id: valoracionId, motivo })}
      onExito={onAnulada}
      // En 409 la mutación no invalida sola: se recarga para que la pantalla muestre el estado real.
      onInformativo={() => qc.invalidateQueries({ queryKey: valoracionNutricionalKeys.raiz })}
    />
  );
}
