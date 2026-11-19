import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { registroDonacionPreviewProps } from "../types/donacionesProps";
import { getAvatarSvg } from "@/components/app/avatarGenerator";

const CardPreviewRegistro = ({ registro, clickAction }: registroDonacionPreviewProps) => {
    return (
        <div onClick={() => clickAction(registro.id)} className="flex align-middle justify-center hover:cursor-pointer">
            <Card className="w-70">
                <CardHeader>
                    <div className="flex justify-center">
                        <img
                            src={getAvatarSvg(registro.tipoDonacion, "")}
                            alt={`Avatar de ${registro.tipoDonacion}`}
                            className="w-23 h-23 rounded-full"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <CardTitle>
                        {registro.tipoDonacion}
                    </CardTitle>
                    {registro.donador.nombre} {registro.donador.apellido1} {registro.donador.apellido2}
                </CardContent>
            </Card>
        </div>
    );
};

export default CardPreviewRegistro;