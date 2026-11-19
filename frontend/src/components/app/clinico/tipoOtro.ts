// El backend decide que un tipo es «Otro» por su NOMBRE, sin distinguir mayúsculas ni espacios
// (contratos de antecedentes traumáticos §4.2 y de eventos importantes §1.2). Se replica la misma
// comparación para pedir la descripción antes de enviar.
export const NOMBRE_TIPO_OTRO = "otro";

export const esTipoOtro = (nombre?: string | null) =>
  (nombre ?? "").replace(/\s+/g, "").toLowerCase() === NOMBRE_TIPO_OTRO;
