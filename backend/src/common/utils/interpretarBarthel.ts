// Decisión de negocio confirmada (Jefatura de Administración, fase CECUIDAM):
// tabla de interpretación del Índice de Barthel sin huecos en el rango.
// El puntaje máximo es 100, salvo para personas que usan silla de ruedas,
// cuyo máximo posible es 90 — ese caso especial es "Independencia", no
// "Dependencia Moderada".
//
// BE-5: `evaluacion_barthel` no necesita un campo aparte para la silla de
// ruedas. La opción «Independiente en silla de ruedas sin ayuda» del ítem
// Deambular vale 5 puntos, así que quien llama pasa `deambular === 5`. El caso
// especial es total 90 Y deambular = 5 (texto confirmado el 28/09/2026:
// «Independencia — uso de silla de ruedas»), con precedencia sobre 61–90.
export function interpretarBarthel(
  puntajeTotal: number,
  usaSillaDeRuedas: boolean,
): string {
  if (usaSillaDeRuedas && puntajeTotal === 90) {
    return 'Independencia — uso de silla de ruedas';
  }
  if (puntajeTotal === 100) {
    return 'Independencia';
  }
  if (puntajeTotal >= 91) {
    return 'Dependencia Escasa';
  }
  if (puntajeTotal >= 61) {
    return 'Dependencia Moderada';
  }
  if (puntajeTotal >= 21) {
    return 'Dependencia Severa';
  }
  return 'Dependencia Total';
}
