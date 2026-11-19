import { X, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotificationStore } from '@/store/notificationStore';

export function WebSocketNotification() {
  const lastNotification = useNotificationStore((state) => state.lastNotification);
  const emptyNotification = useNotificationStore((state) => state.emptyNotification);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastNotification || emptyNotification) {
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [lastNotification, emptyNotification]);

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] w-full max-w-sm">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Bell size={18} />
          </div>

          <div className="flex-1">
            {lastNotification ? (
              <>
                <p className="text-sm font-semibold text-neutral-900">
                  {lastNotification.mensaje}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {lastNotification.tipo === 'voluntariado'
                    ? `Solicitudes de voluntariado pendientes: ${lastNotification.totalPendientes}`
                    : `Solicitudes de donación pendientes: ${lastNotification.totalPendientes}`}
                </p>
              </>
            ) : emptyNotification ? (
              <>
                <p className="text-sm font-semibold text-neutral-900">
                  {emptyNotification.mensaje}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {emptyNotification.tipo === 'voluntariado'
                    ? 'No quedan solicitudes de voluntariado por revisar'
                    : 'No quedan solicitudes de donación por revisar'}
                </p>
              </>
            ) : null}
          </div>

          <button
            onClick={() => setVisible(false)}
            className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}