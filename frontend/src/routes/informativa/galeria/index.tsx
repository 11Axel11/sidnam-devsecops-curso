import WebLoader from '@/components/Loader';
import { Button } from '@/components/ui/button';
import BotonGaleria from '@/modules/informativa/galeria/components/BotonGaleria';
import CardImagenGaleria from '@/modules/informativa/galeria/components/CardImagenGaleria';
import FormAgregarImagen from '@/modules/informativa/galeria/components/FormAgregarImagen';
import ModalImagenGaleria from '@/modules/informativa/galeria/components/ModalImagenGaleria';
import { useGetImagenesPorCategoria, useGetTodasGaleria, useGetCategorias } from '@/modules/informativa/galeria/hooks/galeriaHooks';
import type { Galeria } from '@/modules/informativa/galeria/models/galeria';
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/informativa/galeria/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      img: typeof search.img === "string" ? search.img : undefined,
    };
  },
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Informativa.Galeria:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
});

function RouteComponent() {
  const { img } = Route.useSearch();
  const [selectedBtn, setSelectedBtn] = useState<number | null>(null);
  const { Categorias } = useGetCategorias();
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const limit = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<Galeria | null>(
    null
  );

  const {
    imagenes: todas,
    loadingImagenes,
    isFetching,
    isPlaceholderData,
  } = useGetTodasGaleria(page, limit);

  const isLoadingImages = loadingImagenes || isFetching;
  const { imagenesPorCategoria: filtradas } = useGetImagenesPorCategoria(
    selectedBtn ?? 0,
    page,
    limit
  );

  const Imagenes = (selectedBtn === null ? todas : filtradas) ?? [];
  const noHayMasPaginas = (Imagenes?.length ?? 0) < limit;

  const lastPage = () => {
    setPage((old) => Math.max(old - 1, 1));
  };

  const nextPage = () => {
    if (!isPlaceholderData && !noHayMasPaginas) {
      setPage((old) => old + 1);
    }
  };

  const setCategoria = (id: number | null) => {
    setSelectedBtn(id);
    setPage(1);
  };

  const verImagen = (imgId: string) => {
    const foundImage = todas?.find((img) => img.id.toString() === imgId);
    if (foundImage) {
      setImagenSeleccionada(foundImage);
      setModalOpen(true);
    }
  };

  useEffect(() => {
    if (img) {
      verImagen(img);
    }
  }, [img]);

  const handleImagenClick = (imagen: Galeria) => {
    setImagenSeleccionada(imagen);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setImagenSeleccionada(null);
    navigate({
      replace: true,
    });
  };

  return (
    <section className="h-full w-full">
      <nav className="flex justify-between items-center mb-2 mx-4 mt-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Galeria</h2>
        <div className='flex gap-2'>
          <Button variant="read" onClick={() => navigate({ to: "/informativa/galeria/categorias" })}>
            <Settings2/>
            Gestionar categorías
          </Button>
          <FormAgregarImagen/>
        </div>
      </nav>

      {(Categorias?.length ?? 0) === 0 && (
        <div className="mx-auto w-full text-center rounded-xl  bg-white p-8 mt-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Aún no se han creado categorías de imágenes</h2>
          <p className="text-sm text-gray-600">Puede agregar una categoría en el botón "Agregar categoría" para empezar a agregar imágenes a la galería.</p>
        </div>
      )}
      
      <div className="flex flex-col w-full gap-3 mt-6 justify-center items-center">
      {(Categorias?.length ?? 0) > 0 && (
        <>
        <div className="flex flex-wrap justify-center gap-2">
          <BotonGaleria
            children= 'Todas'
            isActive={selectedBtn === null}
            toggleCategoria={() => setCategoria(null)}
          />

          {Categorias?.map((categoria) => (
            <BotonGaleria
              key={categoria.id}
              children={categoria.nombre}
              isActive={selectedBtn === categoria.id}
              toggleCategoria={() => setCategoria(categoria.id)}
            />
          ))}
        </div>
        <p className="text-night max-w-lg text-center break-words hyphens-auto">
        {selectedBtn === null
          ? "Aquí puedes explorar todas las imágenes de nuestra galería."
          : Categorias?.find((c) => c.id === selectedBtn)?.descripcion}
        </p>
        </>
      )}

        <div
          className="mt-6 grid w-full justify-center [grid-template-columns:repeat(auto-fit,minmax(12rem,12rem))] gap-4 sm:gap-4 md:gap-4 lg:gap-6"
         >
          {isLoadingImages ? (
            <div className="col-span-full flex justify-center py-12">
              <WebLoader />
            </div>
          ) : (
            Imagenes &&
            Imagenes.map((imagenes) => (
              <CardImagenGaleria
                key={imagenes.id}
                imagenes={imagenes}
                toggleModal={handleImagenClick}
              />
            ))
          )}
        </div>
        
        {(todas?.length ?? 0) === 0 && (selectedBtn === null) && (page === 1) && (Categorias?.length ?? 0) > 0 && (
          <p className="text-sm text-gray-600">No hay imágenes aún.</p>
        )}

        {(filtradas?.length ?? 0) === 0 && (selectedBtn !== null) && (page === 1) && (Categorias?.length ?? 0) > 0 && (
          <p className="text-sm text-gray-600">No hay imágenes en esta categoría.</p>
        )}

        {(Imagenes?.length ?? 0) === 0 && (page !== 1) && (Categorias?.length ?? 0) > 0 && (
          <p className="text-sm text-gray-600">No hay más imágenes. Volver a la página anterior.</p>
        )}

        <div className="flex justify-center items-center gap-4 mt-4">
          <Button
            variant="outline"
            onClick={lastPage}
            disabled={page === 1}
            className="hover:cursor-pointer  disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </Button>
          <p>Página {page}</p>
          <Button
            variant="outline"
            onClick={nextPage}
            disabled={noHayMasPaginas || isPlaceholderData}
            className="hover:cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      <ModalImagenGaleria
        open={modalOpen}
        imagen={imagenSeleccionada}
        onClose={handleCloseModal}
      />
    </section>
  );
}
