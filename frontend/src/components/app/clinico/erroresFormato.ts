// Parte común de la traducción de los 400 de formato (class-validator, en inglés) de las pantallas
// clínicas. Devuelve `null` si el texto no es de los comunes: cada módulo agrega los suyos por campo.
export function traducirFormatoComun(msg: string): string | null {
  const largo = /shorter than or equal to (\d+) characters/.exec(msg);
  if (largo) return `No puede superar los ${Number(largo[1]).toLocaleString("es-CR")} caracteres`;
  if (/boolean value/.test(msg)) return "Valor inválido";
  if (/debe tener formato/.test(msg)) return "La fecha debe tener formato AAAA-MM-DD";
  if (/should not exist/.test(msg)) return "Campo no permitido";
  return null;
}
