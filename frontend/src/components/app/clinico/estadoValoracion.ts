export type EstadoValoracion = "borrador" | "vigente" | "reemplazada";

export const etiquetaEstado: Record<EstadoValoracion, string> = {
  borrador: "En elaboración",
  vigente: "Cerrada (vigente)",
  reemplazada: "Cerrada (historial)",
};

export const varianteEstado: Record<EstadoValoracion, "pending" | "accepted" | "outline"> = {
  borrador: "pending",
  vigente: "accepted",
  reemplazada: "outline",
};
