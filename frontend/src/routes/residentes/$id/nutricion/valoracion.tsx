import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import ValoracionNutricionalPage from "@/modules/nutricion/components/ValoracionNutricionalPage";

type Search = { valoracion?: number; nueva?: boolean };

export const Route = createFileRoute("/residentes/$id/nutricion/valoracion")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const id = Number(search.valoracion);
    return {
      valoracion: Number.isInteger(id) && id > 0 ? id : undefined,
      nueva: search.nueva === true || search.nueva === "true" ? true : undefined,
    };
  },
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.nutricion.ver]),
  component: RouteComponent,
});

function RouteComponent() {
  // `id` de la ruta = id del expediente.
  const { id } = useParams({ from: "/residentes/$id/nutricion/valoracion" });
  const { valoracion, nueva } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <ValoracionNutricionalPage
      expedienteId={Number(id)}
      valoracionId={valoracion}
      nueva={nueva}
      onAbrir={(vid, opciones) => navigate({ search: { valoracion: vid }, replace: opciones?.replace })}
      onNueva={() => navigate({ search: { nueva: true } })}
      onVolver={() => navigate({ search: {} })}
    />
  );
}
