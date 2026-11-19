// Utilidad de prueba reutilizable para las entidades nuevas de
// Nutrición/Terapia Física que usan `text`/`mediumtext` en vez del patrón
// de nota segmentada (ver ../CONVENCIONES.md). No usar fuera de pruebas.
//
// Genera un texto determinista: la misma longitud siempre produce
// exactamente el mismo contenido, para que las pruebas sean reproducibles.
const BASE_TEXTO =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim ' +
  'veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea ' +
  'commodo consequat. ';

export function generarTextoLargo(longitud: number = 2500): string {
  if (longitud <= 0) {
    return '';
  }

  let texto = '';
  while (texto.length < longitud) {
    texto += BASE_TEXTO;
  }

  return texto.slice(0, longitud);
}
