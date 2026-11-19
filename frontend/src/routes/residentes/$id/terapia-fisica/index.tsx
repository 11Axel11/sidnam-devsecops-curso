import { createFileRoute, redirect } from "@tanstack/react-router";

// Valoración es la primera pantalla de Terapia Física.
export const Route = createFileRoute("/residentes/$id/terapia-fisica/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/residentes/$id/terapia-fisica/valoracion", params });
  },
});
