import { getAvatarSvg } from "@/components/app/avatarGenerator";
import { Button } from "@/components/ui/button";
import {
  adaptExpedienteToCardData,
  adaptSolicitudToCardData,
  type cardVistaVoluntarioProps,
  type VoluntarioCardData,
} from "../types/voluntariadoProps";
import Horario from "./Horario";
import { useGetTiposVoluntariado } from "../hooks/voluntariadoHooks";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/pathNameMap";
import { Progress } from "@/components/animate-ui/radix/progress";
import { BookMinus, FileDown, Pencil } from "lucide-react";
import type { ContactosEmergenciaVoluntariado } from "../models/voluntario";
import FormAgregarActividades from "./FormAgregarActividades";
import TablaActividades from "./TablaActividades";
import { useNavigate } from "@tanstack/react-router";
import { useGetReporteActividadesVoluntario } from "../hooks/gestionVoluntariado/gestionHooks";
import { useCofirmarCambiarEstadoSolicitud } from "../hooks/useConfirmarCambiarSolicitud";
import { toast } from "sonner";
import { useState } from "react";
import IfPerm from "@/components/auth/IfPerm";
import { useCerrarExpedienteVoluntario } from "../hooks/useDesactivarExpedienteVoluntario";

const CardSolicitudVoluntariado = (data: cardVistaVoluntarioProps) => {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeView, setActiveView] = useState<"horario" | "actividades">("horario");

  const datos: VoluntarioCardData =
    data.variant === "solicitud"
      ? adaptSolicitudToCardData(data.solicitud)
      : adaptExpedienteToCardData(data.expediente);

  const isSolicitud = data.variant === "solicitud";
  const isExpedienteActivo =
    data.variant === "expediente" &&
    data.expediente.estado?.toLowerCase() === "activo";

  const { ejecutarAccionSolicitud } = useCofirmarCambiarEstadoSolicitud();

  const { tipoVoluntario } = useGetTiposVoluntariado();

  const { mutateAsync: descargar } = useGetReporteActividadesVoluntario();
  const handleDescargarReporte = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      await toast.promise(descargar(datos.id), {
        loading: "Generando reporte de actividades...",
        success: "¡Reporte descargado exitosamente!",
        error: (err) => {
          console.error("Error al descargar reporte:", err);
          return "Error al descargar el reporte. Inténtalo de nuevo.";
        },
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const renderSexo = () => {
    let sexo = datos.sexo;
    return sexo === "F" ? (sexo = "Femenino") : (sexo = "Masculino");
  };

  const renderNombreTipoVoluntariado = () => {
    const tipoSolicitud = datos.tipoVoluntariado;
    const tipo = tipoVoluntario?.find((tipo) => tipo.id === tipoSolicitud);

    return tipo?.nombre ?? "Tipo desconocido";
  };

  const tipoVoluntariadoNombre = renderNombreTipoVoluntariado();

  const { ejecutarAccionExpedienteResidente } = useCerrarExpedienteVoluntario(data.variant === "expediente" ? datos.id : 0);

  const renderEstado = () => {
    if (isSolicitud) {
      const estado = datos.estado?.toLowerCase();

      const variant =
        estado === "pendiente"
          ? "pending"
          : estado === "aprobada"
            ? "accepted"
            : estado === "rechazada"
              ? "denied"
              : "outline";

      const estadoCapitalized = capitalize(datos.estado);

      return (
        <Badge className="text-sm" variant={variant}>
          {estadoCapitalized}
        </Badge>
      );
    }

    if (!isSolicitud) {
      const estado = data.expediente.estado?.toLowerCase();

      const variant =
        estado === "inactivo"
          ? "outline"
          : estado === "activo"
            ? "accepted"
            : "secondary";

      return (
        <Badge className="text-sm" variant={variant}>
          {data.expediente.estado}
        </Badge>
      );
    }
  };

  const editarExpediente = (id: number) => {
    const idNum = Number(id);

    navigate({
      to: "/voluntarios/gestion/editar/$editable",
      params: { editable: idNum },
    });
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-7xl">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
          <section className="rounded-xl border bg-muted/20 p-4 md:p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <img
                    src={getAvatarSvg(datos.nombre, datos.apellido1)}
                    alt={`Avatar de ${datos.nombre}`}
                    className="h-20 w-20 rounded-full"
                  />

                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-semibold">
                      {datos.nombre} {datos.apellido1} {datos.apellido2}
                    </h2>
                    <p className="break-words text-muted-foreground">
                      {datos.cedula} · {renderSexo()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {renderEstado()}
                  {!isSolicitud && isExpedienteActivo && (
                    <IfPerm perm="Voluntariado.Gestión Voluntariado:Actualizar">
                      <Button
                        onClick={() => editarExpediente(datos.id)}
                        variant="update"
                        size="sm"
                      >
                        <Pencil />
                        Editar expediente
                      </Button>
                    </IfPerm>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="text-base font-semibold">Información personal</h3>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <dl className="ml-2 grid grid-cols-1 gap-2 text-justify sm:grid-cols-[170px_minmax(0,1fr)] [&>div>dd]:min-w-0 [&>div>dd]:break-words [&>div>dd]:whitespace-pre-wrap [&>div>dt]:break-words">
                  <div className="contents">
                    <dt className="font-semibold">Ocupación:</dt>
                    <dd>{datos.ocupacion || "-"}</dd>
                  </div>
                  <div className="contents">
                    <dt className="font-semibold">Teléfono:</dt>
                    <dd>{datos.telefono || "-"}</dd>
                  </div>
                  <div className="contents">
                    <dt className="font-semibold">Correo:</dt>
                    <dd className="min-w-0 break-all">{datos.email || "-"}</dd>
                  </div>
                  <div className="contents">
                    <dt className="font-semibold">Dirección exacta:</dt>
                    <dd className="break-words">{datos.direccion || "-"}</dd>
                  </div>
                  <div className="contents">
                    <dt className="font-semibold">Tipo de colaboración:</dt>
                    <dd>{tipoVoluntariadoNombre}</dd>
                  </div>
                  <div className="contents">
                    <dt className="font-semibold">Experiencia:</dt>
                    <dd className="break-words">{datos.experienciaLaboral || "-"}</dd>
                  </div>
                </dl>
              </div>

              <div className="border-t pt-4">
                <div className="mb-3 flex items-center gap-3">
                  <h3 className=" font-semibold">Contacto de emergencia</h3>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-2">
                  {datos.contactosEmergencia && datos.contactosEmergencia.length > 0 ? (
                    datos.contactosEmergencia.map(
                      (contacto: ContactosEmergenciaVoluntariado) => (
                        <div key={contacto.id} className="w-full max-w-full rounded-lg bg-muted/30 p-3">
                          <p className="break-words">
                            <span className="font-semibold">Nombre:</span> {contacto.nombre}
                          </p>
                          <p className="break-words">
                            <span className="font-semibold">Teléfono:</span> {contacto.telefono}
                          </p>
                        </div>
                      )
                    )
                  ) : (
                    <p className=" text-muted-foreground">No registrado</p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <h3 className="text-base font-semibold">Observaciones</h3>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                </div>

                <div className="space-y-3">
                  <p className="break-words whitespace-pre-wrap">{datos.observaciones || "Sin observaciones."}</p>
                  {!isSolicitud && datos.datosExtra && (
                    <>
                      <p className="break-words text-muted-foreground">{datos.datosExtra} en {datos.creadoEn}</p>
                    </>
                  )}
                </div>
              </div>

              {!isSolicitud && isExpedienteActivo && (
                <div className="flex justify-end">
                  <IfPerm perm="Voluntariado.Gestión Voluntariado:Actualizar">
                    <Button onClick={ejecutarAccionExpedienteResidente} variant="destructive">
                      <BookMinus />
                      Cerrar expediente
                    </Button>
                  </IfPerm>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
              <div className="flex items-center gap-4 text-sm font-semibold md:gap-8">
                <button
                  type="button"
                  onClick={() => setActiveView("horario")}
                  className={`border-b-2 pb-2 transition-colors ${activeView === "horario"
                    ? "border-amaranthPink-700 text-foreground"
                    : "border-transparent text-muted-foreground"
                    }`}
                >
                  Horario
                </button>

                {!isSolicitud && (
                  <button
                    type="button"
                    onClick={() => setActiveView("actividades")}
                    className={`border-b-2 pb-2 transition-colors ${activeView === "actividades"
                      ? "border-amaranthPink-700 text-foreground"
                      : "border-transparent text-muted-foreground"
                      }`}
                  >
                    Actividades
                  </button>
                )}
              </div>

              {!isSolicitud && activeView === "actividades" && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {isExpedienteActivo && (
                    <IfPerm perm="Voluntariado.Gestión Voluntariado:Actualizar">
                      <FormAgregarActividades />
                    </IfPerm>
                  )}

                  <Button
                    variant="read"
                    onClick={handleDescargarReporte}
                    disabled={!datos.actividades || datos.actividades.length === 0 || isDownloading}
                  >
                    <FileDown />
                    {isDownloading ? "Descargando..." : "Descargar reporte"}
                  </Button>
                </div>
              )}
            </div>

            <div className="pt-4">
              {activeView === "horario" && <Horario horario={datos.horarios} />}

              {!isSolicitud && activeView === "actividades" && (
                <div className="space-y-4">
                  {tipoVoluntariadoNombre.toLowerCase() === "horas" && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="mb-2 text-sm font-semibold">Progreso de horas</p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                        <Progress
                          max={100}
                          value={((datos.progreso_horas ?? 0) / (datos.cantidadHoras ?? 1)) * 100}
                        />
                        <p className="text-sm text-muted-foreground">
                          {datos.progreso_horas ?? 0} / {datos.cantidadHoras ?? 0} horas
                        </p>
                      </div>
                    </div>
                  )}

                  <TablaActividades actividades={datos.actividades} />
                </div>
              )}
            </div>
          </section>
        </div>

        {isSolicitud && (
          <div className="mt-4 flex justify-end gap-3">
            <IfPerm perm="Voluntariado.Solicitudes Voluntariado:Crear">
              <Button
                variant="approve"
                onClick={() => ejecutarAccionSolicitud("Aprobadas", datos.id, datos.estado)}
                disabled={datos.estado.toLowerCase() !== "pendiente"}
              >
                Aceptar
              </Button>
            </IfPerm>

            <IfPerm perm="Voluntariado.Solicitudes Voluntariado:Eliminar">
              <Button
                variant="deny"
                onClick={() => ejecutarAccionSolicitud("Rechazadas", datos.id, datos.estado)}
                disabled={datos.estado.toLowerCase() !== "pendiente"}
              >
                Rechazar
              </Button>
            </IfPerm>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardSolicitudVoluntariado;