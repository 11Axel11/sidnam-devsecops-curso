import { ahoraCostaRicaLocal } from "@/components/app/clinico/fechaClinica";

// Tolerancia del backend para «no futura» (diferencia de reloj entre equipos).
const TOLERANCIA_MIN = 5;

export const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Minutos de «YYYY-MM-DD» + «HH:mm» tomados como un reloj sin zona: sirve para comparar dos horas de
// Costa Rica entre sí sin pasar por la zona horaria del navegador.
const minutos = (fecha: string, hora: string) => {
  const [y, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return Date.UTC(y, m - 1, d, h, min) / 60000;
};

// ¿La fecha y hora (hora de Costa Rica) son posteriores a ahora (hora de Costa Rica) más la tolerancia?
export function esFechaHoraFutura(fecha: string, hora: string): boolean {
  const ahora = ahoraCostaRicaLocal();
  return minutos(fecha, hora) > minutos(ahora.fecha, ahora.hora) + TOLERANCIA_MIN;
}

// Valor de `fechaHora` del POST: sin zona = hora de Costa Rica (contrato eventos §1.1).
export const componerFechaHora = (fecha: string, hora: string) => `${fecha}T${hora}`;
