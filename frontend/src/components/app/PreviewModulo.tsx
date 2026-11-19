import ModuleCard from "@/components/ModuleCard";
import type { modulesPreviewProps } from "@/types/modulesPreviewProps";
import { useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

const PreviewModulo = ({ previewModuleSubItems }: modulesPreviewProps) => {
  const navigate = useNavigate();

  const gotoModulo = (ruta: string, search?: Record<string, unknown>) => {
    navigate({
      to: ruta,
      search: search as never,
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {previewModuleSubItems.map((modulo, idx) => (
        <ModuleCard
          key={idx}
          moduleName={modulo.title}
          moduleDescription={modulo.description}
          moduleIcon={modulo.icon as LucideIcon}
          action={() => gotoModulo(modulo.url, modulo.search)}
        />
      ))}
    </div>
  );
};

export default PreviewModulo;
