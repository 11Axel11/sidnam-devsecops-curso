import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useGetEstadosSolicitudesVoluntario,
  useCambiarEstadoSolicitudVoluntariado,
} from "./solicitudesHooks";

export const useCambiarEstadoSolicitud = () => {
  const queryClient = useQueryClient();
  const { estadosSolicitudesVoluntariado } =
    useGetEstadosSolicitudesVoluntario();
  const { idUsuario } = useAuth();
  const cambiarEstadoMutation = useCambiarEstadoSolicitudVoluntariado();

  const cambiarEstado = (
    nombreEstado: string,
    idSolicitud: number,
    estadoActual: string
  ) => {
    if (estadoActual.toLowerCase() !== "pendiente") {
      toast.error("Solo puedes cambiar solicitudes pendientes");
      return;
    }

    if (!estadosSolicitudesVoluntariado) {
      toast.error("Los estados aún no están disponibles, espera un momento.");
      return;
    }
    if (!idUsuario) {
      toast.error("No se pudo obtener el usuario.");
      return;
    }

    const estado = estadosSolicitudesVoluntariado.find(
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
          queryKey: ["solicitudesVoluntariado"],
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
              "Puedes ver el expediente del voluntario en la pestaña de gestión.",
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
