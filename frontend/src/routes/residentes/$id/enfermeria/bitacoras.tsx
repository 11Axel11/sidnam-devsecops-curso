import IfPerm from "@/components/auth/IfPerm";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { capitalize } from "@/lib/pathNameMap";
import CardBitacora from "@/modules/residentes/components/enfermeria/CardBitacora";
import FormCrearBitacora from "@/modules/residentes/components/enfermeria/FormCrearBitacora";
import {
  useGetExpedienteResidenteEnfermeria,
  useGetNotasEnfermeria,
  useGetCuraciones,
  useGetConsultasEspecialista,
  useGetConsultasEBAIS,
  useGetTiposBitacora,
  useGetTiposConsultaEspecialista,
} from "@/modules/residentes/hooks/enfermeria/enfermeriaHooks";
import { useBitacoraStore } from "@/modules/residentes/store/bitacorasStore";
import { SmartPagination } from "@/components/PaginationComponent";
import { ensurePerms, makeCan } from "@/services/authHelpers";
import {
  createFileRoute,
  redirect,
  useParams,
  Link,
} from "@tanstack/react-router";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/residentes/$id/enfermeria/bitacoras")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient);
    const { canAny } = makeCan(perms);
    const ok = canAny(["Residencia.Enfermería:Crear"]);
    if (!ok) throw redirect({ to: "/403", search: { from: location.href } });
  },
});

function RouteComponent() {
  const { id } = useParams({ from: "/residentes/$id/enfermeria/bitacoras" });
  const idExpediente = Number(id);
  const limit = 4;
  const [page, setPage] = useState(1);
  const { tipoBitacora } = useGetTiposBitacora();
  const { TipoConsulta } = useGetTiposConsultaEspecialista();

  const {
    tipoSeleccionado,
    tipoConsultaEspecialistaSeleccionado,
    loading,
    expedienteActual,
    setTipoSeleccionado,
    setTipoConsultaEspecialista,
    initializeDefault,
    resetForNewExpediente,
  } = useBitacoraStore();

  const {
    NotasEnfermeria,
    totalNotasEnfermeria,
    loadingNotasEnfermeria,
    isPlaceholderData: isPlaceholderNotasEnfermeria,
  } = useGetNotasEnfermeria(
    idExpediente,
    page,
    limit,
    tipoSeleccionado === 4
  );

  const {
    Curaciones,
    totalCuraciones,
    loadingCuraciones,
    isPlaceholderData: isPlaceholderCuraciones,
  } = useGetCuraciones(
    idExpediente,
    page,
    limit,
    tipoSeleccionado === 3
  );

  const {
    ConsultasEBAIS,
    totalConsultasEBAIS,
    loadingConsultasEBAIS,
    isPlaceholderData: isPlaceholderConsultasEBAIS,
  } = useGetConsultasEBAIS(
    idExpediente,
    page,
    limit,
    tipoSeleccionado === 2
  );

  const {
    ConsultasEspecialista,
    totalConsultasEspecialista,
    loadingConsultasEspecialista,
    isPlaceholderData: isPlaceholderConsultasEspecialista,
  } = useGetConsultasEspecialista(
    tipoConsultaEspecialistaSeleccionado || 1,
    idExpediente,
    page,
    limit,
    tipoSeleccionado === 1
  );

  const nombreSeleccionado =
    tipoBitacora?.find((t) => t.id === tipoSeleccionado)?.nombre ??
    "Ver bitácoras";

  const nombreConsultaEspecialista = TipoConsulta?.find(
    (t) => t.id_tipo_consulta === tipoConsultaEspecialistaSeleccionado
  )?.nombre;

  const {
    expedienteResidenteEnfermeria,
    loadingExpedienteResidenteEnfermeria,
    fetchingExpedienteResidenteEnfermeria,
  } = useGetExpedienteResidenteEnfermeria(id);

  useEffect(() => {
    if (id) {
      if (expedienteActual !== null && expedienteActual !== idExpediente) {
        resetForNewExpediente(idExpediente);
      }

      if (!tipoSeleccionado || expedienteActual !== idExpediente) {
        initializeDefault(idExpediente);
      }
    }
  }, [
    id,
    expedienteActual,
    tipoSeleccionado,
    initializeDefault,
    resetForNewExpediente,
    idExpediente,
  ]);

  useEffect(() => {
    setPage(1);
  }, [id]);

  if (!tipoBitacora) return <div>....</div>;

  const showConsultaEspecialistaButtons =
    tipoSeleccionado === 1 && TipoConsulta;

  const registros =
    tipoSeleccionado === 4
      ? NotasEnfermeria
      : tipoSeleccionado === 3
      ? Curaciones
      : tipoSeleccionado === 2
      ? ConsultasEBAIS
      : tipoSeleccionado === 1
      ? ConsultasEspecialista
      : [];

  const totalRegistros =
    tipoSeleccionado === 4
      ? totalNotasEnfermeria
      : tipoSeleccionado === 3
      ? totalCuraciones
      : tipoSeleccionado === 2
      ? totalConsultasEBAIS
      : tipoSeleccionado === 1
      ? totalConsultasEspecialista
      : 0;

  const totalPages = Math.ceil(totalRegistros / limit);

  const isLoadingBitacoras =
    tipoSeleccionado === 4
      ? loadingNotasEnfermeria
      : tipoSeleccionado === 3
      ? loadingCuraciones
      : tipoSeleccionado === 2
      ? loadingConsultasEBAIS
      : tipoSeleccionado === 1
      ? loadingConsultasEspecialista
      : loading;

  const isPlaceholderData =
    tipoSeleccionado === 4
      ? isPlaceholderNotasEnfermeria
      : tipoSeleccionado === 3
      ? isPlaceholderCuraciones
      : tipoSeleccionado === 2
      ? isPlaceholderConsultasEBAIS
      : tipoSeleccionado === 1
      ? isPlaceholderConsultasEspecialista
      : false;

  if (
    loadingExpedienteResidenteEnfermeria ||
    fetchingExpedienteResidenteEnfermeria
  ) {
    return <WebLoader />;
  }

  if (!expedienteResidenteEnfermeria) {
    return (
      <section className="px-3 py-4">
        <Card className="border-border/60 bg-card/95 shadow-sm">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No se ha encontrado ese expediente.
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="px-3 py-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Link
          to="/residentes/$id/enfermeria"
          params={{ id }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <Card className="rounded-2xl border-border/60 bg-card/95 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border/60 px-6 py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-foreground">
                    Bitácoras de enfermería
                  </h2>
                  <p className=" text-muted-foreground">
                    {nombreSeleccionado}
                    {showConsultaEspecialistaButtons &&
                      nombreConsultaEspecialista && (
                        <span> · {capitalize(nombreConsultaEspecialista)}</span>
                      )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cambiar tipo
                        <ChevronDown className="ml-1 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        Seleccione un tipo de bitácora
                      </DropdownMenuLabel>

                      {tipoBitacora.map((b) => (
                        <DropdownMenuItem
                          key={b.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setPage(1);
                            setTipoSeleccionado(b.id, idExpediente);
                          }}
                        >
                          {b.nombre}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {expedienteResidenteEnfermeria.estado === "Activo" && (
                    <IfPerm perm="Residencia.Enfermería:Crear">
                      <FormCrearBitacora />
                    </IfPerm>
                  )}
                </div>
              </div>

              {showConsultaEspecialistaButtons && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {TipoConsulta.map((tipo) => (
                    <Button
                      key={tipo.id_tipo_consulta}
                      variant={
                        tipoConsultaEspecialistaSeleccionado ===
                          tipo.id_tipo_consulta
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setTipoConsultaEspecialista(
                          tipo.id_tipo_consulta,
                          idExpediente
                        )
                      }
                      className="capitalize"
                    >
                      {tipo.nombre}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-6">
              {isLoadingBitacoras ? (
                <WebLoader />
              ) : showConsultaEspecialistaButtons &&
                !tipoConsultaEspecialistaSeleccionado ? (
                <p className="text-center text-sm text-muted-foreground">
                  Selecciona un tipo de consulta especialista para ver los
                  registros.
                </p>
              ) : registros.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  No hay registros disponibles para{" "}
                  {nombreSeleccionado.toLowerCase()}
                  {nombreConsultaEspecialista &&
                    ` de ${nombreConsultaEspecialista.toLowerCase()}`}
                  .
                </p>
              ) : (
                <>
                  <div className="flex gap-4 flex-wrap">
                    {(registros as any[]).map((b) => (
                      <CardBitacora key={b.id || b.id_curacion || b.id_consulta_especialista || b.id_consulta_ebais} entry={b} />
                    ))}
                  </div>

                  {tipoSeleccionado && totalPages > 1 && (
                    <SmartPagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      maxVisiblePages={4}
                      isLoading={isPlaceholderData}
                      className="mt-6"
                    />
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}