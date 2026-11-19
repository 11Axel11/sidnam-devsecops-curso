import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useGetProyectos, usePatchHandleProyecto } from '@/modules/informativa/publicaciones/hooks/publicacionesHooks'
import WebLoader from '@/components/Loader'
import type { Publicacion } from '@/modules/informativa/publicaciones/models/publicaciones'
import CardPreviewPublicacion from '@/modules/informativa/publicaciones/components/CardPreviewPublicacion'
import { ChevronFirst, ChevronLast } from 'lucide-react'
import FormAgregarPublicacion from '@/modules/informativa/publicaciones/components/FormAgregarPublicacion'
import { useCreateProyecto } from '@/modules/informativa/publicaciones/hooks/publicacionesHooks'
import type { CreatePublicacion } from '@/modules/informativa/publicaciones/models/publicaciones'
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { redirect } from '@tanstack/react-router'
import IfPerm from "@/components/auth/IfPerm";
import { toast } from 'sonner'
import ArchivadosDialogo from '@/modules/informativa/publicaciones/components/ArchivadosDialogo'

export const Route = createFileRoute('/informativa/publicaciones/proyectos/')({
  component: RouteComponent,
    beforeLoad: async ({ context, location }) => {
      const perms = await ensurePerms(context.queryClient)
      const { canAny } = makeCan(perms)
      const ok = canAny([
        'Informativa.Proyectos:Ver',
      ])
      if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
    },
})

function RouteComponent() {
  const { patchHandleProyecto } = usePatchHandleProyecto()

  const handleRestaurar = (id: number) => {
    patchHandleProyecto(
      { id },
      {
        onSuccess: () => toast.success('Proyecto restaurado correctamente'),
        onError: () => toast.error('Error al restaurar el proyecto'),
      }
    )
  }

  const [page, setPage] = useState(1)
  const limit = 6

  const { proyectos, total, isPlaceholderData, loadingProyectos, fetchingProyectos } =
  useGetProyectos(page, limit);

  const { createProyecto } = useCreateProyecto();

  const handleAgregarPublicacion = (publicacion: CreatePublicacion) => {
    createProyecto(publicacion);
  }
    
  const totalPages = Math.ceil(total / limit);
  const isLastPage = page >= totalPages;

  const prevPage = () => setPage((p) => Math.max(p - 1, 1));

  const nextPage = () => {
      if (!isPlaceholderData && !isLastPage) {
      setPage((p) => p + 1);
      }
  };

  if (loadingProyectos || fetchingProyectos) {
      return <WebLoader />;
  }

  return (
    <div className="w-full">
      <nav className="flex justify-between items-center mb-1 mt-4 mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Publicaciones de proyectos</h2>
        <div className="flex gap-2">
          <IfPerm perm="Informativa.Proyectos:Actualizar">
            <ArchivadosDialogo type="proyecto" onRestore={handleRestaurar} />
          </IfPerm>
          <IfPerm perm="Informativa.Proyectos:Crear">
            <FormAgregarPublicacion onSubmit={handleAgregarPublicacion} tipo="proyecto" />
          </IfPerm>
        </div>
      </nav>
      <section className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center items-stretch"
        >
          {proyectos?.map((proyecto: Publicacion) => (
            <CardPreviewPublicacion key={proyecto.id} publicacion={proyecto} link={`/informativa/publicaciones/proyectos/${proyecto.id}`} />
          ))}
        </div>
        {!isPlaceholderData && proyectos.length > 0 && (
          <div className="flex justify-center items-center gap-4">
            <button
              onClick={prevPage}
              disabled={page === 1}
              aria-label="Página anterior"
              className="inline-flex items-center justify-center h-9 w-9 rounded-md border text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <ChevronFirst size={20} />
            </button>
            <button>
              Página {page} de {totalPages}
            </button>
            <button
              onClick={nextPage}
              disabled={isLastPage}
              aria-label="Página siguiente"
              className="inline-flex items-center justify-center h-9 w-9 rounded-md border text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <ChevronLast size={20} />
            </button>
          </div>
        )}
        {!loadingProyectos && !fetchingProyectos && total === 0 && (
          <div className="mx-auto w-full text-center rounded-xl  bg-white p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No hay publicaciones de proyectos</h2>
            <p className="text-sm text-gray-600">Puede agregar un proyecto en el botón "Agregar proyecto" para que se refleje en la página web informativa.</p>
          </div>
        )}
      </section>
    </div>
  )
}
