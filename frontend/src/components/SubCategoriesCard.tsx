import type { SubCategorieCardProps } from "@/types/subCategorieCard";
import { Card, CardTitle } from "./ui/card";
import { useLocation } from "@tanstack/react-router";

const SubCategoriesCard = ({
    subCategorieName,
    subCategorieIcon: Icon,
    action,
    url
}: SubCategorieCardProps & { url?: string }) => {
    const location = useLocation();
    const isActive = url ? location.pathname.includes(url) : false;

    return (
        <div onClick={action} className="max-w-72">
            <Card 
                className={`hover:cursor-pointer hover:bg-gray-100 w-72 h-6 ${isActive ? 'border-2 border-gray-300 shadow-lg' : ''}`}
            >
                <div className="flex items-center align-center justify-center h-full gap-5">
                    <Icon size={20} className="text-primary" />
                    <CardTitle className="hover:cursor-pointer">{subCategorieName}</CardTitle>
                </div>
            </Card>
        </div>
    )
}

export default SubCategoriesCard