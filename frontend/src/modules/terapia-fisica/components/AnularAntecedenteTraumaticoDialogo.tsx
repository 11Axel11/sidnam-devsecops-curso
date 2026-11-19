import { useQueryClient } from "@tanstack/react-query";
import { useAnularAntecedenteTraumatico, valoracionKeys } from "../hooks/valoracionHooks";
import MotivoAnulacionDialogo from "@/components/app/clinico/MotivoAnulacionDialogo";

type Props = {
  antecedenteId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AnularAntecedenteTraumaticoDialogo({ antecedenteId, open, onOpenChange }: Props) {
  const anular = useAnularAntecedenteTraumatico();
  const qc = useQueryClient();

  return (
    <MotivoAnulacionDialogo
      open={open}
      onOpenChange={onOpenChange}
      titulo="Retirar antecedente traumático"
      descripcion={
        "El antecedente no se elimina: queda marcado como anulado con el motivo, la persona y la fecha, " +
        "y deja de aparecer en la lista de la valoración."
      }
      textoBoton="Retirar antecedente"
      textoBotonEnCurso="Retirando…"
      placeholder="Ej. Registrado por error"
      mensajeObligatorio="El motivo es obligatorio para retirar el antecedente."
      mensajeFallo="No se pudo retirar el antecedente."
      mensajeExito="Antecedente retirado"
      informativos={{
        409: "El antecedente ya no se puede retirar: la valoración cambió de estado o ya estaba retirado.",
        404: "El antecedente ya no existe.",
      }}
      enCurso={anular.isPending}
      onConfirmar={(motivo) => anular.mutateAsync({ id: antecedenteId, motivo })}
      // En 409/404 la mutación no invalida sola: se recarga para que la pantalla refleje el estado real.
      onInformativo={() => qc.invalidateQueries({ queryKey: valoracionKeys.raiz })}
    />
  );
}
