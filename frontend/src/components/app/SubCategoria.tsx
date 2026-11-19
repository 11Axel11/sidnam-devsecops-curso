import type { SubCategoriasProps } from "../../types/subCategoriesProps"
import { useNavigate } from "@tanstack/react-router"
import SubCategoriesCard from "@/components/SubCategoriesCard"
import type { LucideIcon } from "lucide-react"

const CardSubCategorias = ({ subCategoriasItems }: SubCategoriasProps) => {
    const navigate = useNavigate();

    const gotoSubCategoria = (ruta: string, search?: Record<string, unknown>) => {
        navigate({
            to: ruta,
            search: search as never,
        });
    };
    
    return (
        <div className="flex justify-between mx-4 mb-4">
            {subCategoriasItems.map((subCategoria, idx) => (
                <SubCategoriesCard
                    key={idx}
                    subCategorieName={subCategoria.title}
                    subCategorieIcon={subCategoria.icon as LucideIcon}
                    action={() => gotoSubCategoria(subCategoria.url, subCategoria.search)}
                    url={subCategoria.url}
                />
            ))}
        </div>
    )
}

export default CardSubCategorias