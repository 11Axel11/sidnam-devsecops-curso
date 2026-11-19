import { createFileRoute } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import ExpedienteClinicoLayout from "@/modules/residentes/components/ExpedienteClinicoLayout";
import { nutricionNavItems } from "@/modules/nutricion/navItems";

export const Route = createFileRoute("/residentes/$id/nutricion")({
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.nutricion.ver]),
  component: () => <ExpedienteClinicoLayout titulo="Nutrición" items={nutricionNavItems} />,
});
