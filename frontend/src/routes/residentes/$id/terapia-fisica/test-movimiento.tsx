import { createFileRoute, useParams } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import TestMovimientoPage from "@/modules/terapia-fisica/components/TestMovimientoPage";

export const Route = createFileRoute("/residentes/$id/terapia-fisica/test-movimiento")({
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.terapiaFisica.ver]),
  component: RouteComponent,
});

function RouteComponent() {
  // `id` de la ruta = id del expediente.
  const { id } = useParams({ from: "/residentes/$id/terapia-fisica/test-movimiento" });
  return <TestMovimientoPage expedienteId={Number(id)} />;
}
