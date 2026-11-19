import { toast } from "sonner";
import { useCambiarEstadoSolicitud } from "./useCambiarEstadoSolicitud";
import { useConfirmacion } from "@/hooks/useConfirmar";

export const useConfirmarCambiarEstadoSolicitud = () => {
  const confirmar = useConfirmacion();
  const accion = useCambiarEstadoSolicitud();

  const ejecutarAccionSolicitud = async (nombreEstado: string, idSolicitud: number, estadoActual: string) => {
    const estado =
      nombreEstado === "Aprobadas"
        ? "aceptar"
        : nombreEstado === "Rechazadas"
        ? "rechazar"
        : "";

    const confirmado = await confirmar(
      <>¿Estás seguro que quieres <strong>{estado}</strong> esta solicitud? Esta acción es permanente.</>,
      estado === "rechazar" ? "destructive" : "approve"
    );

    if (!confirmado) {
      toast("Acción cancelada");
      return;
    }

    accion(nombreEstado, idSolicitud, estadoActual);
  };

  return { ejecutarAccionSolicitud };
};