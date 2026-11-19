import type { ValoracionBase } from "@/components/app/clinico/tipos";

export const CARACTERISTICAS_DOLOR = ["punzante", "opresivo", "quemante", "irradiado"] as const;
export type CaracteristicaDolor = (typeof CARACTERISTICAS_DOLOR)[number];

// Cabecera tal como la devuelve el backend (contrato §5).
export interface Valoracion extends ValoracionBase {
  otrosDiagnosticos: string | null;
  antecedentesCaidas: boolean;
  detalleCaidas: string | null;
  usoAyudasBiomecanicas: boolean;
  detalleAyudasBiomecanicas: string | null;
  presentaDolor: boolean;
  zonaDolorosa: string | null;
  caracteristicasDolor: CaracteristicaDolor[] | null;
  direccionIrradiacion: string | null;
  intensidadDolor: number | null;
  orientacionPersona: boolean;
  orientacionEspacio: boolean;
  orientacionTiempo: boolean;
  conscienteOrientado: boolean;
  cambiosConductuales: string | null;
  estadosAnimo: string | null;
  rangoMovimiento: string | null;
  fuerzaMuscularDinamometria: string | null;
  postura: string | null;
  riesgoUlcera: string | null;
  diagnosticoDiferencial: string | null;
  tratamiento: string | null;
  /** Observaciones sobre los avances del residente (opcional; van al reporte semestral). */
  avances: string | null;
}

export interface AntecedentePersonalValoracion {
  id: number;
  antecedenteId: number;
  nombre: string;
  activo: boolean;
  presente: boolean;
  observacion: string | null;
}

// Tipado mínimo: los antecedentes traumáticos se construyen en FE-1b.
export interface AntecedenteTraumaticoValoracion {
  id: number;
  valoracionId: number;
  tipoId: number;
  tipo: { id: number; nombre: string; activo: boolean };
  descripcion: string | null;
  localizacionAnatomica: string | null;
  tiempoTranscurrido: string | null;
}

export interface ValoracionDetalle extends Valoracion {
  antecedentesPersonales: AntecedentePersonalValoracion[];
  antecedentesTraumaticos: AntecedenteTraumaticoValoracion[];
}

// Cuerpo de POST/PATCH de la cabecera: todo opcional, `null` solo para vaciar textos/enteros.
export type ValoracionPayload = Partial<{
  fecha: string;
  otrosDiagnosticos: string | null;
  antecedentesCaidas: boolean;
  detalleCaidas: string | null;
  usoAyudasBiomecanicas: boolean;
  detalleAyudasBiomecanicas: string | null;
  presentaDolor: boolean;
  zonaDolorosa: string | null;
  caracteristicasDolor: CaracteristicaDolor[] | null;
  direccionIrradiacion: string | null;
  intensidadDolor: number | null;
  orientacionPersona: boolean;
  orientacionEspacio: boolean;
  orientacionTiempo: boolean;
  conscienteOrientado: boolean;
  cambiosConductuales: string | null;
  estadosAnimo: string | null;
  rangoMovimiento: string | null;
  fuerzaMuscularDinamometria: string | null;
  postura: string | null;
  riesgoUlcera: string | null;
  diagnosticoDiferencial: string | null;
  tratamiento: string | null;
  avances: string | null;
}>;

export interface AntecedentePersonalInput {
  antecedenteId: number;
  presente: boolean;
  observacion: string | null;
}

// 400 al confirmar (contrato §3).
export interface ErrorConfirmar {
  message: string;
  faltantes?: string[];
  antecedentesPersonalesPendientes?: { id: number; nombre: string }[];
}

// Cuerpo de POST/PATCH de un antecedente traumático (contrato §4.2). `tipoId` nunca va en null.
export type AntecedenteTraumaticoPayload = Partial<{
  tipoId: number;
  descripcion: string | null;
  localizacionAnatomica: string | null;
  tiempoTranscurrido: string | null;
}>;
