import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmacion } from "@/hooks/useConfirmar";
import { mensajeError } from "@/utils/apiError";
import { useEditEstadoExpedienteResidente, useGetEstadosExpedienteResidente } from "./trabajo-social/trabajoSocialHooks";

// Reactivar un expediente inactivo desde el menú «Opciones». Reutiliza la mutación de cambio de estado
// (`useEditEstadoExpedienteResidente`, que ya invalida el resumen del expediente y así desaparecen la insignia
// «Inactivo» y el aviso, y se habilitan los botones clínicos sin recargar) sin cambiar el hook de cierre.
// El backend (`ResidentesService.cambiarEstado`) fija `fecha_ingreso` en hoy al reactivar: la confirmación lo dice.
export const useReactivarExpediente = () => {
  const confirmar = useConfirmacion();
  const { idUsuario } = useAuth();
  const { EstadosExpedienteResidente } = useGetEstadosExpedienteResidente();
  const mutacion = useEditEstadoExpedienteResidente();

  const reactivar = async (idExpediente: number) => {
    const activo = EstadosExpedienteResidente?.find((e) => e.nombre.toLowerCase() === "activo");
    if (!activo) {
      toast.error("Los estados aún no están disponibles, espera un momento.");
      return;
    }
    if (!idUsuario) {
      toast.error("No se pudo obtener el usuario.");
      return;
    }

    const confirmado = await confirmar(
      "¿Reactivar este expediente? Volverá a estar activo y se podrán registrar y modificar datos clínicos otra vez " +
      "(Nutrición y Terapia Física). Se actualizará la fecha de ingreso a hoy.",
      "approve",
    );
    if (!confirmado) {
      toast("Acción cancelada");
      return;
    }

    toast.promise(
      mutacion.mutateAsync({ idEstadoExpediente: activo.id, idExpediente, idUsuario }),
      {
        loading: "Reactivando expediente...",
        success: { message: "Expediente reactivado", description: "Ya se pueden registrar datos clínicos." },
        // Se muestra el mensaje del backend tal cual (404 sin expediente, 400 si ya estaba activo…).
        error: (err) => ({ message: "No se pudo reactivar el expediente", description: mensajeError(err, "Error al cambiar el estado") }),
      },
    );
  };

  return { reactivar };
};
