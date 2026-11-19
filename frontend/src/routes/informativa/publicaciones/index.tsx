import { createFileRoute } from '@tanstack/react-router'
import PreviewModulo from '@/components/app/PreviewModulo'
import { HandHeart, FolderKanban, CalendarDays } from 'lucide-react'
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/informativa/publicaciones/')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Informativa.Eventos:Ver',
      'Informativa.Proyectos:Ver',
      'Donaciones.Solicitud Donaciones:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  const publicacionesSubItems = [
    {
      title: 'Solicitudes de donaciones',
      url: './donaciones',
      icon: HandHeart,
      description: 'Gestiona las publicaciones de solicitudes',
    },
    {
      title: 'Proyectos',
      url: './proyectos',
      icon: FolderKanban,
      description: 'Gestiona las publicaciones de proyectos',
    },
    {
      title: 'Eventos',
      url: './eventos',
      icon: CalendarDays,
      description: 'Gestiona las publicaciones de eventos',
    },
  ]
  return (
    <div>
      <PreviewModulo previewModuleSubItems={publicacionesSubItems} />
    </div>
  )
}
