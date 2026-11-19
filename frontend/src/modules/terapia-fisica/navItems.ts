import type { NavItemClinico } from "@/modules/residentes/components/ExpedienteClinicoLayout";
import { PERM } from "@/lib/permisosClinicos";

// Pantallas de Terapia Física, en el orden del Figma.
export const terapiaFisicaNavItems: NavItemClinico[] = [
  { label: "Valoración", to: "/residentes/$id/terapia-fisica/valoracion", perm: PERM.terapiaFisica.ver },
  { label: "Antecedentes traumáticos", to: "/residentes/$id/terapia-fisica/antecedentes-traumaticos", perm: PERM.terapiaFisica.ver },
  { label: "Índice de Barthel", to: "/residentes/$id/terapia-fisica/barthel", perm: PERM.terapiaFisica.ver },
  { label: "Escala de Tinetti", to: "/residentes/$id/terapia-fisica/tinetti", perm: PERM.terapiaFisica.ver },
  { label: "Test de Movimiento", to: "/residentes/$id/terapia-fisica/test-movimiento", perm: PERM.terapiaFisica.ver },
  { label: "Eventos importantes", to: "/residentes/$id/terapia-fisica/eventos", perm: PERM.terapiaFisica.ver },
];
