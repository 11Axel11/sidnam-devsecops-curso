// `fecha` clínica = YYYY-MM-DD en hora de Costa Rica. Se formatea con split para no pasar por
// `Date` (que la correría de día según la zona horaria del navegador).
export function formatearFechaClinica(ymd?: string | null): string {
  if (!ymd) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}

const TZ_CR = "America/Costa_Rica";

// Hoy como YYYY-MM-DD en hora de Costa Rica (la fecha por defecto y el tope de "no futura").
export function hoyCostaRica(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_CR, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

// Ahora en hora de Costa Rica, separado en fecha (YYYY-MM-DD) y hora (HH:mm). Es la fecha/hora
// inicial de los registros con hora y la referencia de "no futura": nunca la zona del navegador.
export function ahoraCostaRicaLocal(): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_CR, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const v = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return { fecha: `${v("year")}-${v("month")}-${v("day")}`, hora: `${v("hour")}:${v("minute")}` };
}

// Instante ISO 8601 UTC del backend -> "dd/MM/yyyy HH:mm" en hora de Costa Rica (UTC-6).
export function formatearInstanteCR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: TZ_CR, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}
