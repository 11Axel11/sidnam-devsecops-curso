import { useEffect, useRef } from "react";
import { socket } from "../lib/socket";

type VoluntariadoPayload = {
  totalPendientes: number;
  solicitud?: {
    id: number;
    nombre: string;
    email: string;
    fecha: string;
  };
  mensaje?: string;
  fecha?: string;
};

type NoMasPayload = {
  totalPendientes: number;
  mensaje: string;
  fecha: string;
};

type Params = {
  initialCount: number;
  setCount: (n: number) => void;
  refreshTable: () => void;
  notify: (msg: string) => void;
};

export function useVoluntariadoRealtime({
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

    const onSolicitudesPendientesCount = (payload: VoluntariadoPayload) => {
      const next = payload?.totalPendientes ?? 0;
      const prev = prevCountRef.current;

      // Evita falso "nueva solicitud" cuando solo aprobaron/rechazaron.
      if (next > prev) {
        notify(payload?.mensaje || "Se recibió una nueva solicitud de voluntariado");
      }

      prevCountRef.current = next;
      setCount(next);
      scheduleRefresh();
    };

    const onNoMasSolicitudes = (payload: NoMasPayload) => {
      prevCountRef.current = 0;
      setCount(0);
      notify(payload?.mensaje || "No hay más solicitudes pendientes");
      scheduleRefresh();
    };

    const onReconnect = () => {
      // resincroniza al reconectar
      scheduleRefresh();
    };

    socket.on("solicitudesPendientesCount", onSolicitudesPendientesCount);
    socket.on("nomasSolicitudesPendientes", onNoMasSolicitudes);
    socket.on("reconnect", onReconnect);

    return () => {
      socket.off("solicitudesPendientesCount", onSolicitudesPendientesCount);
      socket.off("nomasSolicitudesPendientes", onNoMasSolicitudes);
      socket.off("reconnect", onReconnect);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [notify, refreshTable, setCount]);
}