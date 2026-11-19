import { useEffect, useRef } from "react";
import { socket } from "../lib/socket";

type Params = {
  initialCount: number;
  setCount: (n: number) => void;
  refreshTable: () => void;
  notify: (msg: string) => void;
};

export function useDonacionRealtime({
  initialCount,
  setCount,
  refreshTable,
  notify,
}: Params) {
  const prevCountRef = useRef<number>(initialCount);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    prevCountRef.current = initialCount;
  }, [initialCount]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        refreshTable();
      }, 250);
    };

    const onDonacionCount = (count: number) => {
      const next = Number(count) || 0;
      const prev = prevCountRef.current;

      if (next > prev) {
        notify("Se recibió una nueva solicitud de donación");
      }

      prevCountRef.current = next;
      setCount(next);
      scheduleRefresh();
    };

    socket.on("solicitudesDonacionPendientesCount", onDonacionCount);
    socket.on("reconnect", scheduleRefresh);

    return () => {
      socket.off("solicitudesDonacionPendientesCount", onDonacionCount);
      socket.off("reconnect", scheduleRefresh);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [notify, refreshTable, setCount]);
}