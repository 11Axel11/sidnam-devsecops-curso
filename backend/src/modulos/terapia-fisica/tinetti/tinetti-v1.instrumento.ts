import { ItemDeInstrumento, maximoDeItems, puntosPermitidos } from 'src/common/valoraciones/instrumento';

/**
 * Escala de Tinetti, versión 1 (Anexo B, Tablas 21 y 22 del documento de requerimientos; RF-TF-09). ÚNICA tabla
 * de ítems: de ella salen el DTO, `calcularTinetti` y el contrato del frontend. El documento define los
 * **veinte ítems individuales** (diez de equilibrio y diez de marcha) además de los tres totales, y RN-10 exige
 * guardar las puntuaciones individuales; por eso la entidad tiene una columna por ítem (el ERD solo traía los
 * totales). Cada ítem admite SOLO los puntos listados. Las etiquetas son el texto exacto del anexo.
 *
 * Máximos: equilibrio 16 (1+2+2+2+2+2+1+1+1+2), marcha 12 (1+1+1+1+1+1+1+2+2+1), total 28 (RN-06).
 */
export const VERSION_TINETTI = 'Tinetti-v1';

export const ITEMS_EQUILIBRIO_TINETTI_V1 = [
  {
    campo: 'equilibrioSentado',
    nombre: 'Equilibrio sentado',
    opciones: [
      { puntos: 0, etiqueta: 'Se inclina o desliza en la silla' },
      { puntos: 1, etiqueta: 'Firme y seguro' },
    ],
  },
  {
    campo: 'levantarse',
    nombre: 'Levantarse',
    opciones: [
      { puntos: 0, etiqueta: 'Incapaz sin ayuda' },
      { puntos: 1, etiqueta: 'Capaz utilizando los brazos como ayuda' },
      { puntos: 2, etiqueta: 'Capaz sin utilizar los brazos' },
    ],
  },
  {
    campo: 'intentosLevantarse',
    nombre: 'Intentos de levantarse',
    opciones: [
      { puntos: 0, etiqueta: 'Incapaz sin ayuda' },
      { puntos: 1, etiqueta: 'Capaz, pero necesita más de un intento' },
      { puntos: 2, etiqueta: 'Capaz de levantarse en el primer intento' },
    ],
  },
  {
    campo: 'equilibrioInmediato',
    nombre: 'Equilibrio inmediato (primeros 5 segundos al levantarse)',
    opciones: [
      { puntos: 0, etiqueta: 'Inestable: se tambalea, mueve los pies, marcado balanceo del tronco' },
      { puntos: 1, etiqueta: 'Estable, pero usa andador, bastón, muletas u otros objetos de soporte' },
      { puntos: 2, etiqueta: 'Estable sin usar bastón u otros soportes' },
    ],
  },
  {
    campo: 'equilibrioEnPie',
    nombre: 'Equilibrio en pie',
    opciones: [
      { puntos: 0, etiqueta: 'Inestable' },
      {
        puntos: 1,
        etiqueta: 'Estable con aumento de la base de sustentación: talones separados más de 10 cm, o usa bastón, andador u otras ayudas',
      },
      { puntos: 2, etiqueta: 'Base de sustentación estrecha: no requiere ayudas' },
    ],
  },
  {
    campo: 'empujon',
    nombre:
      'Empujón (el examinador empuja ligeramente el esternón con la palma de la mano tres veces, con la persona de pie y los pies tan juntos como sea posible)',
    opciones: [
      { puntos: 0, etiqueta: 'Tiende a caerse' },
      { puntos: 1, etiqueta: 'Se tambalea, se sujeta, pero se mantiene solo' },
      { puntos: 2, etiqueta: 'Firme' },
    ],
  },
  {
    campo: 'ojosCerrados',
    nombre: 'Ojos cerrados (en la posición del ítem 6)',
    opciones: [
      { puntos: 0, etiqueta: 'Inestable' },
      { puntos: 1, etiqueta: 'Estable' },
    ],
  },
  {
    campo: 'giro360Continuidad',
    nombre: 'Giro de 360° — continuidad de los pasos',
    opciones: [
      { puntos: 0, etiqueta: 'Pasos discontinuos' },
      { puntos: 1, etiqueta: 'Pasos continuos' },
    ],
  },
  {
    campo: 'giro360Estabilidad',
    nombre: 'Giro de 360° — estabilidad',
    opciones: [
      { puntos: 0, etiqueta: 'Inestable: se agarra a algo o se tambalea' },
      { puntos: 1, etiqueta: 'Estable' },
    ],
  },
  {
    campo: 'sentarse',
    nombre: 'Sentarse',
    opciones: [
      { puntos: 0, etiqueta: 'Inseguro: calcula mal la distancia, cae en la silla' },
      { puntos: 1, etiqueta: 'Usa los brazos o tiene un movimiento que no es suave' },
      { puntos: 2, etiqueta: 'Seguro, movimiento suave' },
    ],
  },
] as const satisfies readonly ItemDeInstrumento[];

export const ITEMS_MARCHA_TINETTI_V1 = [
  {
    campo: 'inicioMarcha',
    nombre: 'Inicio de la marcha (inmediatamente después de decirle «camine»)',
    opciones: [
      { puntos: 0, etiqueta: 'Cualquier duda o vacilación, o múltiples intentos para comenzar' },
      { puntos: 1, etiqueta: 'No está vacilante' },
    ],
  },
  {
    campo: 'longitudPasoDerecho',
    nombre: 'Longitud del paso — balanceo del pie derecho',
    opciones: [
      { puntos: 0, etiqueta: 'No sobrepasa el pie izquierdo con el paso' },
      { puntos: 1, etiqueta: 'Sobrepasa el pie izquierdo al dar el paso' },
    ],
  },
  {
    campo: 'alturaPasoDerecho',
    nombre: 'Altura del paso — pie derecho',
    opciones: [
      { puntos: 0, etiqueta: 'El pie derecho no se levanta completamente del suelo al dar el paso' },
      { puntos: 1, etiqueta: 'Se levanta completamente del suelo' },
    ],
  },
  {
    campo: 'longitudPasoIzquierdo',
    nombre: 'Longitud del paso — balanceo del pie izquierdo',
    opciones: [
      { puntos: 0, etiqueta: 'No sobrepasa el pie derecho con el paso' },
      { puntos: 1, etiqueta: 'Sobrepasa el pie derecho al dar el paso' },
    ],
  },
  {
    campo: 'alturaPasoIzquierdo',
    nombre: 'Altura del paso — pie izquierdo',
    opciones: [
      { puntos: 0, etiqueta: 'El pie izquierdo no se levanta completamente del suelo al dar el paso' },
      { puntos: 1, etiqueta: 'Se levanta completamente del suelo' },
    ],
  },
  {
    campo: 'simetriaPaso',
    nombre: 'Simetría del paso',
    opciones: [
      { puntos: 0, etiqueta: 'La longitud del paso con el pie derecho y con el izquierdo es diferente (estimada)' },
      { puntos: 1, etiqueta: 'Los pasos son de igual longitud' },
    ],
  },
  {
    campo: 'continuidadPasos',
    nombre: 'Continuidad de los pasos',
    opciones: [
      { puntos: 0, etiqueta: 'Se detiene o hay discontinuidad entre los pasos' },
      { puntos: 1, etiqueta: 'Los pasos son continuos' },
    ],
  },
  {
    campo: 'trayectoria',
    nombre: 'Trayectoria (estimada en relación con baldosines de 30 cm; se observa la desviación de un pie en 3 m de recorrido)',
    opciones: [
      { puntos: 0, etiqueta: 'Desviación marcada' },
      { puntos: 1, etiqueta: 'Desviación moderada o leve, o utiliza ayudas' },
      { puntos: 2, etiqueta: 'Recto, sin utilizar ayudas' },
    ],
  },
  {
    campo: 'tronco',
    nombre: 'Tronco',
    opciones: [
      { puntos: 0, etiqueta: 'Marcado balanceo o utiliza ayudas para caminar' },
      { puntos: 1, etiqueta: 'No hay balanceo, pero hay flexión de las rodillas o espalda, o separa los brazos hacia fuera' },
      { puntos: 2, etiqueta: 'No hay balanceo, no hay flexión, no utiliza los brazos ni usa ayudas' },
    ],
  },
  {
    campo: 'posturaMarcha',
    nombre: 'Postura de la marcha',
    opciones: [
      { puntos: 0, etiqueta: 'Talones separados' },
      { puntos: 1, etiqueta: 'Talones que casi se tocan mientras camina' },
    ],
  },
] as const satisfies readonly ItemDeInstrumento[];

export const ITEMS_TINETTI_V1 = [...ITEMS_EQUILIBRIO_TINETTI_V1, ...ITEMS_MARCHA_TINETTI_V1] as const;

export type CampoEquilibrio = (typeof ITEMS_EQUILIBRIO_TINETTI_V1)[number]['campo'];
export type CampoMarcha = (typeof ITEMS_MARCHA_TINETTI_V1)[number]['campo'];
export type CampoTinetti = CampoEquilibrio | CampoMarcha;

/** Respuestas de una evaluación: los puntos elegidos en cada uno de los veinte ítems. */
export type ItemsTinetti = Record<CampoTinetti, number>;

export const TINETTI_V1 = {
  version: VERSION_TINETTI,
  equilibrio: ITEMS_EQUILIBRIO_TINETTI_V1,
  marcha: ITEMS_MARCHA_TINETTI_V1,
} as const;

export const MAXIMO_EQUILIBRIO = maximoDeItems(ITEMS_EQUILIBRIO_TINETTI_V1); // 16
export const MAXIMO_MARCHA = maximoDeItems(ITEMS_MARCHA_TINETTI_V1); // 12
export const MAXIMO_TINETTI = MAXIMO_EQUILIBRIO + MAXIMO_MARCHA; // 28

/** Puntos permitidos por campo, para los decoradores del DTO. */
export const PUNTOS_TINETTI = Object.fromEntries(ITEMS_TINETTI_V1.map((i) => [i.campo, puntosPermitidos(i)])) as Record<
  CampoTinetti,
  number[]
>;
