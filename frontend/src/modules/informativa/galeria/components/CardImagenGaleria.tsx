import { Button } from "@/components/ui/button";
import type { CardGaleriaProps } from "../types/galeria";
import { Plus } from "lucide-react";
import { useState } from "react";
import FormEditarImagen from "./FormEditarImagen";
import DeleteImagenDialog from "./DeleteImagenDialog";
import IfPerm from "@/components/auth/IfPerm";

const CardImagenGaleria = ({ imagenes, toggleModal }: CardGaleriaProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleSeeMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleModal(imagenes);
  };

  return (
    <div
      className="relative cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!imageLoaded && (
        <div className="w-full aspect-square rounded-2xl bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        className={`w-full aspect-square object-cover rounded-2xl transition-all duration-300 ${imageLoaded ? 'block' : 'hidden'}`}
        src={imagenes.imagenUrl}
        alt="Galeria Hogar San Blas"
        onLoad={() => setImageLoaded(true)}
      />

      <div className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 rounded-2xl transition-opacity duration-300 ${
        isHovered ? 'opacity-50' : 'opacity-0'
      }`}>

        <IfPerm perm="Informativa.Galeria:Actualizar">
          <FormEditarImagen id={imagenes.id} categoriaId={imagenes.categoriaId} />
        </IfPerm>

        <IfPerm perm="Informativa.Galeria:Eliminar">
          <DeleteImagenDialog id={imagenes.id} />
        </IfPerm>

        <Button
          onClick={handleSeeMore}
          className="p-2 bg-white bg-opacity-20 hover:bg-white/20 border-white border-2 transition-all duration-200"
          title="Ver imagen completa"
        >
          <Plus className="w-5 h-5 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default CardImagenGaleria;
