import { createFileRoute } from '@tanstack/react-router'
import { requireAnyPerm } from '@/services/authHelpers'
import { PERM } from '@/lib/permisosClinicos'
import CatalogoAdmin from '@/modules/catalogos/components/CatalogoAdmin'

export const Route = createFileRoute('/ajustes/catalogos')({
  beforeLoad: ({ context, location }) => requireAnyPerm(context, location, [PERM.catalogos.ver]),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Administrar catálogos</h1>
          <p className="text-sm text-muted-foreground">
            Los ítems se desactivan, no se eliminan: las valoraciones guardadas conservan su referencia.
          </p>
        </div>
        <CatalogoAdmin />
      </div>
    </section>
  )
}
