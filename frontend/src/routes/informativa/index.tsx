import { sidebarItems } from '@/components/app/sidebar-items';
import PreviewModulo from '@/components/app/PreviewModulo';
import { createFileRoute } from '@tanstack/react-router'
import type { SidebarChildItem } from '@/types/modulesPreviewProps';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/informativa/')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Informativa.Eventos:Ver',
      'Informativa.Galeria:Ver',
      'Informativa.Proyectos:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

const informativaSubItems =
  (sidebarItems.find((item) => item.title === "Informativa")?.children || [])
    .filter((child): child is SidebarChildItem => typeof child.url === "string");

function RouteComponent() {
  return <div>
    <PreviewModulo previewModuleSubItems={informativaSubItems} />
  </div>
}
