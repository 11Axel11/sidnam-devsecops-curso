import { useConfirmacion } from "@/hooks/useConfirmar";
import { useDesactivarExpedienteVoluntario } from "./gestionVoluntariado/gestionHooks";
import { toast } from "sonner";

export const useCerrarExpedienteVoluntario = (id: number) => {
  const confirmar = useConfirmacion();
    const accion = useDesactivarExpedienteVoluntario(id);

    const ejecutarAccionExpedienteResidente = async () => {

    const confirmado = await confirmar(
      <>¿Estás seguro que quieres <strong>desactivar</strong> este expediente? Esta acción es permanente.</>,
      "destructive"
    );

    if (!confirmado) {
      toast("Acción cancelada");
      return;
    }

    await accion.mutateAsync();
  };

    return { ejecutarAccionExpedienteResidente };
};
