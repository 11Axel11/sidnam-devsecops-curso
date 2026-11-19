import { createFileRoute, redirect } from '@tanstack/react-router'
import { ensurePerms, makeCan } from '@/services/authHelpers'
import { ConfigSections } from '@/components/app/config-items';
import { AjustesPreview } from '@/components/app/AjustesPreview';

export const Route = createFileRoute('/ajustes/')({
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient);
    const { can, canAny } = makeCan(perms);

    const canSeeAnySection = ConfigSections.some(sec => {
      if (sec.perms) return sec.perms.every(can);
      if (sec.anyOf) return canAny(sec.anyOf);
      return true;
    });

    if (!canSeeAnySection) {
      throw redirect({ to: '/403', search: { from: location.href } });
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  
  return <AjustesPreview sections={ConfigSections} />
}
