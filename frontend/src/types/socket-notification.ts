export interface SolicitudPendienteEvent {
  tipo: 'voluntariado' | 'donacion';
  totalPendientes: number;
  solicitud?: {
    id: number;
    nombre: string;
    email: string;
    fecha: string;
    tipo?: 'voluntariado' | 'donacion';
  };
  mensaje: string;
}

// Si todavía quieres conservar compatibilidad con payloads viejos
export interface SolicitudPendienteSocketPayload {
  totalPendientes: number;
  solicitud: {
    id: number;
    nombre: string;
    email: string;
    fecha: string;
    tipo?: 'voluntariado' | 'donacion';
  };
  mensaje: string;
  tipo?: 'voluntariado' | 'donacion';
}

export interface NoMasSolicitudesPendientesPayload {
  totalPendientes: number;
  mensaje: string;
  fecha: string;
  tipo: 'voluntariado' | 'donacion';
}