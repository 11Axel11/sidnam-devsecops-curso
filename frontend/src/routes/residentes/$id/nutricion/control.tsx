import { createFileRoute, useParams } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import ControlNutricionalPage from "@/modules/nutricion/components/ControlNutricionalPage";

export const Route = createFileRoute("/residentes/$id/nutricion/control")({
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.nutricion.ver]),
  component: RouteComponent,
});

function RouteComponent() {
  // `id` de la ruta = id del expediente.
  const { id } = useParams({ from: "/residentes/$id/nutricion/control" });
  return <ControlNutricionalPage expedienteId={Number(id)} />;
}
