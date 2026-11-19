import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Navigation, Plus, Search } from "lucide-react";
import useDebounce from "@/modules/voluntariado/hooks/gestionVoluntariado/useDebounce";
import { useGetExpedienteActivoPorCedula, useGetAllExpedientesVoluntarioPorCedula, useGetPreviewExpedientesVoluntarioActivos } from "@/modules/voluntariado/hooks/gestionVoluntariado/gestionHooks";
import { SmartPagination } from "@/components/PaginationComponent";
import CardPreviewExpedienteVoluntario from "@/modules/voluntariado/components/CardPreviewExpedienteVoluntario";
import { ensurePerms, makeCan } from "@/services/authHelpers";
import IfPerm from "@/components/auth/IfPerm";

export const Route = createFileRoute("/voluntarios/gestion/")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Voluntariado.Gestión Voluntariado:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
    const path = location.pathname.toLowerCase();

    const invalidPattern = /^\/voluntarios\/gestion\/(historial|editar)\/?$/;

    if (invalidPattern.test(path)) {
      throw redirect({ to: "/voluntarios/gestion" });
    }
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const limit = 12;
  const [page, setPage] = useState(1);
  const [cedula, setCedula] = useState("");
  const debouncedCedula = useDebounce(cedula, 300);
  const [modoHistorial, setModoHistorial] = useState(false);

  const isTyping = cedula && cedula !== debouncedCedula;
  const numCedula = Number(debouncedCedula);
  const shouldFetch = !!debouncedCedula && !isNaN(numCedula) && numCedula > 0;

  const { expedienteActivoPorCedula, loadingExpedienteActivoPorCedula } = useGetExpedienteActivoPorCedula(
    debouncedCedula, shouldFetch
  );

  const { expedientesVoluntario, loadingExpedientesVoluntario }
    = useGetAllExpedientesVoluntarioPorCedula(numCedula, 1, 1, shouldFetch);

  const {
    isPlaceholderData,
    totalExpedientesVoluntarioActivo,
    expedientesVoluntarioActivo,
    fetchingExpedientesVoluntarioActivo,
    loadingExpedientesVoluntarioActivo,
  } = useGetPreviewExpedientesVoluntarioActivos(page, limit);

  const gotoCrearVoluntario = () => {
    navigate({ to: "/voluntarios/gestion/crear" });
  };

  const verExpediente = (id: number) => {
    const idNum = Number(id);

    navigate({
      to: "/voluntarios/gestion/$id",
      params: { id: idNum },
    });
  };

  const toggleModoBusqueda = () => setModoHistorial((prev) => !prev);

  const totalPages = Math.ceil(totalExpedientesVoluntarioActivo / limit);

  const handlePageChange = (newPage: number) => {
    if (isPlaceholderData) return;
    setPage(newPage);
  };


  if (fetchingExpedientesVoluntarioActivo || loadingExpedientesVoluntarioActivo) {
    return (
      <>
        <WebLoader />
      </>
    );
  }

  return (
    <section className=" m-5 flex flex-col gap-4">
      <nav className="flex justify-between gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-auto">
              <Search />
              Buscar por cédula
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex gap-5 mt-3">
                <Input
                  placeholder="Buscar un expediente"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="max-w-sm mb-3"
                />
                <Button variant="secondary" onClick={toggleModoBusqueda}>
                  {modoHistorial ? "Buscar activos" : "Buscar en historial"}
                </Button>
              </DialogTitle>
            </DialogHeader>

            <DialogDescription className="flex justify-center">
              {cedula ? (
                isTyping ? (
                  <span>
                    Buscando expediente {modoHistorial ? "en historial" : "activo"}...
                  </span>
                ) : modoHistorial ? (
                  loadingExpedientesVoluntario ? (
                    <WebLoader />
                  ) : expedientesVoluntario && expedientesVoluntario.length > 0 ? (
                    <span>Resultados encontrados: </span>
                  ) : (
                    <span>No se encontraron expedientes en el historial.</span>
                  )
                ) : loadingExpedienteActivoPorCedula ? (
                  <WebLoader />
                ) : expedienteActivoPorCedula ? (
                  <span>Resultados encontrados: </span>
                ) : (
                  <span>No se encontró ningún expediente activo con esa cédula.</span>
                )
              ) : (
                <span>Ingrese una cédula para buscar un expediente.</span>
              )}
            </DialogDescription>
            {!isTyping && cedula && (
              modoHistorial ? (
                expedientesVoluntario && expedientesVoluntario.length > 0 && (
                  <div className="inline-block mt-2">
                    <div className="flex flex-col gap-4 justify-center">
                      {expedientesVoluntario.map((expediente) => (
                        <CardPreviewExpedienteVoluntario
                          key={expediente.id}
                          variant="default"
                          expediente={expediente}
                          clickAction={() => verExpediente(expediente.id)}
                        />
                      ))}
                      <Button
                        variant="secondary"
                        className="sm:w-auto mt-4"
                        onClick={() =>
                          navigate({
                            to: "/voluntarios/gestion/historial/$cedula",
                            params: { cedula: Number(cedula) },
                          })
                        }
                      >
                        <Navigation className="h-4 w-4" />
                        Ver todos los expedientes
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                expedienteActivoPorCedula && (
                  <div className="inline-block mt-2">
                    <div className="flex flex-col gap-4 justify-center">
                      {expedientesVoluntario.map((expediente) => (
                        <CardPreviewExpedienteVoluntario
                          key={expediente.id}
                          variant="default"
                          expediente={expediente}
                          clickAction={() => verExpediente(expediente.id)}
                        />
                      ))}
                      <Button
                        variant="secondary"
                        className="sm:w-auto mt-4"
                        onClick={() =>
                          navigate({
                            to: "/voluntarios/gestion/historial/$cedula",
                            params: { cedula: Number(cedula) },
                          })
                        }
                      >
                        <Navigation className="h-4 w-4" />
                        Ver todos los expedientes
                      </Button>
                    </div>
                  </div>
                )
              )
            )}
          </DialogContent>
        </Dialog>
        
        <IfPerm perm="Voluntariado.Gestión Voluntariado:Crear">
          <Button className="w-auto " variant={"create"} onClick={gotoCrearVoluntario}>
            <Plus /> Crear un expediente
          </Button>
        </IfPerm>

      </nav>

      <div className="flex gap-5 flex-wrap justify-center">
        {expedientesVoluntarioActivo?.map((expediente) => (
          <CardPreviewExpedienteVoluntario
            variant="default"
            key={expediente.id}
            expediente={expediente}
            clickAction={() => verExpediente(expediente.id)}
          />
        ))}
      </div>

      <SmartPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        maxVisiblePages={4}
        isLoading={isPlaceholderData}
        className="mt-6"
      />
    </section>
  );
}
