import sidnamAPI from "@/api/apiConfig";
import { rutaBaseExpedientesResidentes, rutaBaseResidentes, rutaConsultas, rutaEDUS, rutaExpedienteEnfermeria, rutaExpedienteEnfermeriaAcciones, rutaMedicamentos, rutaPatologias } from "./rutas";
import type { EstadoTipo } from "@/models/sharedModels";
import type { Patologia, Consulta, CrearNotas, Notas, CrearConsultaEspecialista, CrearCuracion, CrearConsultaEBAIS, ExpedienteResidenteEnfermeria, TipoConsulta, CrearMedicamento, CrearAdministracion, CrearAdministracionesEspeciales, Medicamento, DeleteAdministraciones, NotasEnfermeriaResponse, CuracionResponse, ConsultaEspecialistaResponse, ConsultaEBAISResponse } from "../models/enfermeria";
import type { CreateEDUS, EDUS, UpdateEDUS } from "../models/edus";

// post

export const createMedicamento = async (
    { idTipoMedicamento, medicamento }: { idTipoMedicamento: number; medicamento: CrearMedicamento }
): Promise<CrearMedicamento> => {
    const response = await sidnamAPI.post<CrearMedicamento>(
        `${rutaMedicamentos}/${idTipoMedicamento}`,
        medicamento
    );
    return response.data;
};

export const createPatologia = async (
    { patologia }: { patologia: Patologia }
): Promise<Patologia> => {
    const response = await sidnamAPI.post<Patologia>(
        `${rutaPatologias}`,
        patologia
    );
    return response.data;
};

export const createTipoConsulta = async (
    { consulta }: { consulta: Consulta }
): Promise<Consulta> => {
    const response = await sidnamAPI.post<Consulta>(
        `${rutaConsultas}`,
        consulta
    );
    return response.data;
};

export const createPatologiaResidente = async (idExpediente: number, idPatologia?: number): Promise<Patologia[]> => {
    const response = await sidnamAPI.post<Patologia[]>
        (`${rutaBaseExpedientesResidentes}/${idExpediente}/adjuntar-patologia/${idPatologia}`);
    return response.data;
};

export const deletePatologiaResidente = async (idExpediente: number, idPatologia?: number): Promise<Patologia[]> => {
    const response = await sidnamAPI.delete<Patologia[]>
        (`${rutaBaseExpedientesResidentes}/${idExpediente}/adjuntar-patologia/${idPatologia}`);
    return response.data;
};

export const createAdministracionResidente = async (data: { idExpediente: number } & CrearAdministracion): Promise<CrearAdministracion> => {
    const { idExpediente, ...administracionData } = data;
    const response = await sidnamAPI.post(
        `${rutaExpedienteEnfermeriaAcciones}/medicamentos/${idExpediente}`,
        administracionData
    );
    return response.data;
};

export const createAdministracionEspecialResidente = async (
    data: { idExpediente: number } & CrearAdministracionesEspeciales
): Promise<CrearAdministracionesEspeciales> => {
    const { idExpediente, ...administracionData } = data;
    const response = await sidnamAPI.post(
        `${rutaExpedienteEnfermeriaAcciones}/medicamentosEspeciales/${idExpediente}`,
        administracionData
    );
    return response.data;
};

export const createNotaEnfermeria = async (idExpediente: number, nota: CrearNotas): Promise<Notas> => {
    const response = await sidnamAPI.post<Notas>(
        `${rutaBaseExpedientesResidentes}/notas-enfermeria/${idExpediente}`,
        nota
    );
    return response.data;
};

export const createConsultaEspecialista = async (idTipo: number, idExpediente: number, nota: CrearConsultaEspecialista): Promise<CrearConsultaEspecialista> => {
    const response = await sidnamAPI.post<CrearConsultaEspecialista>(
        `${rutaBaseExpedientesResidentes}/consultas_especialistas/${idTipo}/${idExpediente}`,
        nota
    );
    return response.data;
};

export const createCuracion = async (idExpediente: number, nota: CrearNotas): Promise<CrearCuracion> => {
    const response = await sidnamAPI.post<CrearCuracion>(
        `${rutaBaseExpedientesResidentes}/curaciones/${idExpediente}`,
        nota
    );
    return response.data;
};

export const createConsultaEBAIS = async (idExpediente: number, nota: CrearNotas): Promise<CrearConsultaEBAIS> => {
    const response = await sidnamAPI.post<CrearConsultaEBAIS>(
        `${rutaBaseExpedientesResidentes}/consultas_ebais/${idExpediente}`,
        nota
    );
    return response.data;
};

export const createEDUS = async (
    edus: CreateEDUS
): Promise<CreateEDUS> => {
    const response = await sidnamAPI.post<CreateEDUS>(
        `${rutaEDUS}`,
        edus
    );
    return response.data;
};

// get

export const getPatologias = async (): Promise<Patologia[]> => {
    const response = await sidnamAPI.get<Patologia[]>(`${rutaPatologias}`);
    return response.data;
};

export const getExpedienteEnfermeria = async (idExpediente: number): Promise<ExpedienteResidenteEnfermeria> => {
    const response = await sidnamAPI.get<ExpedienteResidenteEnfermeria>(`${rutaExpedienteEnfermeria}/${idExpediente}`);
    return response.data;
};

export const getTiposBitacora = async (): Promise<EstadoTipo[]> => {
    const response = await sidnamAPI.get<EstadoTipo[]>
        (`${rutaExpedienteEnfermeriaAcciones}/bitacoras`);

    return response.data;
};

export const getTiposConsultaEspecialista = async (): Promise<TipoConsulta[]> => {
    const response = await sidnamAPI.get<TipoConsulta[]>
        (`${rutaBaseResidentes}/tipos-consulta`);

    return response.data;
};

export const getMedicamentos = async (idTipoMedicamento: number): Promise<Medicamento[]> => {
    const response = await sidnamAPI.get<Medicamento[]>(`${rutaMedicamentos}/tipo/${idTipoMedicamento}`);
    return response.data;
};

export const getTipoMedicamento = async (): Promise<CrearMedicamento[]> => {
    const response = await sidnamAPI.get<CrearMedicamento[]>(`${rutaBaseResidentes}/tipos-medicamentos`);
    return response.data;
};

export const getTurnos = async (): Promise<EstadoTipo[]> => {
    const response = await sidnamAPI.get<EstadoTipo[]>(`${rutaBaseResidentes}/turnos`);
    return response.data;
};


export const getEDUS = async (): Promise<EDUS> => {
    const response = await sidnamAPI.get<EDUS>(`${rutaEDUS}`);
    return response.data;
};


// bitacoras 
export const getNotasEnfermeria = async (
    idExpediente: number,
    page: number = 1,
    limit: number = 10
): Promise<NotasEnfermeriaResponse> => {
    const response = await sidnamAPI.get<NotasEnfermeriaResponse>(
        `${rutaBaseExpedientesResidentes}/notas-enfermeria/${idExpediente}`,
        {
            params: {
                page,
                limit,
            },
        }
    );
    return response.data;
};

export const getCuraciones = async (
    idExpediente: number,
    page: number = 1,
    limit: number = 4
): Promise<CuracionResponse> => {
    const response = await sidnamAPI.get<CuracionResponse>(
        `${rutaExpedienteEnfermeriaAcciones}/curaciones/${idExpediente}`,
        {
            params: {
                page,
                limit,
            },
        }
    );
    return response.data;
};

export const getConsultasEspecialista = async (
    idTipo: number,
    idExpediente: number,
    page: number = 1,
    limit: number = 4
): Promise<ConsultaEspecialistaResponse> => {
    const response = await sidnamAPI.get<ConsultaEspecialistaResponse>(
        `${rutaExpedienteEnfermeriaAcciones}/consultasEspecialistas/${idTipo}/${idExpediente}`,
        {
            params: {
                page,
                limit,
            },
        }
    );
    return response.data;
};

export const getConsultasEBAIS = async (
    idExpediente: number,
    page: number = 1,
    limit: number = 4
): Promise<ConsultaEBAISResponse> => {
    const response = await sidnamAPI.get<ConsultaEBAISResponse>(
        `${rutaExpedienteEnfermeriaAcciones}/consultasEbais/${idExpediente}`,
        {
            params: {
                page,
                limit,
            },
        }
    );
    return response.data;
};

// delete


export const deleteAdministracionResidente = async (
    { idAdministracion, idMedicamento }: { idAdministracion: string; idMedicamento: string; }
): Promise<DeleteAdministraciones> => {
    const response = await sidnamAPI.delete<DeleteAdministraciones>(
        `${rutaBaseExpedientesResidentes}/administraciones/${idAdministracion}/${idMedicamento}`,
  );
  return response.data;
};

export const deleteAdministracionEspecialResidente = async (
    { idAdministracionEspecial }: { idAdministracionEspecial: string;  }
): Promise<DeleteAdministraciones> => {
    const response = await sidnamAPI.delete<DeleteAdministraciones>(
        `${rutaBaseExpedientesResidentes}/administracionesEspecial/${idAdministracionEspecial}`,
    );
    return response.data;
};


// put
export const patchEDUS = async (
    { edus }: { edus: UpdateEDUS }
): Promise<UpdateEDUS> => {
    const response = await sidnamAPI.put<UpdateEDUS>(
        `${rutaEDUS}`,
        edus
    );
    return response.data;
};