// Contrato `GET /expedientes/:id/ficha-resumen` (docs/fase3/CONTRATO_FICHA_RESUMEN.md §2). Cada bloque trae
// `datos` o, si no hay información, `datos: null` con su `motivo`. El frontend no calcula nada.
export interface Bloque<T> {
  datos: T | null;
  motivo: string | null;
}

export type EstadoUltimaValoracion = "vigente" | "reemplazada";

export interface FichaResumen {
  expedienteId: number;
  dependenciaBarthel: Bloque<{ grado: string; fecha: string }>;
  condicionMovilidad: Bloque<{ condicion: string }>;
  ayudasBiomecanicas: Bloque<{ usa: boolean; cuales: string | null }>;
  antecedentesCaidas: Bloque<{ presenta: boolean }>;
  /** Instante ISO 8601 UTC. */
  ultimoEventoCaida: Bloque<{ fechaHora: string }>;
  alergiaMedicamentos: Bloque<{ presenta: boolean; cuales: string | null }>;
  ultimaValoracionTerapiaFisica: Bloque<{ fecha: string; estado: EstadoUltimaValoracion }>;
  ultimaValoracionNutricion: Bloque<{ fecha: string; estado: EstadoUltimaValoracion }>;
}
