import type { CardExpedienteResidenteEnfermeriaProps } from "../../types/expedienteResidenteProps";
import { capitalize } from "@/lib/pathNameMap";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { usePatologiasStore } from "../../store/enfermeriaStore";
import { Link, useParams } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import AsociarPatologia from "./AsociarPatologia";
import AsociarMedicamentos from "./AsociarMedicamentos";
import AsociarTratamientosEspeciales from "./AsociarTratamientosEspeciales";
import CardAdministracionMed from "./CardAdministracionMed";
import CardTratamientoEspecial from "./CardTratamientoEspecial";
import IfPerm from "@/components/auth/IfPerm";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/animate-ui/components/radix/tabs";

const CardContenidoEnfermeriaResidente = ({
    expediente,
}: CardExpedienteResidenteEnfermeriaProps) => {
    const { setPatologias } = usePatologiasStore();

    const { id } = useParams({ from: "/residentes/$id/enfermeria/" });

    useEffect(() => {
        if (expediente?.patologias) {
            const patologiasIds = expediente.patologias
                .map((p) => p.id_patologia)
                .filter((id): id is number => id !== undefined);

            setPatologias(patologiasIds);
        }
    }, [expediente, setPatologias]);

    const renderEDUS = () => {
        const gotolink = "https://edus.ccss.sa.cr/eduscitasweb/";

        return (
            <Badge
                onClick={() => window.open(gotolink, "_blank")}
                className="cursor-pointer text-sm"
                variant="outline"
            >
                <Stethoscope />
                EDUS
            </Badge>
        );
    };


    return (
        <Tabs defaultValue="patologias" className="w-full gap-0 px-4 pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <TabsList className="bg-muted-foreground/10 flex-wrap h-auto">
                    <TabsTrigger value="patologias" className="text-xs sm:text-sm">Patologías</TabsTrigger>
                    <TabsTrigger value="medicamentos" className="text-xs sm:text-sm">Medicamentos</TabsTrigger>
                    <TabsTrigger value="tratamientos-especiales" className="text-xs sm:text-sm">
                        Tratamientos especiales
                    </TabsTrigger>
                    <IfPerm perm="Residencia.Enfermería:Crear">
                        <TabsTrigger value="bitacoras" className="text-xs sm:text-sm">
                            <Link
                                to="/residentes/$id/enfermeria/bitacoras"
                                params={{ id }}
                            >
                                Bitácoras
                            </Link>
                        </TabsTrigger>
                    </IfPerm>
                </TabsList>

                <div className="shrink-0">{renderEDUS()}</div>
            </div>

            <TabsContent value="patologias" className="mt-0 w-full">
                <Card className="w-full rounded-2xl border-border/60 bg-card/95 shadow-sm">
                    <CardContent className="px-6 ">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <h3 className=" font-semibold text-foreground">
                                    Patologías registradas
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Resumen de condiciones asociadas al residente.
                                </p>
                            </div>

                            {expediente.estado === "Activo" && (
                                <div className="flex justify-end pt-2">
                                    <IfPerm perm="Residencia.Enfermería:Crear">
                                        <AsociarPatologia />
                                    </IfPerm>
                                </div>
                            )}
                            {expediente.patologias && expediente.patologias.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {expediente.patologias.map((p) => (
                                        <Badge
                                            key={p.id_patologia}
                                            variant="outline"
                                            className="rounded-full border-amaranthPink/20 bg-amaranthPink/5 px-3 py-1 text-sm font-medium text-foreground"
                                        >
                                            {capitalize(p.nombre)}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
                                    <p className="text-sm italic text-muted-foreground">
                                        No hay patologías registradas.
                                    </p>
                                </div>
                            )}

                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="medicamentos" className="mt-0 w-full">
                <Card className="w-full rounded-2xl border-border/60 bg-card/95 shadow-sm">
                    <CardContent className="px-6">
                        <div className="flex flex-col gap-1">
                            <h3 className=" font-semibold text-foreground">
                                Administraciones medicinales
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Resumen de administraciones medicinales necesarias para el residente.
                            </p>
                        </div>
                        {expediente.estado === "Activo" && (
                            <div className="mt-4 flex justify-end mb-4">
                                <IfPerm perm="Residencia.Enfermería:Crear">
                                    <AsociarMedicamentos />
                                </IfPerm>
                            </div>
                        )}
                        {expediente.administraciones &&
                            expediente.administraciones.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {expediente.administraciones.map((adm) => (
                                    <div
                                        key={adm.id_administracion}
                                        className="rounded-xl border border-border/60 bg-background/70 p-4"
                                    >
                                        <h4 className="mb-3 font-semibold">
                                            Turno {adm.turno}
                                        </h4>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {adm.medicamentos.map((med, idx) => (
                                                <CardAdministracionMed
                                                    key={idx}
                                                    med={med}
                                                    idAdministracion={adm.id_administracion}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-4 text-center text-sm italic text-muted-foreground">
                                No hay administraciones medicinales registradas.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="tratamientos-especiales" className="mt-0 w-full">
                <Card className="w-full rounded-2xl border-border/60 bg-card/95 shadow-sm">
                    <CardContent className="px-6">
                        <div className="flex flex-col gap-1">
                            <h3 className=" font-semibold text-foreground">
                                Tratamientos especiales
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Resumen de tratamientos especiales necesarios para el residente.
                            </p>
                        </div>
                        {expediente.estado === "Activo" && (
                            <div className="mt-4 flex justify-end mb-4">
                                <IfPerm perm="Residencia.Enfermería:Crear">
                                    <AsociarTratamientosEspeciales />
                                </IfPerm>
                            </div>
                        )}
                        {expediente.administracionesEspeciales &&
                            expediente.administracionesEspeciales.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {expediente.administracionesEspeciales.map((adm) => (
                                    <CardTratamientoEspecial
                                        key={adm.id_administracion_especial}
                                        tratamiento={adm}
                                        idAdministracionEspecial={adm.id_administracion_especial}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="py-4 text-center text-sm italic text-muted-foreground">
                                No hay tratamientos especiales registrados.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
};

export default CardContenidoEnfermeriaResidente;