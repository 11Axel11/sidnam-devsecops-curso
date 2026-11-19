import { create } from 'zustand';
import type {
  NoMasSolicitudesPendientesPayload,
  SolicitudPendienteEvent,
  SolicitudPendienteSocketPayload,
} from '@/types/socket-notification';

interface NotificationState {
  pendingCount: number;
  lastNotification: SolicitudPendienteEvent | null;
  emptyNotification: NoMasSolicitudesPendientesPayload | null;
  setPendingNotification: (
    data: SolicitudPendienteEvent | SolicitudPendienteSocketPayload,
  ) => void;
  setNoMorePendingNotification: (
    data: NoMasSolicitudesPendientesPayload,
  ) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  pendingCount: 0,
  lastNotification: null,
  emptyNotification: null,

  setPendingNotification: (data) => {
    const notification: SolicitudPendienteEvent =
      'tipo' in data && data.tipo
        ? (data as SolicitudPendienteEvent)
        : {
            tipo: data.tipo ?? data.solicitud?.tipo ?? 'voluntariado',
            totalPendientes: data.totalPendientes,
            solicitud: data.solicitud,
            mensaje: data.mensaje,
          };

    set({
      pendingCount: notification.totalPendientes,
      lastNotification: notification,
      emptyNotification: null,
    });
  },

  setNoMorePendingNotification: (data) =>
    set({
      pendingCount: 0,
      lastNotification: null,
      emptyNotification: data,
    }),
}));