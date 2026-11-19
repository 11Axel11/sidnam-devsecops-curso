import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEditEstadoExpedienteResidente, useGetEstadosExpedienteResidente } from "./trabajoSocialHooks";


export const useCambiarEstadoExpedienteResidente = () => {
  const queryClient = useQueryClient();
  const { EstadosExpedienteResidente } =
    useGetEstadosExpedienteResidente();
  const { idUsuario } = useAuth();
  const cambiarEstadoMutation = useEditEstadoExpedienteResidente();

  const cambiarEstado = (
    nombreEstado: string,
    idExpediente: number,
  ) => {
    if (!EstadosExpedienteResidente) {
      toast.error("Los estados aún no están disponibles, espera un momento.");
      return;
    }
    if (!idUsuario) {
      toast.error("No se pudo obtener el usuario.");
      return;
    }

    const estado = EstadosExpedienteResidente.find(
      (e) => e.nombre.toLowerCase() === nombreEstado.toLowerCase()
    );

    if (!estado) {
      toast.error(`Estado "${nombreEstado}" no encontrado.`);
      return;
    }

    const promise = cambiarEstadoMutation
      .mutateAsync({
        idEstadoExpediente: estado.id,
        idExpediente,
        idUsuario,
      })
      .then((data) => {
        queryClient.invalidateQueries({
          queryKey: ["expedienteResidenteId", idExpediente],
        });
        queryClient.invalidateQueries({
          queryKey: ["expedienteResidenteResumenId", idExpediente],
        });
        return data;
      });

    toast.promise(promise, {
      loading: "Cambiando estado...",
      success: (data) => {
        const estado = nombreEstado.trim().toLowerCase();

        if (estado === "activo") {
          return {
            message: data.message,
            description:
              "Puedes ver el expediente del voluntario en la pestaña de gestión.",
            type: "info",
          };
        }

        if (estado === "inactivo") {
          return {
            message: data.message,
            description:
              "Se ha cerrado el expediente.",
            type: "info",
          };
        }

        return {
          message: data.message ?? "Estado actualizado correctamente",
          description: "Se ha guardado el cambio.",
          type: "info",
        };
      },
      error: (err) => {
        return {
          message: "Error al cambiar el estado",
          description: err?.response?.data?.message ?? "Error al cambiar el estado",
          type: "error",
        };
      },
    });
  };

  return cambiarEstado;
};
