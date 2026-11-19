import { Link, useRouterState } from "@tanstack/react-router";
import { buildPathNameMap, capitalize } from "@/lib/pathNameMap";
import { ChevronRight } from "lucide-react";
import type { Sede } from "@/store/sedeStore";
import { nombreSede } from "@/lib/sede";
import { nombreCategoria } from "@/modules/inventarios/permissions";

const pathNameMap = buildPathNameMap();

const entityLabelMap: Record<string, string> = {
  "/voluntarios/solicitudes": "Solicitud",
  "/voluntarios/gestion": "Voluntario",
  "/donaciones/solicitudes": "Solicitud",
  "/donaciones/gestion": "Donación",
  "/informativa/publicaciones/eventos": "Evento",
  "/informativa/publicaciones/donaciones": "Donación",
  "/informativa/publicaciones/proyectos": "Proyecto",
  "/residentes": "Expediente",
};

// Segmentos de URL cuyo nombre lleva tilde o difiere del segmento.
const segmentLabelMap: Record<string, string> = {
  nutricion: "Nutrición",
  catalogos: "Catálogos",
  valoracion: "Valoración",
  historial: "Historial",
  control: "Control nutricional",
  mna: "Mini Nutritional Assessment",
  barthel: "Índice de Barthel",
  tinetti: "Escala de Tinetti",
  "test-movimiento": "Test de Movimiento",
  eventos: "Eventos importantes",
  "antecedentes-traumaticos": "Antecedentes traumáticos",
  "terapia-fisica": "Terapia Física",
};

type Crumb = { label: string; to: string; search?: Record<string, unknown> };

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sede = useRouterState({
    select: (s) => (s.location.search as { sede?: Sede }).sede,
  });
  const segments = pathname.split("/").filter(Boolean);
  const isInventarios = segments[0] === "inventarios";

  let crumbs: Crumb[];

  if (isInventarios) {
    crumbs = [{ label: "Inventarios", to: "/inventarios", search: { sede: undefined } }];
    if (sede) {
      crumbs.push({ label: nombreSede[sede], to: "/inventarios", search: { sede } });
    }
    const [, categoryId, seccion] = segments;
    if (categoryId) {
      const nombre = nombreCategoria[categoryId] ?? `Inventario #${categoryId}`;
      crumbs.push({ label: nombre, to: `/inventarios/${categoryId}`, search: { sede } });
    }
    if (seccion) {
      crumbs.push({
        label: capitalize(seccion.replace(/-/g, " ")),
        to: `/inventarios/${categoryId}/${seccion}`,
        search: { sede },
      });
    }
  } else {
    const isHistorial =
      segments.length >= 4 && segments[1] === "gestion" && segments[2] === "historial";
    const isEditar =
      segments.length >= 4 && segments[1] === "gestion" && segments[2] === "editar";

    const filteredSegments =
      isHistorial || isEditar ? [segments[0], segments[1], segments[3]] : segments;

    crumbs = filteredSegments.map((segment, index) => {
      const fullPath = "/" + filteredSegments.slice(0, index + 1).join("/");
      const isLast = index === filteredSegments.length - 1;

      let label = capitalize(
        pathNameMap[fullPath.toLowerCase()] || segmentLabelMap[segment] || segment.replace(/-/g, " ")
      );

      const basePath = "/" + filteredSegments.slice(0, -1).join("/");

      if (!isNaN(Number(segment)) && isLast && entityLabelMap[basePath]) {
        label = `${entityLabelMap[basePath]} #${segment}`;
      }

      if (segments[0] === "proveeduria" && !isNaN(Number(segment))) {
        if (index === 1) label = `Área #${segment}`;
        else if (index === 2) label = `Proveedor #${segment}`;
      }

      return { label, to: fullPath };
    });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-sm text-muted-foreground flex items-center flex-wrap"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.to}-${index}`} className="text-sm flex items-center">
            {!isLast ? (
              <>
                <Link
                  to={crumb.to}
                  search={crumb.search}
                  className="text-muted-foreground hover:underline transition-colors"
                >
                  {crumb.label}
                </Link>
                <ChevronRight size={17} className="mt-1" />
              </>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
