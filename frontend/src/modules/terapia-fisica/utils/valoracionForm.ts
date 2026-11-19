import type { CaracteristicaDolor, Valoracion, ValoracionPayload } from "../models/valoracion";
import { hoyCostaRica } from "@/components/app/clinico/fechaClinica";

// Estado del formulario: textos como string ("" = vacío) y booleanos siempre true/false (nunca null).
export interface ValoresValoracion {
  fecha: string;
  otrosDiagnosticos: string;
  antecedentesCaidas: boolean;
  detalleCaidas: string;
  usoAyudasBiomecanicas: boolean;
  detalleAyudasBiomecanicas: string;
  presentaDolor: boolean;
  zonaDolorosa: string;
  caracteristicasDolor: CaracteristicaDolor[];
  direccionIrradiacion: string;
  intensidadDolor: number | null;
  orientacionPersona: boolean;
  orientacionEspacio: boolean;
  orientacionTiempo: boolean;
  conscienteOrientado: boolean;
  cambiosConductuales: string;
  estadosAnimo: string;
  rangoMovimiento: string;
  fuerzaMuscularDinamometria: string;
  postura: string;
  riesgoUlcera: string;
  diagnosticoDiferencial: string;
  tratamiento: string;
  avances: string;
}

// Mismos valores por defecto que aplica el backend al crear (contrato §1).
export const valoresIniciales = (): ValoresValoracion => ({
  fecha: hoyCostaRica(),
  otrosDiagnosticos: "",
  antecedentesCaidas: false,
  detalleCaidas: "",
  usoAyudasBiomecanicas: false,
  detalleAyudasBiomecanicas: "",
  presentaDolor: false,
  zonaDolorosa: "",
  caracteristicasDolor: [],
  direccionIrradiacion: "",
  intensidadDolor: null,
  orientacionPersona: true,
  orientacionEspacio: true,
  orientacionTiempo: true,
  conscienteOrientado: true,
  cambiosConductuales: "",
  estadosAnimo: "",
  rangoMovimiento: "",
  fuerzaMuscularDinamometria: "",
  postura: "",
  riesgoUlcera: "",
  diagnosticoDiferencial: "",
  tratamiento: "",
  avances: "",
});

export const valoresDesde = (v: Valoracion): ValoresValoracion => ({
  fecha: v.fecha,
  otrosDiagnosticos: v.otrosDiagnosticos ?? "",
  antecedentesCaidas: v.antecedentesCaidas,
  detalleCaidas: v.detalleCaidas ?? "",
  usoAyudasBiomecanicas: v.usoAyudasBiomecanicas,
  detalleAyudasBiomecanicas: v.detalleAyudasBiomecanicas ?? "",
  presentaDolor: v.presentaDolor,
  zonaDolorosa: v.zonaDolorosa ?? "",
  caracteristicasDolor: v.caracteristicasDolor ?? [],
  direccionIrradiacion: v.direccionIrradiacion ?? "",
  intensidadDolor: v.intensidadDolor,
  orientacionPersona: v.orientacionPersona,
  orientacionEspacio: v.orientacionEspacio,
  orientacionTiempo: v.orientacionTiempo,
  conscienteOrientado: v.conscienteOrientado,
  cambiosConductuales: v.cambiosConductuales ?? "",
  estadosAnimo: v.estadosAnimo ?? "",
  rangoMovimiento: v.rangoMovimiento ?? "",
  fuerzaMuscularDinamometria: v.fuerzaMuscularDinamometria ?? "",
  postura: v.postura ?? "",
  riesgoUlcera: v.riesgoUlcera ?? "",
  diagnosticoDiferencial: v.diagnosticoDiferencial ?? "",
  tratamiento: v.tratamiento ?? "",
  avances: v.avances ?? "",
});

// Aplica un cambio y limpia los campos dependientes en el mismo paso: el backend rechaza
// combinaciones contradictorias y no los limpia solo (contrato §2.1).
export function aplicarCambio(actual: ValoresValoracion, parche: Partial<ValoresValoracion>): ValoresValoracion {
  const v = { ...actual, ...parche };
  if (!v.presentaDolor) {
    v.zonaDolorosa = "";
    v.intensidadDolor = null;
    v.caracteristicasDolor = [];
  }
  if (!v.caracteristicasDolor.includes("irradiado")) v.direccionIrradiacion = "";
  if (!v.antecedentesCaidas) v.detalleCaidas = "";
  if (!v.usoAyudasBiomecanicas) v.detalleAyudasBiomecanicas = "";
  return v;
}

const texto = (s: string) => s.trim() || null;
const mismas = (a: string[], b: string[]) => [...a].sort().join("|") === [...b].sort().join("|");

const CAMPOS_TEXTO = [
  "otrosDiagnosticos", "detalleCaidas", "detalleAyudasBiomecanicas", "zonaDolorosa", "direccionIrradiacion",
  "cambiosConductuales", "estadosAnimo", "rangoMovimiento", "fuerzaMuscularDinamometria", "postura",
  "riesgoUlcera", "diagnosticoDiferencial", "tratamiento", "avances",
] as const;

const CAMPOS_BOOLEANOS = [
  "antecedentesCaidas", "usoAyudasBiomecanicas", "presentaDolor",
  "orientacionPersona", "orientacionEspacio", "orientacionTiempo", "conscienteOrientado",
] as const;

// POST: solo lo que tiene valor; los booleanos siempre van como true/false.
export function construirPayloadCrear(v: ValoresValoracion): ValoracionPayload {
  const body: ValoracionPayload = { fecha: v.fecha };
  for (const c of CAMPOS_BOOLEANOS) body[c] = v[c];
  for (const c of CAMPOS_TEXTO) {
    const t = texto(v[c]);
    if (t !== null) body[c] = t;
  }
  if (v.caracteristicasDolor.length) body.caracteristicasDolor = v.caracteristicasDolor;
  if (v.intensidadDolor !== null) body.intensidadDolor = v.intensidadDolor;
  return body;
}

// PATCH: solo lo que cambió respecto a lo guardado. Un PATCH vacío igual sella modificadoPorId,
// por eso el llamador no debe enviarlo si el resultado no tiene claves.
export function construirPayloadActualizar(v: ValoresValoracion, base: Valoracion): ValoracionPayload {
  const body: ValoracionPayload = {};
  if (v.fecha !== base.fecha) body.fecha = v.fecha;
  for (const c of CAMPOS_BOOLEANOS) if (v[c] !== base[c]) body[c] = v[c];
  for (const c of CAMPOS_TEXTO) {
    const nuevo = texto(v[c]);
    if (nuevo !== texto(base[c] ?? "")) body[c] = nuevo;
  }
  if (!mismas(v.caracteristicasDolor, base.caracteristicasDolor ?? [])) {
    body.caracteristicasDolor = v.caracteristicasDolor.length ? v.caracteristicasDolor : null;
  }
  if (v.intensidadDolor !== base.intensidadDolor) body.intensidadDolor = v.intensidadDolor;
  return body;
}
