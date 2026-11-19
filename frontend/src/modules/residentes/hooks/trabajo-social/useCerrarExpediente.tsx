import { toast } from "sonner";
import { useConfirmacion } from "@/hooks/useConfirmar";
import { useCambiarEstadoExpedienteResidente } from "./useCambiarEstadoExpedienteResidente";

export const useCerrarExpediente = () => {
  const confirmar = useConfirmacion();
    const accion = useCambiarEstadoExpedienteResidente();

    const ejecutarAccionExpedienteResidente = async (nombreEstado: string, idExpediente: number) => {
    const estado =
  nombreEstado === "Activo"
    ? "activar"
    : nombreEstado === "Inactivo"
    ? "cerrar"
    : "";

    const confirmado = await confirmar(
      <>¿Estás seguro que quieres <strong>{estado}</strong> este expediente? Esta acción es permanente.</>,
      estado === "cerrar" ? "destructive" : "approve"
    );

    if (!confirmado) {
      toast("Acción cancelada");
      return;
    }

    accion(nombreEstado, idExpediente);
  };

    return { ejecutarAccionExpedienteResidente };
};
