import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CardPreviewExpedienteResidenteProps } from "../types/expedienteResidenteProps"
import { getAvatarResidenteSvg } from "@/components/app/avatarGenerator"

const CardPreviewExpedienteResidente = ({ expediente, clickAction }: CardPreviewExpedienteResidenteProps) => {

    return (
        <div onClick={() => clickAction(expediente.id_expediente)} className="flex align-middle justify-center hover:cursor-pointer">
            <Card className="w-70 ">
                <CardHeader>
                    <div className="flex justify-center">
                        <img
                            src={getAvatarResidenteSvg(expediente.residente.nombre, expediente.residente.apellido1, expediente.residente.sexo)}
                            alt={`Avatar de ${expediente.residente.nombre}`}
                            className="w-23 h-23 rounded-full"
                        />
                    </div>

                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <CardTitle>
                        {expediente.residente.nombre} {expediente.residente.apellido1} {expediente.residente.apellido2}
                    </CardTitle>
                    <div className="flex flex-col gap-1 text-justify text-sm">
                        <p><strong className="font-semibold">Cédula:</strong> {expediente.residente.cedula}</p>
                        <p><strong className="font-semibold">Fecha de nacimiento:</strong> {expediente.residente.fecha_nacimiento}</p>
                        <p><strong className="font-semibold">Estado:</strong> {expediente.residente.dependencia.nombre}</p>
                        <p><strong className="font-semibold">Tipo de pensión: </strong>{expediente.tipo_pension?.nombre ?? "—"}</p>
                        <p><strong className="font-semibold">Fecha de ingreso:</strong> {expediente.fecha_ingreso}</p>
                        {expediente.fecha_cierre && <p><strong className="font-semibold">Fecha de cierre:</strong> {expediente.fecha_cierre}</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default CardPreviewExpedienteResidente
