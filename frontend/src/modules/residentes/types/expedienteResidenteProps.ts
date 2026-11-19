import type { EstadoTipo } from "@/models/sharedModels"
import type { ExpedienteResidenteEnfermeria } from "../models/enfermeria"
import type { ExpedienteResidente, PreviewExpedienteResidente, ResumenExpedienteResidente } from "../models/expedienteResidente"
import type { EditarEncargadoResidente, EncargadoResidente } from "../models/residente"

export type CardPreviewExpedienteResidenteProps = {
    expediente: PreviewExpedienteResidente,
    clickAction: (id: number) => void,
}

export type ExpedienteInfoGlobalProps = {
    expediente: ResumenExpedienteResidente
}

export type CardExpedienteResidenteProps = {
    expediente: ExpedienteResidente
}
export type CardEncargadoResidenteProps = {
    encargado: EncargadoResidente
}
export type EditarExpedienteResidenteProps = {
    expediente: EditarExpedienteResidenteFormData
}

export type EditarExpedienteResidenteFormData = {
    fecha_ingreso?: string
    tipo_pension?: EstadoTipo | number | null
    cedula?: string
    nombre?: string
    apellido1?: string
    apellido2?: string
    sexo?: string | EstadoTipo
    edad?: string | number
    correo?: string
    estado_civil?: EstadoTipo | number | null
    dependencia?: EstadoTipo | number | null
    lineaPobreza?: EstadoTipo | number | null
    fecha_nacimiento?: string
    encargados?: EditarEncargadoResidente[]
}

export interface EditableEncargadosProps {
    encargados: EditarEncargadoResidente[];
    onChange: (encargados: EditarEncargadoResidente[]) => void;
}
export type CardExpedienteResidenteEnfermeriaProps = {
    expediente: ExpedienteResidenteEnfermeria
}