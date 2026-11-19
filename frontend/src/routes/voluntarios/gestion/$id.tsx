import WebLoader from "@/components/Loader";
import CardInformacionVoluntario from "@/modules/voluntariado/components/CardInformacionVoluntario";
import { useGetExpedienteVoluntarioPorId } from "@/modules/voluntariado/hooks/gestionVoluntariado/gestionHooks";
import { ensurePerms, makeCan } from "@/services/authHelpers";
import { createFileRoute, redirect, useParams } from "@tanstack/react-router";
import z from "zod";

export const Route = createFileRoute("/voluntarios/gestion/$id")({
  component: RouteComponent,
  parseParams: (params) => ({
    id: z.coerce.number().int().positive().parse(params.id),
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Voluntariado.Gestion Voluntariado:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { id } = useParams({ from: "/voluntarios/gestion/$id" });

  const { expedienteVoluntario, fetchingExpedienteVoluntario, loadingExpedienteVoluntario } = useGetExpedienteVoluntarioPorId(id);

  if (loadingExpedienteVoluntario || fetchingExpedienteVoluntario || !expedienteVoluntario) {
    return <><WebLoader/></>
  }

  return (
    <section>
      <CardInformacionVoluntario variant="expediente" expediente={expedienteVoluntario} />
    </section>
  );
}
