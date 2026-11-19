import { Link } from '@tanstack/react-router'
import type { PreviewPublicacionProps } from "../types/publicaciones";

const CardPreviewPublicacion = ({ publicacion, link }: PreviewPublicacionProps) => {
  return (
    <Link
      to={link}
      params={{ id: String(publicacion.id) }}
      aria-label={`Ver detalles de ${publicacion.Titulo}`}
      className="group block h-full flex flex-col rounded-xl border bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200 w-[22rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <div className="w-11/12 mx-auto overflow-hidden rounded-lg bg-neutral-100 p-2 mt-2 h-36 sm:h-40">
        <img
          className="h-full w-full object-cover rounded-md transition-transform duration-300 group-hover:scale-105"
          src={publicacion.imagenUrl}
          alt={publicacion.Titulo}
        />
      </div>

      <div className="flex-1 flex flex-col gap-2 px-4 py-1">
        <h3 className="text-lg font-semibold text-gray-900 break-words hyphens-auto">{publicacion.Titulo}</h3>
      </div>

      <div className="px-4 pb-1">
        <p className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {publicacion.fecha}
        </p>
      </div>
    </Link>
  );
};

export default CardPreviewPublicacion;