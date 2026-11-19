import { getAvatarSvg } from "@/components/app/avatarGenerator";
import type { expedienteVoluntarioPreviewProps } from "../types/voluntariadoProps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CardPreviewExpedienteVoluntario = ({ expediente, clickAction, variant }: expedienteVoluntarioPreviewProps) => {
  const voluntario = expediente.voluntario;

  const renderEstado = () => {
    const estado = expediente.estado?.toLowerCase();

    const variant =
      estado === "inactivo"
        ? "outline"
        : estado === "activo"
          ? "accepted"
          : "secondary";

    return (
      <Badge className="text-sm" variant={variant}>
        {expediente.estado}
      </Badge>
    );
  };

  return (
    <div onClick={() => clickAction(expediente.id)} className="flex align-middle justify-center hover:cursor-pointer">
      <Card className="w-70">
        <CardHeader>
          <div className="flex justify-start">
            {variant === "historial" && (
              <div>
                {renderEstado()}
              </div>
            )}
          </div>
          <div className="flex justify-center">

            <img
              src={getAvatarSvg(voluntario.nombre, voluntario.apellido1)}
              alt={`Avatar de ${voluntario.nombre}`}
              className="w-23 h-23 rounded-full"
            />
          </div>

        </CardHeader>
        <CardContent>
          <CardTitle>
            {voluntario.nombre} {voluntario.apellido1} {voluntario.apellido2}
          </CardTitle>
          {voluntario.cedula}
        </CardContent>
      </Card>
    </div>
  );
};

export default CardPreviewExpedienteVoluntario;
