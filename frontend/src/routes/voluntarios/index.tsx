import { sidebarItems } from '@/components/app/sidebar-items';
import PreviewModulo from '@/components/app/PreviewModulo';
import { createFileRoute, redirect } from '@tanstack/react-router'
import { ensurePerms, makeCan } from '@/services/authHelpers';
import type { SidebarChildItem } from '@/types/modulesPreviewProps';

export const Route = createFileRoute('/voluntarios/')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Voluntariado.Gestión Voluntariado:Ver',
      "Voluntariado.Solicitudes Voluntariado:Ver",
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})


const voluntariosSubItems =
  (sidebarItems.find((item) => item.title === "Voluntarios")?.children || [])
    .filter((child): child is SidebarChildItem => typeof child.url === "string");

  
function RouteComponent() {
  return <div>
    <PreviewModulo previewModuleSubItems={voluntariosSubItems}/>
  </div>
}
