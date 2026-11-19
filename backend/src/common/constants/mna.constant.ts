// Decisión de negocio confirmada (Jefatura de Administración, fase CECUIDAM):
// el valor correcto del ítem Q del Mini Nutritional Assessment (MNA),
// dentro de la sección de evaluación completa, es 1,0 — no 2,0. El valor de
// 2,0 que traía el documento de requerimientos original rompía el máximo
// declarado de 16 puntos de esa sección.
//
// BE-6: la tabla completa del instrumento (Anexo D del documento de
// requerimientos) vive en `nutricion/mna/mna-v1.instrumento.ts`, que usa
// estas constantes: el ítem Q toma `MNA_ITEM_Q_PUNTAJE` y su spec comprueba que
// la suma de los máximos de los ítems G a R es `MNA_SECCION_EVALUACION_MAXIMO`.
export const MNA_ITEM_Q_PUNTAJE = 1.0;

export const MNA_SECCION_EVALUACION_MAXIMO = 16;
