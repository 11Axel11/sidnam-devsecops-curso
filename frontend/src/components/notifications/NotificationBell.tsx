import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';

export function NotificationBell() {
  const pendingCount = useNotificationStore((state) => state.pendingCount);

  return (
    <button
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-50"
      aria-label="Notificaciones"
    >
      <Bell size={18} />

      {pendingCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-medium text-white">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </button>
  );
}