import WebLoader from "@/components/Loader";
import CardInformacionVoluntario from "@/modules/voluntariado/components/CardInformacionVoluntario";
import { useGetSolicitudesVoluntarioPorId } from "@/modules/voluntariado/hooks/solicitudesVoluntariado/solicitudesHooks";
import { ensurePerms, makeCan } from "@/services/authHelpers";
import { createFileRoute, redirect, useParams } from "@tanstack/react-router";
import z from "zod";

export const Route = createFileRoute("/voluntarios/solicitudes/$id")({
  component: RouteComponent,
  parseParams: (params) => ({
    id: z.coerce.number().int().positive().parse(params.id),
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Voluntariado.Solicitudes Voluntariado:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
});

function RouteComponent() {
  const { id } = useParams({ from: "/voluntarios/solicitudes/$id" });

  const { solicitudVoluntariado,loadingSolicitudVoluntariado, fetchingSolicitudVoluntariado } = useGetSolicitudesVoluntarioPorId(id);

  if (loadingSolicitudVoluntariado || fetchingSolicitudVoluntariado || !solicitudVoluntariado) {
    return <><WebLoader/></>
  }

  return (
    <section>
      <CardInformacionVoluntario variant="solicitud" solicitud={solicitudVoluntariado} />
    </section>
  );
}
