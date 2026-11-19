import { createFileRoute } from "@tanstack/react-router";
import { requireAnyPerm } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import IfPerm from "@/components/auth/IfPerm";
import BotonReporteSemestral from "@/modules/terapia-fisica/components/BotonReporteSemestral";
import ExpedienteClinicoLayout from "@/modules/residentes/components/ExpedienteClinicoLayout";
import { terapiaFisicaNavItems } from "@/modules/terapia-fisica/navItems";

export const Route = createFileRoute("/residentes/$id/terapia-fisica")({
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.terapiaFisica.ver]),
  component: () => (
    <ExpedienteClinicoLayout
      titulo="Terapia Física"
      items={terapiaFisicaNavItems}
      acciones={<IfPerm perm={PERM.terapiaFisica.ver}><BotonReporteSemestral /></IfPerm>}
    />
  ),
});
