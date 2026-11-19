import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { getAvatarResidenteSvg } from "@/components/app/avatarGenerator";
import { capitalize } from "@/lib/pathNameMap";
import IfPerm from "@/components/auth/IfPerm";
import { useNavigate } from "@tanstack/react-router";
import type { ExpedienteInfoGlobalProps } from "../types/expedienteResidenteProps";

const CardInfoGlobalResidente = ({
    expediente,
}: ExpedienteInfoGlobalProps) => {
    const navigate = useNavigate();

    const residente = expediente.residente;

    const nombreCompleto = `${residente.nombre} ${residente.apellido1} ${residente.apellido2}`;

    const sexoLabel = residente.sexo === "F" ? "Femenino" : "Masculino";

    const estado = expediente.estado?.toLowerCase();

    const badgeVariant =
        estado === "activo"
            ? "accepted"
            : estado === "inactivo"
                ? "denied"
                : "outline";

    const handleEditar = () => {
        navigate({
            to: "/residentes/$id/editar",
            params: { id: expediente.id_expediente },
        });
    };

    return (
        <Card className="mx-3 mt-3 rounded-2xl">
            <CardContent className="px-6 py-4">
                <div className="mb-3 flex">
                    <Badge variant={badgeVariant} className="text-sm">
                        {capitalize(expediente.estado)}
                    </Badge>
                </div>

                <div className="flex flex-col gap-6 text-justify lg:flex-row lg:justify-between">
                    <div className="flex flex-col items-center text-center lg:min-w-md lg:items-center">
                        <img
                            src={getAvatarResidenteSvg(
                                residente.nombre,
                                residente.apellido1,
                                residente.sexo
                            )}
                            alt={`Avatar de ${residente.nombre}`}
                            className="h-24 w-24 rounded-full"
                        />

                        <h2 className="mt-3 text-lg font-semibold text-foreground">
                            {nombreCompleto}
                        </h2>

                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {residente.cedula}
                        </p>
                        {
                            expediente.estado !== "Inactivo" && (
                                <IfPerm perm="Residencia.General Expedientes:Actualizar">
                                    <Button onClick={handleEditar} variant="update" className="mt-3">
                                        <Pencil className="h-4 w-4" />
                                        Editar
                                    </Button>
                                </IfPerm>)
                        }
                    </div>

                    <div className="grid flex-1 grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 lg:px-4">
                        <div>
                            <p className="text-muted-foreground">Sexo</p>
                            <p className="font-medium text-foreground">{sexoLabel}</p>
                        </div>

                        <div>
                            <p className="text-muted-foreground">Edad</p>
                            <p className="font-medium text-foreground">
                                {residente.edad} años
                            </p>
                        </div>

                        <div>
                            <p className="text-muted-foreground">Fecha de nacimiento</p>
                            <p className="font-medium text-foreground">
                                {residente.fecha_nacimiento}
                            </p>
                        </div>

                        <div>
                            <p className="text-muted-foreground">Correo</p>
                            <p className="break-words font-medium text-foreground">
                                {residente.email ?? "N/A"}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CardInfoGlobalResidente;