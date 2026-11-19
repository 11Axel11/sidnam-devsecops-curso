/**
 * Respuesta de la ficha resumen interdisciplinaria (RF-TR-01): LISTA BLANCA explícita. Es lo ÚNICO que sale de
 * `GET /expedientes/:id/ficha-resumen`; cada campo se copia a mano en `ficha-resumen.mapeo.ts` (nunca se esparcen
 * entidades). NO incluye diagnóstico, tratamiento, avances, resultados bioquímicos, MNA ni el detalle de ningún
 * instrumento, ni el nivel de deterioro cognitivo, ni los antecedentes personales, ni ids ni nombres de usuario.
 *
 * Cada bloque es `{ datos, motivo }`: con datos, `motivo` es null; sin datos, `datos` es null y `motivo` explica por qué
 * (nunca un error).
 */
export interface BloqueFicha<T> {
  datos: T | null;
  motivo: string | null;
}

/** Grado de la última evaluación de Barthel no anulada, con su fecha ('YYYY-MM-DD'). Sin puntaje ni ítems. */
export interface DependenciaBarthel {
  grado: string;
  fecha: string;
}

/** Condición de movilidad = dato funcional de la valoración nutricional vigente. */
export interface CondicionMovilidad {
  condicion: string;
}

/** Valoración fisioterapéutica vigente: uso de ayudas biomecánicas y cuáles. */
export interface AyudasBiomecanicas {
  usa: boolean;
  cuales: string | null;
}

/** Valoración fisioterapéutica vigente: antecedentes de caídas (sí/no; sin el detalle libre). */
export interface AntecedentesCaidas {
  presenta: boolean;
}

/** Último evento importante de tipo «Caída» no anulado (instante ISO 8601 UTC). */
export interface UltimoEventoCaida {
  fechaHora: Date;
}

/** Valoración nutricional vigente: alergia a medicamentos y cuáles (CA-17). */
export interface AlergiaMedicamentos {
  presenta: boolean;
  cuales: string | null;
}

/** Última valoración de un departamento: la vigente o, si no hay, la más reciente confirmada no anulada. */
export interface UltimaValoracion {
  fecha: string;
  estado: 'vigente' | 'reemplazada';
}

export interface FichaResumenDto {
  expedienteId: number;
  dependenciaBarthel: BloqueFicha<DependenciaBarthel>;
  condicionMovilidad: BloqueFicha<CondicionMovilidad>;
  ayudasBiomecanicas: BloqueFicha<AyudasBiomecanicas>;
  antecedentesCaidas: BloqueFicha<AntecedentesCaidas>;
  ultimoEventoCaida: BloqueFicha<UltimoEventoCaida>;
  alergiaMedicamentos: BloqueFicha<AlergiaMedicamentos>;
  ultimaValoracionTerapiaFisica: BloqueFicha<UltimaValoracion>;
  ultimaValoracionNutricion: BloqueFicha<UltimaValoracion>;
}

/**
 * Las ÚNICAS claves que puede tener la respuesta, por nivel. La prueba de lista blanca compara contra este objeto: agregar
 * un campo a la respuesta sin agregarlo aquí (con aprobación) hace fallar la prueba.
 */
export const CLAVES_PERMITIDAS = {
  raiz: [
    'expedienteId',
    'dependenciaBarthel',
    'condicionMovilidad',
    'ayudasBiomecanicas',
    'antecedentesCaidas',
    'ultimoEventoCaida',
    'alergiaMedicamentos',
    'ultimaValoracionTerapiaFisica',
    'ultimaValoracionNutricion',
  ],
  bloque: ['datos', 'motivo'],
  datos: {
    dependenciaBarthel: ['grado', 'fecha'],
    condicionMovilidad: ['condicion'],
    ayudasBiomecanicas: ['usa', 'cuales'],
    antecedentesCaidas: ['presenta'],
    ultimoEventoCaida: ['fechaHora'],
    alergiaMedicamentos: ['presenta', 'cuales'],
    ultimaValoracionTerapiaFisica: ['fecha', 'estado'],
    ultimaValoracionNutricion: ['fecha', 'estado'],
  },
} as const;
