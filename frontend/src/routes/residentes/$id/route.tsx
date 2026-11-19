import IfPerm from "@/components/auth/IfPerm";
import WebLoader from "@/components/Loader";
import CardInfoGlobalResidente from "@/modules/residentes/components/CardInfoGeneralResidente";
import { ExpedienteEstadoContext } from "@/modules/residentes/context/expedienteEstadoContext";
import { useGetResumenExpedienteResidente } from "@/modules/residentes/hooks/expedientesHooks";
import { useCerrarExpediente } from "@/modules/residentes/hooks/trabajo-social/useCerrarExpediente";
import { useReactivarExpediente } from "@/modules/residentes/hooks/useReactivarExpediente";
import { useDescargarExpedienteResidente } from "@/modules/residentes/hooks/residentesHooks";
import { ensurePerms, makeCan } from "@/services/authHelpers";
import { PERM } from "@/lib/permisosClinicos";
import FichaResumenDialogo from "@/modules/ficha-resumen/components/FichaResumenDialogo";
import {
  createFileRoute,
  Outlet,
  Link,
  useParams,
  useLocation,
  redirect,
} from "@tanstack/react-router";
import z from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileDown,
  BookMinus,
  BookOpen,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/residentes/$id")({
  component: ExpedienteResidenteLayout,
  parseParams: (params) => ({
    id: z.coerce.number().int().positive().parse(params.id),
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient);
    const { canAny } = makeCan(perms);
    const ok = canAny(["Residencia.General Expedientes:Ver"]);
    if (!ok) throw redirect({ to: "/403", search: { from: location.href } });
  },
});

function ExpedienteResidenteLayout() {
  const { id } = useParams({ from: "/residentes/$id" });
  const location = useLocation();

  const {
    expedienteResidente,
    loadingExpedienteResidente,
  } = useGetResumenExpedienteResidente(id);

  const { ejecutarAccionExpedienteResidente } = useCerrarExpediente();
  const { reactivar } = useReactivarExpediente();
  const { mutateAsync: descargar } = useDescargarExpedienteResidente();
  const [isDownloading, setIsDownloading] = useState(false);
  const [fichaAbierta, setFichaAbierta] = useState(false);

  const navItemClass =
    "group flex flex-col items-start gap-2 px-3 py-1.5 no-underline text-center";

  const textClass = "text-base font-medium leading-none";
  const lineClass = "h-px rounded-full transition-colors";

  const handleDescargarExpediente = async () => {
    if (!expedienteResidente || isDownloading) return;

    setIsDownloading(true);

    try {
      await toast.promise(descargar(expedienteResidente.id_expediente), {
        loading: `Descargando expediente de ${expedienteResidente.residente.nombre} ${expedienteResidente.residente.apellido1}...`,
        success: "¡La información general del expediente se ha descargado exitosamente!",
        error: (err) => {
          console.error("Error al descargar expediente:", err);
          return "Error al descargar el expediente. Inténtalo de nuevo.";
        },
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Solo en la primera carga: un refetch (p. ej. al recuperar el foco de la ventana) no debe desmontar la
  // pantalla ni perder lo escrito en un formulario abierto.
  if (loadingExpedienteResidente) {
    return <WebLoader />;
  }

  if (!expedienteResidente) {
    return (
      <section className="px-3 py-4">
        <div className="mx-auto w-full max-w-7xl rounded-2xl border border-border/60 bg-card/95 p-6 text-sm text-muted-foreground shadow-sm">
          No se encontró el expediente del residente.
        </div>
      </section>
    );
  }

  if (location.pathname.endsWith('/editar')) {
    return (
      <ExpedienteEstadoContext.Provider value={expedienteResidente.estado}>
        <Outlet />
      </ExpedienteEstadoContext.Provider>
    );
  }

  return (
    <ExpedienteEstadoContext.Provider value={expedienteResidente.estado}>
      <div className="px-3 pb-2">
        <nav className="mx-3 mt-2 w-full max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-1 flex-wrap items-start gap-4 md:gap-6">
              <Link
                to="/residentes/$id"
                params={{ id }}
                activeOptions={{ exact: true }}
                className="flex-1 basis-0 no-underline"
              >
                {({ isActive }) => (
                  <span className={navItemClass}>
                    <span
                      className={`${textClass} ${isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                        }`}
                    >
                      General
                    </span>
                    <span
                      className={`${lineClass} w-full ${isActive ? "bg-amaranthPink" : "bg-muted-foreground/45"
                        }`}
                    />
                  </span>
                )}
              </Link>

              <Link
                to="/residentes/$id/enfermeria"
                params={{ id }}
                className="flex-1 basis-0 no-underline"
              >
                {({ isActive }) => (
                  <span className={navItemClass}>
                    <span
                      className={`${textClass} ${isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                        }`}
                    >
                      Enfermería
                    </span>
                    <span
                      className={`${lineClass} w-full ${isActive ? "bg-amaranthPink" : "bg-muted-foreground/45"
                        }`}
                    />
                  </span>
                )}
              </Link>

              <IfPerm perm="Residencia.Trabajo Social:Ver">
                <Link
                  to="/residentes/$id/trabajo-social"
                  params={{ id }}
                  activeOptions={{ exact: true }}
                  className="flex-1 basis-0 no-underline"
                >
                  {({ isActive }) => (
                    <span className={navItemClass}>
                      <span
                        className={`${textClass} ${isActive
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                          }`}
                      >
                        Trabajo social
                      </span>
                      <span
                        className={`${lineClass} w-full ${isActive ? "bg-amaranthPink" : "bg-muted-foreground/45"
                          }`}
                      />
                    </span>
                  )}
                </Link>
              </IfPerm>
              <IfPerm perm={PERM.nutricion.ver}>
                <Link
                  to="/residentes/$id/nutricion"
                  params={{ id }}
                  className="flex-1 basis-0 no-underline"
                >
                  {({ isActive }) => (
                    <span className={navItemClass}>
                      <span
                        className={`${textClass} ${isActive
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                          }`}
                      >
                        Nutrición
                      </span>
                      <span
                        className={`${lineClass} w-full ${isActive ? "bg-amaranthPink" : "bg-muted-foreground/45"
                          }`}
                      />
                    </span>
                  )}
                </Link>
              </IfPerm>

              <IfPerm perm={PERM.terapiaFisica.ver}>
                <Link
                  to="/residentes/$id/terapia-fisica"
                  params={{ id }}
                  className="flex-1 basis-0 no-underline"
                >
                  {({ isActive }) => (
                    <span className={navItemClass}>
                      <span
                        className={`${textClass} ${isActive
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                          }`}
                      >
                        Terapia Física
                      </span>
                      <span
                        className={`${lineClass} w-full ${isActive ? "bg-amaranthPink" : "bg-muted-foreground/45"
                          }`}
                      />
                    </span>
                  )}
                </Link>
              </IfPerm>
            </div>

            <IfPerm perm={PERM.fichaResumen.ver}>
              <button
                type="button"
                onClick={() => setFichaAbierta(true)}
                className={`${navItemClass} shrink-0 border-none bg-transparent outline-none`}
              >
                <span
                  className={`${textClass} inline-flex items-center gap-1 text-muted-foreground group-hover:text-foreground`}
                >
                  <ClipboardList className="h-4 w-4" />
                  Ficha resumen
                </span>
                <span
                  className={`${lineClass} w-full bg-muted-foreground/45 group-hover:bg-muted-foreground/60`}
                />
              </button>
            </IfPerm>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`${navItemClass} shrink-0 border-none bg-transparent outline-none`}
                >
                  <span
                    className={`${textClass} inline-flex items-center gap-1 text-muted-foreground group-hover:text-foreground`}
                  >
                    Opciones
                    <ChevronDown className="h-4 w-4" />
                  </span>
                  <span
                    className={`${lineClass} w-20 bg-muted-foreground/45 group-hover:bg-muted-foreground/60`}
                  />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleDescargarExpediente}
                  disabled={isDownloading}
                >
                  <FileDown className="h-4 w-4" />
                  {isDownloading ? "Descargando..." : "Descargar expediente"}
                </DropdownMenuItem>

                <IfPerm perm="Residencia.General Expedientes:Eliminar">
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    disabled={expedienteResidente.estado === "Inactivo"}
                    onClick={() =>
                      ejecutarAccionExpedienteResidente(
                        "Inactivo",
                        expedienteResidente.id_expediente
                      )
                    }
                  >
                    <BookMinus className="h-4 w-4" />
                    Cerrar expediente
                  </DropdownMenuItem>
                  {expedienteResidente.estado === "Inactivo" && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => reactivar(expedienteResidente.id_expediente)}
                    >
                      <BookOpen className="h-4 w-4" />
                      Reactivar expediente
                    </DropdownMenuItem>
                  )}
                </IfPerm>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>

        <section className="px-3 pb-2">
          <div className="mx-auto w-full max-w-7xl">
            <CardInfoGlobalResidente expediente={expedienteResidente} />
          </div>
        </section>

        <Outlet />
      </div>
      {fichaAbierta && (
        <FichaResumenDialogo
          expedienteId={expedienteResidente.id_expediente}
          onClose={() => setFichaAbierta(false)}
        />
      )}
    </ExpedienteEstadoContext.Provider>
  );
}