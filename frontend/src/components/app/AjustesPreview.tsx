import { useMemo } from "react";
import AjustesItem from "./AjustesItem";
import type { ConfigSection } from "@/types/adjItem";
import { useAuthz } from "@/hooks/useAuth";

export function AjustesPreview({ sections }: { sections: ConfigSection[] }) {
  const { can, canAny, isLoading } = useAuthz({ ignoreWildcard: true, normalize: true });

  const visible = useMemo(() => {
    if (isLoading) return [];
    return sections
      .filter((sec) => {
        if (sec.perms) return sec.perms.every(can);
        if (sec.anyOf) return canAny(sec.anyOf);
        return true;
      })
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => {
          if (it.perms) return it.perms.every(can);
          if (it.anyOf) return canAny(it.anyOf);
          return true;
        }),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [sections, can, canAny, isLoading]);

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Cargando permisos…</div>;
  }

  if (visible.length === 0) {
    return <p className="text-center text-muted-foreground">No tienes opciones de ajustes disponibles.</p>;
  }

  return (
    <div className="space-y-8">
      {visible.map((sec) => (
        <section key={sec.title}>
          <h2 className="text-lg font-semibold">{sec.title}</h2>
          {sec.description && (
            <p className="text-sm text-muted-foreground mb-3">{sec.description}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {sec.items.map((item, i) => (
              <AjustesItem
                key={`${sec.title}-${i}`}
                configIcon={item.icon}
                configName={item.title}
                DialogComponent={item.dialogComponent}
                url={item.url}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
