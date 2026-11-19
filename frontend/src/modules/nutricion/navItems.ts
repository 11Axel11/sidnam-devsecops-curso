import type { NavItemClinico } from "@/modules/residentes/components/ExpedienteClinicoLayout";
import { PERM } from "@/lib/permisosClinicos";

// Pantallas de Nutrición, en el orden del Figma.
export const nutricionNavItems: NavItemClinico[] = [
  { label: "Historial", to: "/residentes/$id/nutricion/historial", perm: PERM.nutricion.ver },
  { label: "Valoración nutricional", to: "/residentes/$id/nutricion/valoracion", perm: PERM.nutricion.ver },
  { label: "Control nutricional", to: "/residentes/$id/nutricion/control", perm: PERM.nutricion.ver },
  { label: "Mini Nutritional Assessment", to: "/residentes/$id/nutricion/mna", perm: PERM.nutricion.ver },
];
