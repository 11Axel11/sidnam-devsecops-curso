import { dataDe, esErrorDeRed, mensajeError, statusDe } from "@/utils/apiError";
import { esExpedienteInactivo, MENSAJE_EXPEDIENTE_INACTIVO } from "./expedienteInactivo";

export type ErrorEnvio =
  | { tipo: "errores"; lista: string[] }
  | { tipo: "campos"; campos: Record<string, string>; otros: string[] }
  | { tipo: "no-existe"; mensaje: string }
  | { tipo: "expediente-inactivo"; mensaje: string }
  | { tipo: "conflicto"; mensaje: string }
  | { tipo: "red" }
  | { tipo: "otro"; mensaje: string };

type Opciones = {
  /** Nombres de campo del DTO: los mensajes de formato se asignan al campo por su primera palabra. */
  campos: readonly string[];
  /** Traduce un mensaje de formato (en inglés o en español, según el campo) a texto de la interfaz. */
  traducir: (campo: string, msg: string) => string;
  fallback: string;
  noExiste: string;
  conflicto: string;
};

// Clasifica el error de un POST de registro (control, evaluaciones) para que el formulario decida qué
// mostrar sin perder lo escrito:
// · 400 { errores } → lista en español (fecha futura/anterior al nacimiento…).
// · 400 { message: string[] } → un mensaje por campo (el primero) y el resto como «otros».
// · 409 `EXPEDIENTE_INACTIVO` → tipo propio, distinto del resto de 409. · 404 / 409 → mensaje del backend. · sin respuesta → red. · lo demás → mensaje o respaldo (403 incluido).
export function clasificarErrorEnvio(err: unknown, o: Opciones): ErrorEnvio {
  const status = statusDe(err);
  const data = dataDe<{ errores?: string[]; message?: string | string[] }>(err);

  if (status === 400) {
    if (Array.isArray(data?.errores)) return { tipo: "errores", lista: data.errores };
    if (Array.isArray(data?.message)) {
      const campos: Record<string, string> = {};
      const otros: string[] = [];
      for (const m of data.message) {
        const campo = m.split(" ")[0];
        if (o.campos.includes(campo)) {
          if (!campos[campo]) campos[campo] = o.traducir(campo, m);
        } else {
          otros.push(o.traducir(campo, m));
        }
      }
      return { tipo: "campos", campos, otros };
    }
  }
  if (status === 404) return { tipo: "no-existe", mensaje: mensajeError(err, o.noExiste) };
  if (esExpedienteInactivo(err)) return { tipo: "expediente-inactivo", mensaje: MENSAJE_EXPEDIENTE_INACTIVO };
  if (status === 409) return { tipo: "conflicto", mensaje: mensajeError(err, o.conflicto) };
  if (esErrorDeRed(err)) return { tipo: "red" };
  return { tipo: "otro", mensaje: mensajeError(err, o.fallback) };
}
