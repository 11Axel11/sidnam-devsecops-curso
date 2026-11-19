import { useNotificationStore } from '@/store/notificationStore';

export function NotificationPreview() {
  const lastNotification = useNotificationStore((state) => state.lastNotification);
  const emptyNotification = useNotificationStore((state) => state.emptyNotification);

  if (emptyNotification) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-600 shadow-sm">
        {emptyNotification.mensaje}
      </div>
    );
  }

  if (!lastNotification) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 text-sm shadow-sm">
      <p className="font-medium text-neutral-800">{lastNotification.mensaje}</p>
      <p className="mt-1 text-neutral-500">
        Pendientes: {lastNotification.totalPendientes}
      </p>
    </div>
  );
}