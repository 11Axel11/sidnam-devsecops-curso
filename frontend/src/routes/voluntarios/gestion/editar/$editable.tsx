import CardEditarExpedienteVoluntariado from "@/modules/voluntariado/components/CardEditarExpediente";
import { useGetExpedienteVoluntarioPorId } from '@/modules/voluntariado/hooks/gestionVoluntariado/gestionHooks';
import { adaptExpedienteToEditar } from '@/modules/voluntariado/models/accionesExpediente';
import { ensurePerms, makeCan } from "@/services/authHelpers";
import { createFileRoute, redirect, useParams } from '@tanstack/react-router'
import z from 'zod'

export const Route = createFileRoute('/voluntarios/gestion/editar/$editable')({
  component: RouteComponent,
  parseParams: (params) => ({
      editable: z.coerce.number().int().positive().parse(params.editable),
    }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Voluntariado.Gestion Voluntariado:Actualizar',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
});

function RouteComponent() {
  const { editable } = useParams({
    from: "/voluntarios/gestion/editar/$editable",
  });
  
  const {
    expedienteVoluntario,
    loadingExpedienteVoluntario,
    errorExpedienteVoluntario,
  } = useGetExpedienteVoluntarioPorId(editable);

  if (loadingExpedienteVoluntario) return <p>Cargando...</p>;
  if (errorExpedienteVoluntario) return <p>Error al cargar el expediente</p>;
  if (!expedienteVoluntario) return <p>No se encontró el expediente</p>;

  const expedienteAdaptado = adaptExpedienteToEditar(expedienteVoluntario);

  return <section>
    <CardEditarExpedienteVoluntariado expediente={expedienteAdaptado} />
  </section>
}
