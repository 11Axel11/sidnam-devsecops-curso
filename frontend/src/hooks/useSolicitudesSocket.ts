import { useCallback, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthz } from '@/hooks/useAuth';
import type {
  NoMasSolicitudesPendientesPayload,
  SolicitudPendienteEvent,
} from '@/types/socket-notification';

const PERMISO_VER_DONACIONES = 'Donaciones.Solicitud Donaciones:Ver';
const PERMISO_VER_VOLUNTARIADO = 'Voluntariado.Solicitudes Voluntariado:Ver';
const normalizePermission = (permission: string) =>
  permission
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const PERMISO_VER_DONACIONES_NORMALIZADO =
  normalizePermission(PERMISO_VER_DONACIONES);
const PERMISO_VER_VOLUNTARIADO_NORMALIZADO =
  normalizePermission(PERMISO_VER_VOLUNTARIADO);

export function useSolicitudesSocket() {
  const { perms, isLoading } = useAuthz({ normalize: true });
  const setPendingNotification = useNotificationStore(
    (state) => state.setPendingNotification,
  );
  const setNoMorePendingNotification = useNotificationStore(
    (state) => state.setNoMorePendingNotification,
  );

  const canReceiveNotificationByType = useCallback((
    tipo: 'voluntariado' | 'donacion' | undefined,
  ) => {
    if (tipo === 'donacion') {
      return perms.includes(PERMISO_VER_DONACIONES_NORMALIZADO);
    }

    if (tipo === 'voluntariado') {
      return perms.includes(PERMISO_VER_VOLUNTARIADO_NORMALIZADO);
    }

    return false;
  }, [perms]);

  const hasRelevantPermission =
    perms.includes(PERMISO_VER_DONACIONES_NORMALIZADO) ||
    perms.includes(PERMISO_VER_VOLUNTARIADO_NORMALIZADO);

  useEffect(() => {
    if (isLoading || !hasRelevantPermission) {
      return;
    }

    const handleConnect = () => {
      console.log('✅ Socket conectado');
    };

    const handleConnectError = (error: Error) => {
      console.error('❌ Error de socket:', error.message);
    };

    const handleSolicitudesPendientes = (data: SolicitudPendienteEvent) => {
      const tipo = data?.tipo ?? data?.solicitud?.tipo;
      if (!canReceiveNotificationByType(tipo)) return;

      setPendingNotification(data);
    };

    const handleNoMorePending = (data: NoMasSolicitudesPendientesPayload) => {
      if (!canReceiveNotificationByType(data?.tipo)) return;

      setNoMorePendingNotification(data);
    };

    socket.off('connect', handleConnect);
    socket.off('connect_error', handleConnectError);
    socket.off('solicitudesPendientesCount', handleSolicitudesPendientes);
    socket.off('nomasSolicitudesPendientes', handleNoMorePending);

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('solicitudesPendientesCount', handleSolicitudesPendientes);
    socket.on('nomasSolicitudesPendientes', handleNoMorePending);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('solicitudesPendientesCount', handleSolicitudesPendientes);
      socket.off('nomasSolicitudesPendientes', handleNoMorePending);
    };
  }, [
    canReceiveNotificationByType,
    hasRelevantPermission,
    isLoading,
    setPendingNotification,
    setNoMorePendingNotification,
  ]);
}