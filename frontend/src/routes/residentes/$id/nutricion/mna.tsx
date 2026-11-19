import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import MnaPage from "@/modules/nutricion/components/MnaPage";

type Search = { nueva?: boolean };

export const Route = createFileRoute("/residentes/$id/nutricion/mna")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    nueva: search.nueva === true || search.nueva === "true" ? true : undefined,
  }),
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.nutricion.ver]),
  component: RouteComponent,
});

function RouteComponent() {
  // `id` de la ruta = id del expediente.
  const { id } = useParams({ from: "/residentes/$id/nutricion/mna" });
  const { nueva } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <div className="max-w-full">
      <MnaPage
        expedienteId={Number(id)}
        nueva={nueva}
        onNueva={() => navigate({ search: { nueva: true } })}
        onVolver={() => navigate({ search: {} })}
      />
    </div>
  );
}
