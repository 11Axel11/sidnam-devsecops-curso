import { User } from "lucide-react"
import type { CardEncargadoResidenteProps } from "../types/expedienteResidenteProps"

const CardEncargadosResidente = ({ encargado }: CardEncargadoResidenteProps) => {
    return (
        <div className="flex text-sm gap-x-8 text-justify mt-3 lg:ml-10">
            <User />
            <div className="flex flex-col font-semibold space-y-2">
                <div>Cédula:</div>
                <div>Nombre completo:</div>
                <div>Correo electronico:</div>
                <div>Telefono:</div>
            </div>
            <div className="flex flex-col space-y-2">
                <div>{encargado.cedula}</div>
                <div>{encargado.nombre} {encargado.apellido1} {encargado.apellido2}</div>
                <div>{encargado.correo && encargado.correo.trim() !== '' ? encargado.correo : 'N/A'}</div>
                <div>{encargado.telefono}</div>
            </div>
        </div>
    )
}

export default CardEncargadosResidente
