import { createFileRoute, useParams } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import HistorialNutricionPage from "@/modules/nutricion/components/HistorialNutricionPage";

export const Route = createFileRoute("/residentes/$id/nutricion/historial")({
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.nutricion.ver]),
  component: RouteComponent,
});

function RouteComponent() {
  // `id` de la ruta = id del expediente.
  const { id } = useParams({ from: "/residentes/$id/nutricion/historial" });
  return <HistorialNutricionPage expedienteId={Number(id)} />;
}
