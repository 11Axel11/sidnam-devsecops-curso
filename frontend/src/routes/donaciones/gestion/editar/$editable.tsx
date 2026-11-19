import CardEditarDonacion from '@/modules/donaciones/components/CardEditarDonacion';
import { useGetRegistroDonacionPorId } from '@/modules/donaciones/hooks/gestionDonacion/gestionDonacionesHooks';
import { adaptRegistroDonacionToEditar } from '@/modules/donaciones/models/accionesRegistro';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, redirect, useParams } from '@tanstack/react-router'
import z from 'zod'

export const Route = createFileRoute('/donaciones/gestion/editar/$editable')({
  component: RouteComponent,
  parseParams: (params) => ({
    editable: z.coerce.number().int().positive().parse(params.editable),
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Donaciones.Gestión Donaciones:Actualizar'
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const { editable } = useParams({
    from: "/donaciones/gestion/editar/$editable",
  });

  const {
    registroDonacion,
    loadingRegistroDonacion,
    errorRegistroDonacion,
  } = useGetRegistroDonacionPorId(editable);

  if (loadingRegistroDonacion) return <p>Cargando...</p>;
  if (errorRegistroDonacion) return <p>Error al cargar el registro</p>;
  if (!registroDonacion) return <p>No se encontró el registro</p>;

  const registroAdaptado = adaptRegistroDonacionToEditar(registroDonacion);

  return <section>
    <CardEditarDonacion registro={registroAdaptado} />
  </section>
}
