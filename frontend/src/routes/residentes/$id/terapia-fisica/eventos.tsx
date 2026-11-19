import { createFileRoute, useParams } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import EventosPage from "@/modules/terapia-fisica/components/EventosPage";

export const Route = createFileRoute("/residentes/$id/terapia-fisica/eventos")({
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.terapiaFisica.ver]),
  component: RouteComponent,
});

function RouteComponent() {
  // `id` de la ruta = id del expediente.
  const { id } = useParams({ from: "/residentes/$id/terapia-fisica/eventos" });
  return <EventosPage expedienteId={Number(id)} />;
}
