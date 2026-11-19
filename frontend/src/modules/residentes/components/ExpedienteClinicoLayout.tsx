import type { ReactNode } from "react";
import { Link, Outlet, useMatchRoute, useParams } from "@tanstack/react-router";
import IfPerm from "@/components/auth/IfPerm";
import { cn } from "@/lib/utils";
import { useExpedienteActivo } from "@/components/app/clinico/useExpedienteActivo";
import { Tabs, TabsList, TabsTrigger } from "@/components/animate-ui/components/radix/tabs";

export type NavItemClinico = {
  label: string;
  /** Ruta bajo /residentes/$id, p. ej. "/residentes/$id/terapia-fisica/valoracion". */
  to: string;
  /** Permiso `Modulo.Seccion:Accion` necesario para ver el item (opcional). */
  perm?: string;
};

type Props = {
  titulo: string;
  items: NavItemClinico[];
  /** Acciones de la sección (p. ej. un botón de reporte), a la derecha de las pestañas. */
  acciones?: ReactNode;
};

// Layout compartido por las secciones clínicas del expediente. La cabecera del residente y las
// pestañas superiores las pone `routes/residentes/$id/route.tsx`; aquí va la fila de pestañas con
// las pantallas de la sección (mismo estilo que Enfermería) y el contenido de la pantalla activa.
export default function ExpedienteClinicoLayout({ titulo, items, acciones }: Props) {
  const { id } = useParams({ strict: false }) as { id: number };
  const matchRoute = useMatchRoute();
  const { activo, motivo } = useExpedienteActivo(Number(id));

  // La pestaña activa sale de la ruta (no de un estado local): se toma la ruta más específica
  // que coincide, para que una subpantalla mantenga resaltada la pestaña de su sección.
  // `id` llega ya convertido a número por la ruta, pero `matchRoute` compara contra texto.
  const activa = items
    .filter((item) => matchRoute({ to: item.to as never, params: { id: String(id) } as never, fuzzy: true }))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;

  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-7xl">
        {!activo && (
          <p role="status" className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-sm text-amber-900">
            {motivo}
          </p>
        )}
        {items.length > 0 && (
          // "manual": las flechas solo mueven el foco; activar (clic/Enter) es lo que navega el Link.
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={activa ?? ""} activationMode="manual">
            <TabsList aria-label={`Pantallas de ${titulo}`} className="bg-muted-foreground/10 flex-wrap h-auto">
              {items.map((item) => (
                <IfPerm key={item.to} perm={item.perm}>
                  <TabsTrigger
                    value={item.to}
                    // Texto blanco explícito sobre el resaltado rosa: el Link no siempre recibe el
                    // `data-state=active` del trigger, y sin esto queda gris sobre rosa.
                    className={cn("text-xs sm:text-sm no-underline", item.to === activa && "text-white hover:text-white")}
                    asChild
                  >
                    <Link
                      // Las rutas de cada pantalla se agregan con ella; aquí llegan como string.
                      to={item.to as never}
                      params={{ id } as never}
                    >
                      {item.label}
                    </Link>
                  </TabsTrigger>
                </IfPerm>
              ))}
            </TabsList>
          </Tabs>
          {acciones}
          </div>
        )}
        <div className="min-w-0 text-left">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
