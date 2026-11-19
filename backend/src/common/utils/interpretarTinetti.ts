// Decisión de negocio confirmada (Jefatura de Administración, fase CECUIDAM):
// tabla de interpretación de riesgo de caída de la Escala de Tinetti.
// Esta tabla no existía en el documento de requerimientos original.
// Puntaje total máximo: 28.
export function interpretarTinetti(puntajeTotal: number): string {
  if (puntajeTotal < 19) {
    return 'Riesgo alto de caídas';
  }
  if (puntajeTotal <= 23) {
    return 'Riesgo de caídas';
  }
  return 'Riesgo bajo o leve';
}
