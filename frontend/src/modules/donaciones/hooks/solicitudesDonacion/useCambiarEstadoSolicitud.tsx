import { useQueryClient } from "@tanstack/react-query";
import { useCambiarEstadoSolicitudDonacion, useGetEstadosSolicitudesDonacion } from "./solicitudesDonacionHook";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useCambiarEstadoSolicitud = () => {
    const queryClient = useQueryClient();
    const { idUsuario } = useAuth();
    const { estadosSolicitudesDonacion } = useGetEstadosSolicitudesDonacion();
    const cambiarEstadoMutation = useCambiarEstadoSolicitudDonacion();

    const cambiarEstado = (
        nombreEstado: string,
        idSolicitud: number,
        estadoActual: string
      ) => {
        if (estadoActual.toLowerCase() !== "pendiente") {
          toast.error("Solo puedes cambiar solicitudes pendientes");
          return;
        }

        if (!estadosSolicitudesDonacion) {
          toast.error("Los estados aún no están disponibles, espera un momento.");
          return;
        }
        if (!idUsuario) {
          toast.error("No se pudo obtener el usuario.");
          return;
        }

        const estado = estadosSolicitudesDonacion.find(
            (e) => e.nombre.toLowerCase() === nombreEstado.toLowerCase()
          );

          if (!estado) {
            toast.error(`Estado "${nombreEstado}" no encontrado.`);
            return;
          }

          const promise = cambiarEstadoMutation
            .mutateAsync({
              idEstadoSolicitud: estado.id,
              idSolicitud,
              idUsuario,
            })
            .then((data) => {
              queryClient.invalidateQueries({
                queryKey: ["solicitudesDonacion"],
              });
              return data;
            });

          toast.promise(promise, {
            loading: "Cambiando estado...",
            success: (data) => {
              const estado = nombreEstado.trim().toLowerCase();
    
              if (estado === "aceptada") {
                return {
                  message: data.message,
                  description:
                    "Puedes ver el registro de esta donación en la pestaña de gestión.",
                  type: "info",
                };
              }
    
              if (estado === "rechazada") {
                return {
                  message: data.message,
                  description:
                    "El solicitante ha sido notificado de tu decisión por correo.",
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
