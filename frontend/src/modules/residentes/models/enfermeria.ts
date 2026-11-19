import type { UnidadMedida } from "@/models/sharedModels";
import type { ResidenteHeading } from "./expedienteResidente";

export interface ExpedienteResidenteEnfermeria {
    estado: string;
    residente: ResidenteHeading;
    patologias: Patologia[];
    administraciones: Administraciones[];
    administracionesEspeciales: AdministracionesEspeciales[]
}

export interface CrearMedicamento {
    id: string;
    nombre: string;
}

export interface Medicamento {
    id_medicamento: number;
    nombre: string;
    tipo: 'ANTIBIOTICO' | 'NOANTIBIOTICO';
}

export interface MedicamentoResidente {
    id_medicamento: number;
    nombre: string;
    cantidad: string;
    unidad: UnidadMedida
}

export interface Patologia {
    id_patologia?: number;
    nombre: string;
}

export interface Administraciones {
    id_administracion: string;
    turno: string;
    medicamentos: MedicamentoResidente[];
}
export interface CrearAdministracion {
    turno: "AM" | "PM" | "MD" | "MN";
    id_medicamento: number;
    cantidad: number;
    id_unidadMedida: number;
}

export interface AdministracionesEspeciales {
    id_administracion_especial: string;
    hora: string;
    cantidad: string;
    medicamento: Medicamento;
    unidad: UnidadMedida;
}

export interface DeleteAdministraciones {
    idAdministracion: string;
    idMedicamento: string;
}

export interface CrearAdministracionesEspeciales {
    hora: string;
    cantidad: string;
    id_medicamento: string;
    id_unidadMedida: string;
}

export interface Consulta {
    nombre: string;
}

export interface Bitacora {
    id: number;
    titulo: string;
    nota: string;
    fecha: string;
}
export interface CrearNotas {
    titulo: string;
    textoCompleto: string;
}

export interface Notas {
    id: number;
    titulo: string;
    nota: string;
    fecha: string;
}

export interface NotasEnfermeriaResponse {
    data: Notas[];
    total: number;
}

export interface CuracionResponse {
    data: Curacion[];
    total: number;
}

export interface ConsultaEspecialistaResponse {
    data: ConsultaEspecialista[];
    total: number;
}

export interface ConsultaEBAISResponse {
    data: ConsultaEBAIS[];
    total: number;
}

export interface CrearConsultaEBAIS {
    titulo: string;
    descripcion: string;
    fecha_consulta: string;
}

export interface ConsultaEBAIS {
    id_consulta_ebais: number;
    titulo: string;
    descripcion: string;
    fecha_consulta: string;
}

export interface CrearConsultaEspecialista {
    titulo: string;
    descripcion: string;
    fecha_consulta: string;
}
export interface ConsultaEspecialista {
    id_consulta_especialista: number;
    titulo: string;
    descripcion: string;
    fecha_consulta: string;
}
export interface CrearCuracion {
    titulo: string;
    descripcion: string;
    fecha_curacion: string;
}

export interface Curacion {
    id_curacion: number;
    titulo: string;
    descripcion: string;
    fecha_curacion: string;
}

export interface TipoConsulta {
    id_tipo_consulta: number;
    nombre: string;
}

export interface CrearLibroDeCampo {
    descripcionCompleta: string;
    problematica: string;
    fecha_actividad: string;
    acuerdo_alcanzado: string;
}

export interface LibroDeCampo {
    id: number;
    descripcion: string;
    problematica: string;
    acuerdoAlcanzado: string;
    fechaActividad: string;
    fecha: string;
}

export interface GetSalidasOngoingDto {
    id_salida: number;
    parentesco: string;
    nombre_familiar: string;
    apellido1_familiar: string;
    apellido2_familiar: string;
    fecha_salida: string;
    hora_salida: string;
    fecha_regreso: string;
    hora_regreso: string;
}

export interface SalidasConFamiliarResponse {
    ongoing: GetSalidasOngoingDto | Record<string, never>;
    historial: {
        data: GetSalidasOngoingDto[];
        total: number;
    };
}

export interface LibroDeCampoResponse {
    data: LibroDeCampo[];
    total: number;
}