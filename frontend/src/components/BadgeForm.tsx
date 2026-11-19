import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/pathNameMap";
import type { BadgeProps } from "@/types/badgeForm";

const BadgeForm = ({ id, nombre, onClick }: BadgeProps) => {

    const handleClick = () => {
        onClick(id, nombre);
    };

    return (
        <Badge
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            variant={"outline"}
            className={`
                cursor-pointer select-none text-sm transition-all duration-200 
                hover:opacity-80 hover:scale-105 active:scale-95
            `}
        >
            {capitalize(nombre)}
        </Badge>
    );
};

export default BadgeForm;