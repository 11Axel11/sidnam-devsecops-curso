import type { BotonGaleriaProps } from "../types/galeria";

const BotonGaleria = ({
  children,
  isActive,
  toggleCategoria,
}: BotonGaleriaProps) => {
  return (
    <button
      onClick={toggleCategoria}
      className={`font-poppins font-medium
        ${
          isActive
            ? "bg-amaranthPink text-white border-white"
            : "border-1 border-amaranthPink bg-transparent text-night hover:bg-gray-200 hover:text-black"
        }
        py-1 px-3 sm:py-1 sm:px-3 md:py-1 md:px-4
        rounded-3xl shadow 
        transition-colors duration-300 cursor-pointer
        max-w-[180px] text-xs sm:text-sm md:text-base truncate text-center
      `}
    >
      {children}
    </button>
  );
};

export default BotonGaleria;