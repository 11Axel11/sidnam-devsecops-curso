import { Badge } from "@/components/ui/badge";
import { useTogglePatologia } from "../../hooks/enfermeria/useTogglePatologia";
import type { BadgePatologiaProps } from "../../types/enfermeriaProps";

const BadgePatologia = ({ idPatologia, nombre }: BadgePatologiaProps) => {
  const { togglePatologia, patologias } = useTogglePatologia();
  const isSelected = patologias.includes(idPatologia);

  const handleClick = () => {
    togglePatologia(idPatologia);
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
      variant={isSelected ? "received" : "outline"}
      className={`
        cursor-pointer select-none text-sm transition-all duration-200 
        hover:opacity-80 hover:scale-105 active:scale-95
        
      `}
    >
      {nombre}
    </Badge>
  );
};

export default BadgePatologia;