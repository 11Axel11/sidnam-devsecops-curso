import { Card, CardContent } from "@/components/ui/card";
import type { CardExpedienteResidenteProps } from "../types/expedienteResidenteProps";
import { capitalize } from "@/lib/pathNameMap";
import CardEncargadosResidente from "./CardEncargadosResidente";
import { Badge } from "@/components/ui/badge";
import { Stethoscope } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/components/radix/tabs";

const CardContenidoGeneralResidente = ({
  expediente,
}: CardExpedienteResidenteProps) => {
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
    <Tabs defaultValue="pension" className="px-2 w-full gap-0">
      <TabsList className=" bg-muted-foreground/10">
        <TabsTrigger value="pension">Pensión y estado</TabsTrigger>
        <TabsTrigger value="encargados">Encargados</TabsTrigger>
      </TabsList>

      <TabsContent value="pension" className="mt-0 w-full">
        <Card className="w-full rounded-2xl border-border/60 bg-card/95 shadow-sm">
          <CardContent className="px-6 py-5">
            <div className="flex w-full flex-col gap-8 md:flex-row md:items-start">
              <div className="grid w-full flex-1 grid-cols-1 gap-x-24 gap-y-8 text-left text-sm md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Tipo de pensión</p>
                  <p className="font-medium">{expediente.tipo_pension?.nombre ?? "—"}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Fecha de ingreso</p>
                  <p className="font-medium">{expediente.fecha_ingreso}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Dependencia</p>
                  <p className="font-medium">
                    {expediente.residente.dependencia.nombre}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Estado del expediente</p>
                  <p className="font-medium">{capitalize(expediente.estado)}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Estado civil</p>
                  <p className="font-medium">{expediente.residente.estado_civil.nombre}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Línea de pobreza</p>
                  <p className="font-medium">
                    {expediente.residente.linea_pobreza.nombre}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Fecha de cierre</p>
                  <p className="font-medium">
                    {expediente.fecha_cierre ?? "N/A"}
                  </p>
                </div>
              </div>

              {expediente.estado === "Inactivo" && (
                <div className="text-left text-sm md:min-w-[11rem]">
                  <p className="text-muted-foreground">Cerrado por</p>
                  <p className="font-medium">
                    {expediente.usuario_cierre ?? "N/A"}
                  </p>
                </div>
              )}

              <div className="md:ml-auto">{renderEDUS()}</div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="encargados" className="mt-0">
        <Card className="w-full rounded-2xl border-border/60 bg-card/95 shadow-sm">
          <CardContent className="px-6 py-5">
            {expediente.residente.encargados.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {expediente.residente.encargados.map((encargado) => (
                  <CardEncargadosResidente
                    key={encargado.id}
                    encargado={encargado}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No hay encargados asignados.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default CardContenidoGeneralResidente;