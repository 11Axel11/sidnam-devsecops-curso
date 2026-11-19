import { ItemDeInstrumento, maximoDeItems, puntosPermitidos } from 'src/common/valoraciones/instrumento';

/**
 * Índice de Barthel, versión 1 (Anexo A, Tabla 18 del documento de requerimientos; RF-TF-08). ÚNICA tabla
 * de ítems: de ella salen el DTO, `calcularBarthel` y el contrato del frontend. Cada ítem admite SOLO los
 * puntos listados (no cualquier entero de un rango). Las etiquetas son el texto exacto del anexo.
 *
 * El 5 de «Deambular» es «Independiente en silla de ruedas sin ayuda»: de ahí sale la regla de silla de ruedas
 * (total 90 con `deambular = 5`; ver `calcularBarthel`).
 */
export const VERSION_BARTHEL = 'Barthel-v1';

/** Puntos de «Deambular» que significan «Independiente en silla de ruedas sin ayuda». */
export const DEAMBULAR_SILLA_DE_RUEDAS = 5;

export const ITEMS_BARTHEL_V1 = [
  {
    campo: 'comer',
    nombre: 'Comer',
    opciones: [
      { puntos: 10, etiqueta: 'Totalmente independiente' },
      { puntos: 5, etiqueta: 'Necesita ayuda para cortar carne, el pan, etc.' },
      { puntos: 0, etiqueta: 'Dependiente' },
    ],
  },
  {
    campo: 'lavarse',
    nombre: 'Lavarse',
    opciones: [
      { puntos: 5, etiqueta: 'Independiente: entra y sale solo del baño' },
      { puntos: 0, etiqueta: 'Dependiente' },
    ],
  },
  {
    campo: 'vestirse',
    nombre: 'Vestirse',
    opciones: [
      { puntos: 10, etiqueta: 'Independiente: capaz de ponerse y quitarse la ropa, abotonarse, atarse los zapatos' },
      { puntos: 5, etiqueta: 'Necesita ayuda' },
      { puntos: 0, etiqueta: 'Dependiente' },
    ],
  },
  {
    campo: 'arreglarse',
    nombre: 'Arreglarse',
    opciones: [
      { puntos: 5, etiqueta: 'Independiente para lavarse la cara, las manos, peinarse, afeitarse, maquillarse, etc.' },
      { puntos: 0, etiqueta: 'Dependiente' },
    ],
  },
  {
    campo: 'deposiciones',
    nombre: 'Deposiciones (valórese la semana previa)',
    opciones: [
      { puntos: 10, etiqueta: 'Continencia normal' },
      {
        puntos: 5,
        etiqueta: 'Ocasionalmente algún episodio de incontinencia, o necesita ayuda para administrarse supositorios o lavativas',
      },
      { puntos: 0, etiqueta: 'Incontinencia' },
    ],
  },
  {
    campo: 'miccion',
    nombre: 'Micción (valórese la semana previa)',
    opciones: [
      { puntos: 10, etiqueta: 'Continencia normal, o es capaz de cuidarse de la sonda si tiene una puesta' },
      { puntos: 5, etiqueta: 'Un episodio diario como máximo de incontinencia, o necesita ayuda para cuidar de la sonda' },
      { puntos: 0, etiqueta: 'Incontinencia' },
    ],
  },
  {
    campo: 'usarRetrete',
    nombre: 'Usar el retrete',
    opciones: [
      { puntos: 10, etiqueta: 'Independiente para ir al cuarto de aseo, quitarse y ponerse la ropa' },
      { puntos: 5, etiqueta: 'Necesita ayuda para ir al retrete, pero se limpia solo' },
      { puntos: 0, etiqueta: 'Dependiente' },
    ],
  },
  {
    campo: 'trasladarse',
    nombre: 'Trasladarse',
    opciones: [
      { puntos: 15, etiqueta: 'Independiente para ir del sillón a la cama' },
      { puntos: 10, etiqueta: 'Mínima ayuda física o supervisión para hacerlo' },
      { puntos: 5, etiqueta: 'Necesita gran ayuda, pero es capaz de mantenerse sentado solo' },
      { puntos: 0, etiqueta: 'Dependiente' },
    ],
  },
  {
    campo: 'deambular',
    nombre: 'Deambular',
    opciones: [
      { puntos: 15, etiqueta: 'Independiente, camina solo 50 metros' },
      { puntos: 10, etiqueta: 'Necesita ayuda física o supervisión para caminar 50 metros' },
      { puntos: DEAMBULAR_SILLA_DE_RUEDAS, etiqueta: 'Independiente en silla de ruedas sin ayuda' },
      { puntos: 0, etiqueta: 'Dependiente' },
    ],
  },
  {
    campo: 'escalones',
    nombre: 'Escalones',
    opciones: [
      { puntos: 10, etiqueta: 'Independiente para bajar y subir escaleras' },
      { puntos: 5, etiqueta: 'Necesita ayuda física o supervisión para hacerlo' },
      { puntos: 0, etiqueta: 'Dependiente' },
    ],
  },
] as const satisfies readonly ItemDeInstrumento[];

export type CampoBarthel = (typeof ITEMS_BARTHEL_V1)[number]['campo'];

/** Respuestas de una evaluación: los puntos elegidos en cada uno de los diez ítems. */
export type ItemsBarthel = Record<CampoBarthel, number>;

export const BARTHEL_V1 = { version: VERSION_BARTHEL, items: ITEMS_BARTHEL_V1 } as const;

/** Puntuación máxima del instrumento (100). */
export const MAXIMO_BARTHEL = maximoDeItems(ITEMS_BARTHEL_V1);

/** Puntos permitidos por campo, para los decoradores del DTO. */
export const PUNTOS_BARTHEL = Object.fromEntries(ITEMS_BARTHEL_V1.map((i) => [i.campo, puntosPermitidos(i)])) as Record<
  CampoBarthel,
  number[]
>;
