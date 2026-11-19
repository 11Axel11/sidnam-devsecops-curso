import { createFileRoute, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FormSalidas from '@/modules/inventarios/components/FormSalidas'
import { ensurePerms, makeCan } from '@/services/authHelpers';
import GoToDashboard from '@/components/GoToDashboard';
import logoHogarSanBlas from "@/assets/logo_hogar_san_blas.webp";

export const Route = createFileRoute('/salidas')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): { inventarioId?: string } => {
    return {
      inventarioId: search.inventarioId as string | undefined
    }
  },
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Inventariado.Salidas:Ver',
      'Inventariado.Salidas:Actualizar',
      'Inventariado.Salidas:Eliminar',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
})

function RouteComponent() {
  return (
    <div className='flex justify-center items-center h-screen w-screen bg-amaranthPink'>
      <Card className="w-11/12 sm:w-full max-w-2xl h-full max-h-[90vh] shadow-xl overflow-hidden">
        <div className="flex flex-col">
          <div className="flex justify-start ml-4">
            <GoToDashboard />
          </div>
          <div className="flex justify-center mt-4 sm:mt-8 xl:mt-1 h-20 sm:h-24 md:h-32 xl:h-24 xl:overflow-hidden">
            <img className={logoHogarSanBlas} src="/logo_hogar_san_blas.webp" alt="Logo Hogar San Blas" />
          </div>
        </div>
        <CardHeader>
          <CardTitle className="flex flex-col items-center mt-1 sm:mt-8 xl:mt-2 xl:mb-0">
            <span className="text-md sm:text-xl xl:text-lg font-bold mb-1">Registro de salidas</span>
            <span className="text-md sm:text-xl xl:text-lg text-gray-500">SIDNAM</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-0 sm:mt-6 xl:mt-0 xl:h-full xl:overflow-hidden overflow-auto">
          <FormSalidas />
        </CardContent>
      </Card>
    </div>
  )
}
