import { createFileRoute, useParams } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import AntecedentesTraumaticosPage from "@/modules/terapia-fisica/components/AntecedentesTraumaticosPage";

type Search = { valoracion?: number };

export const Route = createFileRoute("/residentes/$id/terapia-fisica/antecedentes-traumaticos")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const id = Number(search.valoracion);
    return { valoracion: Number.isInteger(id) && id > 0 ? id : undefined };
  },
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.terapiaFisica.ver]),
  component: RouteComponent,
});

function RouteComponent() {
  // `id` de la ruta = id del expediente.
  const { id } = useParams({ from: "/residentes/$id/terapia-fisica/antecedentes-traumaticos" });
  const { valoracion } = Route.useSearch();

  return <AntecedentesTraumaticosPage expedienteId={Number(id)} valoracionId={valoracion} />;
}
