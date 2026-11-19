import { Accordion } from "@radix-ui/react-accordion";
import {
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/animate-ui/radix/accordion";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/pathNameMap";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvatarSvg } from "@/components/app/avatarGenerator";
import { adaptRegistroDonacionToCardData, adaptSolicitudDonacionToCardData, type cardVistaDonacionProps, type DonacionCardData } from "../types/donacionesProps";
import { Button } from "@/components/ui/button";
import { CheckCheck, ExternalLink, Pencil } from "lucide-react";
import { useGetRegistroDonacionPorSolicitud, usePatchCambiarEstadoARecibido } from "../hooks/gestionDonacion/gestionDonacionesHooks";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { formatDateTime } from "@/lib/dateUtils";
import IfPerm from "@/components/auth/IfPerm";
import { useConfirmarCambiarEstadoSolicitud } from "../hooks/solicitudesDonacion/useConfirmarCambiarEstadoSolicitud";

const CardDonacion = (data: cardVistaDonacionProps) => {
    const navigate = useNavigate();
    const datos: DonacionCardData =
        data.variant === "solicitud"
            ? adaptSolicitudDonacionToCardData(data.solicitud)
            : adaptRegistroDonacionToCardData(data.registro);

    const isSolicitud = data.variant === "solicitud";
    const isAprobada = isSolicitud && datos.estado.toLowerCase() === "aprobada";

    const { ejecutarAccionSolicitud } = useConfirmarCambiarEstadoSolicitud();

    const { mutate: marcarComoRecibida, isPending } = usePatchCambiarEstadoARecibido();

    const { registroDonacionPorSolicitud } = useGetRegistroDonacionPorSolicitud(datos.id);

    const registroExists = Boolean(registroDonacionPorSolicitud?.message);

    const { idUsuario } = useAuth();
    const [isRecibida, setIsRecibida] = useState(datos.recibida);

    const handleRecibida = () => {
        marcarComoRecibida(
            { idRegistro: datos.id, idUsuario: Number(idUsuario) },
            {
                onSuccess: () => {
                    setIsRecibida(true);
                    toast.success('Donación marcada como recibida');
                },
                onError: () => {
                    toast.error('Error al actualizar el estado');
                }
            }
        );
    };

    const editarExpediente = (id: number) => {
        const idNum = Number(id);

        navigate({
            to: "/donaciones/gestion/editar/$editable",
            params: { editable: idNum },
        });
    };

    const renderAnonimo = () => {
        if (datos.anonimo) {
            return (
                <Badge className="text-sm mt-2" variant="outline">
                    Donación anónima
                </Badge>
            )
        }
    }

    const gotoRegistro = (id: number) => {
        navigate({
            to: "/donaciones/gestion/$id",
            params: { id },
        });
    }

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
            if (isRecibida) {
                return (
                    <Badge className="text-sm" variant="received">
                        Recibida
                    </Badge>
                );
            }
            else {
                return (
                    <Badge className="text-sm" variant="processed">
                        Procesada
                    </Badge>
                );
            }
        }
    };

    return (
        <div className="flex align-middle justify-center px-2">
            <Card className="w-full max-w-5xl mt-3">
                <CardHeader>
                    <CardDescription className="text-right">
                        {datos.creadoEn}
                    </CardDescription>

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center text-justify">
                        <img
                            src={getAvatarSvg(datos.tipoDonacion, "")}
                            alt={`Avatar de ${datos.tipoDonacion}`}
                            className="w-20 h-20 sm:w-23 sm:h-23 rounded-full"
                        />

                        <CardTitle className="text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                            <div>
                                {datos.tipoDonacion}
                                {renderAnonimo() && <p className="text-sm ">{renderAnonimo()}</p>}
                            </div>
                            {isSolicitud && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                    <div className="mr-0 sm:mr-10">{renderEstado()}</div>
                                    {registroExists && isAprobada && (
                                        <IfPerm perm="Donaciones.Gestión Donaciones:Ver">
                                            <Button variant="read" onClick={() => gotoRegistro(registroDonacionPorSolicitud!.data.id)}>
                                                <ExternalLink /> Ver registro
                                            </Button>
                                        </IfPerm>
                                    )}
                                </div>
                            )}


                            {!isSolicitud && (
                                <IfPerm perm="Donaciones.Gestión Donaciones:Actualizar">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                        <div className="mr-0 sm:mr-10">{renderEstado()}</div>
                                        <Button className="w-full sm:w-auto" variant="update" onClick={() => editarExpediente(datos.id)} disabled={isRecibida}>
                                            <Pencil /> Editar
                                        </Button>
                                    </div>
                                </IfPerm>
                            )}
                        </CardTitle>
                    </div>
                </CardHeader>

                <CardContent>
                    <Accordion
                        type="multiple"
                        defaultValue={[
                            "informacion-contacto",
                            "informacion-donacion",
                            "observaciones"
                        ]}
                    >
                        <AccordionItem value="informacion-contacto">
                            <AccordionTrigger className="hover:cursor-pointer text-md">
                                Información de contacto
                            </AccordionTrigger>
                            <AccordionContent>
                                <hr />
                                <div className="space-y-2 text-sm mt-3">
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Nombre:</span>
                                        <span>{datos.nombre} {datos.apellido1} {datos.apellido2}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Telefono:</span>
                                        <span>{datos.telefono}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Correo:</span>
                                        <span>{datos.email}</span>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="informacion-donacion">
                            <AccordionTrigger className="hover:cursor-pointer text-md">
                                Información de donación
                            </AccordionTrigger>
                            <AccordionContent>
                                <hr />
                                <div className="space-y-2 text-sm mt-3">
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Tipo de donación:</span>
                                        <span>{datos.tipoDonacion}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Descripción:</span>
                                        <span className="text-right">{datos.descripcion}</span>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="observaciones">
                            <AccordionTrigger className="hover:cursor-pointer text-md">
                                Observaciones
                            </AccordionTrigger>
                            <AccordionContent className="text-justify">
                                <hr />
                                <div className="text-sm text-justify mt-3 ml-0 sm:ml-10">
                                    <p>{datos.observaciones}</p>
                                </div>
                            </AccordionContent>
                            {!isSolicitud && (
                                <AccordionContent>
                                    <div className="text-muted-foreground text-sm space-y-2 mt-3">
                                        <div className="flex justify-between">
                                            <span className="font-semibold">Aprobada por:</span>
                                            <span>{datos.aprobadaPor}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold">Fecha:</span>
                                            <span>{formatDateTime(datos.aprobadaEn)}</span>
                                        </div>
                                        {isRecibida && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="font-semibold">Recibida por:</span>
                                                    <span>{datos.recibidaPor}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-semibold">Fecha:</span>
                                                    <span>{formatDateTime(datos.recibidaEn)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </AccordionContent>
                            )}
                        </AccordionItem>
                    </Accordion>
                </CardContent>
                <CardFooter>
                    <CardAction className="flex flex-col sm:flex-row gap-4 w-full sm:justify-end mr-0 sm:mr-4">
                        {data.variant === "solicitud" && (
                            <>
                                <IfPerm perm="Donaciones.Solicitud Donaciones:Actualizar">
                                    <Button
                                        className="w-full sm:w-auto hover:cursor-pointer"
                                        variant={"create"}
                                        onClick={() => ejecutarAccionSolicitud("Aprobadas", datos.id, datos.estado)}
                                        disabled={datos.estado.toLowerCase() !== "pendiente"}
                                    >
                                        Aceptar
                                    </Button>
                                </IfPerm>

                                <IfPerm perm="Donaciones.Solicitud Donaciones:Actualizar">
                                    <Button
                                        className="w-full sm:w-auto hover:cursor-pointer"
                                        variant={"destructive"}
                                        onClick={() => ejecutarAccionSolicitud("Rechazadas", datos.id, datos.estado)}
                                        disabled={datos.estado.toLowerCase() !== "pendiente"}
                                    >
                                        Rechazar
                                    </Button>
                                </IfPerm>
                            </>
                        )}

                        {data.variant === "registro" && (
                            <>
                                <IfPerm perm="Donaciones.Gestión Donaciones:Actualizar">
                                    <Button
                                        className="w-full sm:w-auto hover:cursor-pointer"
                                        variant={"update"}
                                        onClick={handleRecibida}
                                        disabled={isRecibida}
                                    >
                                        <CheckCheck />{isPending ? "Cargando..." : "Marcar como recibida"}
                                    </Button>
                                </IfPerm>
                            </>
                        )}
                    </CardAction>
                </CardFooter>
            </Card>
        </div>
    );
}; export default CardDonacion;