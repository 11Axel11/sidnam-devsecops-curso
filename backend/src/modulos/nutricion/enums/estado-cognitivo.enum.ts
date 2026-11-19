/**
 * Estado cognitivo de la valoración nutricional (RF-NU-04): «normal o con nivel de deterioro
 * cognitivo». El «nivel» va aparte, en `nivelDeterioroCognitivo` (lista cerrada leve / moderado / severo,
 * ver `nivel-deterioro-cognitivo.enum.ts`).
 */
export enum EstadoCognitivo {
  NORMAL = 'normal',
  CON_DETERIORO = 'con_deterioro',
}
