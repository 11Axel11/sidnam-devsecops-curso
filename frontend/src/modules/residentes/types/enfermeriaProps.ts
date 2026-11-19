import type { AdministracionesEspeciales } from "../models/enfermeria";
import type { MedicamentoResidente } from "../models/enfermeria";
import type { EnfermeriaEntry } from "./enfermeriaNormalized";

export type CardBitacoraProps = { entry: EnfermeriaEntry };


export type BadgePatologiaProps = {
  idPatologia: number;
  nombre: string;
};


export interface MedicamentoProps {
    idMedicamento: number;
    turno: string;
    unidad: string;
    cantidad: number;
}

export interface Turno {
    nombre: string;
}

export type FormAdministracionProps = {
    medicamentoSeleccionado: { id: number; nombre: string };
    onCancel: () => void;
}

export type CardAdministracionMedProps = {
    med: MedicamentoResidente
    idAdministracion: string;
}

export type CardTratamientoEspecialProps = {
    tratamiento: AdministracionesEspeciales;
    idAdministracionEspecial: string;
}

export interface FormAdministracionEspecialProps {
    medicamentoSeleccionado: { id: number; nombre: string };
    onCancel: () => void;
}

export interface LibroDeCampoEntry {
    id: number;
    descripcion: string;
    problematica: string;
    acuerdoAlcanzado: string;
    fechaActividad: string;
    fecha: string;
}

export interface CardLibroDeCampoProps {
    entrada: LibroDeCampoEntry;
}