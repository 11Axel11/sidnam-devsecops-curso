import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import BarthelPage from "@/modules/terapia-fisica/components/BarthelPage";

type Search = { nueva?: boolean };

export const Route = createFileRoute("/residentes/$id/terapia-fisica/barthel")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    nueva: search.nueva === true || search.nueva === "true" ? true : undefined,
  }),
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.terapiaFisica.ver]),
  component: RouteComponent,
});

function RouteComponent() {
  // `id` de la ruta = id del expediente.
  const { id } = useParams({ from: "/residentes/$id/terapia-fisica/barthel" });
  const { nueva } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <BarthelPage
      expedienteId={Number(id)}
      nueva={nueva}
      onNueva={() => navigate({ search: { nueva: true } })}
      onVolver={() => navigate({ search: {} })}
    />
  );
}
