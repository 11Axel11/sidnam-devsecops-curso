import { hoyCostaRica } from "@/components/app/clinico/fechaClinica";
import { esErrorDeRed, mensajeError, statusDe } from "@/utils/apiError";

// Año y semestre (1: enero–junio, 2: julio–diciembre) de hoy en hora de Costa Rica.
export function semestreActual(): { anio: number; semestre: 1 | 2 } {
  const [anio, mes] = hoyCostaRica().split("-").map(Number);
  return { anio, semestre: mes <= 6 ? 1 : 2 };
}

export const nombreArchivoReporte = (anio: number, semestre: number) =>
  `informe-terapia-fisica-${anio}-${semestre}.pdf`;

type CuerpoError = { message?: string | string[]; errores?: string[] };

// Con `responseType: "blob"` el JSON de un error llega dentro de un Blob: se lee y se arma el mensaje.
async function leerCuerpo(data: unknown): Promise<CuerpoError | null> {
  if (!(data instanceof Blob)) return (data as CuerpoError) ?? null;
  try {
    return JSON.parse(await data.text()) as CuerpoError;
  } catch {
    return null;
  }
}

function mensajeDeCuerpo(c: CuerpoError | null): string | null {
  if (!c) return null;
  const partes = [Array.isArray(c.message) ? c.message.join(" · ") : c.message, ...(c.errores ?? [])];
  const texto = partes.filter(Boolean).join(" — ");
  return texto || null;
}

// Mensaje para mostrar en el diálogo ante cualquier fallo de la petición.
export async function mensajeErrorReporte(err: unknown): Promise<string> {
  if (esErrorDeRed(err)) {
    const codigo = (err as { code?: string })?.code;
    return codigo === "ECONNABORTED"
      ? "El reporte tardó demasiado en generarse. Intenta de nuevo."
      : "No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo.";
  }
  if (statusDe(err) === 403) return "No tienes permiso para generar este reporte.";
  const cuerpo = await leerCuerpo((err as { response?: { data?: unknown } }).response?.data);
  return mensajeDeCuerpo(cuerpo) ?? mensajeError(err, "No se pudo generar el reporte.");
}

// Si lo recibido no es un PDF (p. ej. un JSON con 200), se explica con su mensaje y NO se descarga.
export async function mensajeSiNoEsPdf(blob: Blob): Promise<string | null> {
  if (blob.type.toLowerCase().startsWith("application/pdf")) return null;
  const cuerpo = blob.type.toLowerCase().includes("json") ? await leerCuerpo(blob) : null;
  return mensajeDeCuerpo(cuerpo) ?? "El servidor no devolvió un PDF. Intenta de nuevo.";
}

// Descarga el blob con el nombre indicado.
export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
