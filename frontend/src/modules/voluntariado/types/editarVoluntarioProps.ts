import type { EditarExpediente } from "../models/accionesExpediente";

export type EditarHorario = {
  id?: number;
  dia: string;
  horaInicio: string;
  horaFin: string;
};

export type EditableHorarioProps = {
  horarios: EditarHorario[];
  onChange: (horarios: EditarHorario[]) => void;
  onServerMutated?: (snapshot: EditarHorario[]) => void; 
};

export type cardEditarExpedienteProps = {
  expediente: EditarExpediente;
}

