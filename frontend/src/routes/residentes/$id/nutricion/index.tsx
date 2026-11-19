import { createFileRoute, redirect } from "@tanstack/react-router";

// El Historial (valoración vigente, controles y MNA en una pantalla) es la primera pantalla de Nutrición (CA-21).
export const Route = createFileRoute("/residentes/$id/nutricion/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/residentes/$id/nutricion/historial", params });
  },
});
