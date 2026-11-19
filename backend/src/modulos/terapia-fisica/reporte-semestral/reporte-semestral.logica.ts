import { interpretarBarthel } from 'src/common/utils/interpretarBarthel';
import { interpretarTinetti } from 'src/common/utils/interpretarTinetti';
import { calcularEdad, aFechaISO } from 'src/common/valoraciones/edad.helper';

/**
 * Lógica PURA (sin base de datos) del reporte semestral de Terapia Física (RF-TF-12): periodo, selección de evaluaciones,
 * comparación con el semestre anterior, edad, orden y leyenda. Todo lo clínico se toma de lo ALMACENADO en cada evaluación
 * (grado y riesgo nunca se recalculan); la leyenda se GENERA desde `interpretarBarthel` / `interpretarTinetti`.
 */

// ───────────────────────── periodo ─────────────────────────

export interface Periodo {
  anio: number;
  semestre: 1 | 2;
  /** 'I' (enero–junio) o 'II' (julio–diciembre). */
  romano: 'I' | 'II';
  inicio: string;
  fin: string;
  anteriorInicio: string;
  anteriorFin: string;
}

export function periodoDe(anio: number, semestre: 1 | 2): Periodo {
  const periodo = (a: number, s: 1 | 2) => (s === 1 ? { inicio: `${a}-01-01`, fin: `${a}-06-30` } : { inicio: `${a}-07-01`, fin: `${a}-12-31` });
  const actual = periodo(anio, semestre);
  const anterior = semestre === 1 ? periodo(anio - 1, 2) : periodo(anio, 1);
  return { anio, semestre, romano: semestre === 1 ? 'I' : 'II', ...actual, anteriorInicio: anterior.inicio, anteriorFin: anterior.fin };
}

// ───────────────────────── filas leídas ─────────────────────────

export interface FilaExpediente {
  id: number;
  inactivo: boolean;
  nombre: string;
  apellido1: string;
  apellido2?: string | null;
  fechaNacimiento?: Date | null;
}
export interface FilaBarthel {
  id: number;
  expedienteId: number;
  fecha: string;
  puntajeTotal: number;
  gradoDependencia: string;
}
export interface FilaTinetti {
  id: number;
  expedienteId: number;
  fecha: string;
  puntajeTotal: number;
  puntajeEquilibrio: number;
  puntajeMarcha: number;
}
export interface FilaValoracionTf {
  id: number;
  expedienteId: number;
  fecha: string;
  diagnosticoDiferencial?: string | null;
  tratamiento?: string | null;
  avances?: string | null;
  usoAyudasBiomecanicas: boolean;
  detalleAyudasBiomecanicas?: string | null;
}
export interface FilaAplicacionTest {
  id: number;
  expedienteId: number;
  fecha: string;
}
export interface FilaEjercicioTest {
  aplicacionId: number;
  ejercicioId: number;
  ejercicio: string;
  resultado: string;
}

export interface DatosDelReporte {
  expedientes: FilaExpediente[];
  /** Barthel/Tinetti NO anulados de [inicio del semestre anterior, fin del periodo]. */
  barthel: FilaBarthel[];
  tinetti: FilaTinetti[];
  /** Valoraciones TF confirmadas (vigente o reemplazada), no anuladas, con fecha ≤ fin del periodo. */
  valoraciones: FilaValoracionTf[];
  /** Aplicaciones del Test de Movimiento no anuladas del periodo y los ejercicios de las más recientes. */
  aplicaciones: FilaAplicacionTest[];
  ejercicios: FilaEjercicioTest[];
}

// ───────────────────────── resultado ─────────────────────────

export interface EvaluacionBarthelReporte {
  puntaje: number;
  grado: string;
  fecha: string;
}
export interface EvaluacionTinettiReporte {
  total: number;
  equilibrio: number;
  marcha: number;
  fecha: string;
}
export interface ComparacionReporte {
  barthel: { puntaje: number; grado: string; diferencia: number | null } | null;
  tinetti: { total: number; diferencia: number | null } | null;
}
export interface FilaReporte {
  expedienteId: number;
  nombre: string;
  edad: number | null;
  inactivo: boolean;
  barthel: EvaluacionBarthelReporte | null;
  tinetti: EvaluacionTinettiReporte | null;
  /** null = sin valoración TF vigente al cierre; si existe, `usa` y `cuales`. */
  ayuda: { usa: boolean; cuales: string | null } | null;
  testMovimiento: { fecha: string; ejercicios: { ejercicio: string; resultado: string }[] } | null;
  comparacion: ComparacionReporte | null;
  diagnosticoDiferencial: string | null;
  tratamiento: string | null;
  avances: { texto: string | null; fechaValoracion: string } | null;
}
export interface ReporteSemestral {
  periodo: Periodo;
  /** Fecha de corte de la edad: el último día del periodo o, si está en curso, hoy. */
  fechaCorte: string;
  evaluados: FilaReporte[];
  sinEvaluacion: { expedienteId: number; nombre: string }[];
}

// ───────────────────────── utilidades ─────────────────────────

const sinTildes = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Orden por apellido1, apellido2 y nombre, sin distinguir tildes ni mayúsculas. */
export function compararPorApellidoYNombre(a: Pick<FilaExpediente, 'apellido1' | 'apellido2' | 'nombre'>, b: Pick<FilaExpediente, 'apellido1' | 'apellido2' | 'nombre'>): number {
  const clave = (x: typeof a) => [sinTildes(x.apellido1 ?? ''), sinTildes(x.apellido2 ?? ''), sinTildes(x.nombre ?? '')];
  const ka = clave(a);
  const kb = clave(b);
  for (let i = 0; i < ka.length; i++) {
    const c = ka[i].localeCompare(kb[i], 'es');
    if (c !== 0) return c;
  }
  return 0;
}

/** «Apellido1 Apellido2, Nombre». */
export function nombreParaLista(e: Pick<FilaExpediente, 'apellido1' | 'apellido2' | 'nombre'>): string {
  const apellidos = [e.apellido1, e.apellido2].map((x) => (x ?? '').trim()).filter(Boolean).join(' ');
  const nombre = (e.nombre ?? '').trim();
  return [apellidos, nombre].filter(Boolean).join(', ');
}

/** Más reciente: `fecha` DESC y, en empate, `id` DESC (la registrada después). */
function masReciente<T extends { fecha: string; id: number }>(filas: T[]): T | null {
  let mejor: T | null = null;
  for (const f of filas) {
    if (!mejor || f.fecha > mejor.fecha || (f.fecha === mejor.fecha && f.id > mejor.id)) mejor = f;
  }
  return mejor;
}

const porExpediente = <T extends { expedienteId: number }>(filas: T[]): Map<number, T[]> => {
  const m = new Map<number, T[]>();
  for (const f of filas) (m.get(f.expedienteId) ?? m.set(f.expedienteId, []).get(f.expedienteId)!).push(f);
  return m;
};

const enRango = (fecha: string, inicio: string, fin: string): boolean => fecha >= inicio && fecha <= fin;

/** Límite de los textos clínicos libres; más allá se avisa (nunca se recorta en silencio). */
export const LIMITE_TEXTO = 1500;
export const AVISO_TEXTO_RECORTADO = '… (texto completo en la valoración)';
export function limitarTexto(texto: string | null | undefined): { texto: string | null; recortado: boolean } {
  const t = (texto ?? '').trim();
  if (t === '') return { texto: null, recortado: false };
  if (t.length <= LIMITE_TEXTO) return { texto: t, recortado: false };
  // Se corta en el último espacio (sin partir palabras) salvo que no haya uno cerca del límite.
  const corte = t.slice(0, LIMITE_TEXTO);
  const ultimoEspacio = corte.lastIndexOf(' ');
  const base = ultimoEspacio > LIMITE_TEXTO - 100 ? corte.slice(0, ultimoEspacio) : corte;
  return { texto: base.trimEnd() + ' ' + AVISO_TEXTO_RECORTADO, recortado: true };
}

// ───────────────────────── armado ─────────────────────────

export function armarReporte(periodo: Periodo, datos: DatosDelReporte, hoy: string): ReporteSemestral {
  const fechaCorte = hoy < periodo.fin ? hoy : periodo.fin;
  const barthelPorExp = porExpediente(datos.barthel);
  const tinettiPorExp = porExpediente(datos.tinetti);
  const valoracionesPorExp = porExpediente(datos.valoraciones);
  const aplicacionesPorExp = porExpediente(datos.aplicaciones);
  const ejerciciosPorAplicacion = new Map<number, FilaEjercicioTest[]>();
  for (const e of datos.ejercicios) (ejerciciosPorAplicacion.get(e.aplicacionId) ?? ejerciciosPorAplicacion.set(e.aplicacionId, []).get(e.aplicacionId)!).push(e);

  const evaluados: (FilaReporte & { _orden: FilaExpediente })[] = [];
  const sinEvaluacion: { expedienteId: number; nombre: string; _orden: FilaExpediente }[] = [];

  for (const exp of datos.expedientes) {
    const delPeriodoB = masReciente((barthelPorExp.get(exp.id) ?? []).filter((x) => enRango(x.fecha, periodo.inicio, periodo.fin)));
    const delPeriodoT = masReciente((tinettiPorExp.get(exp.id) ?? []).filter((x) => enRango(x.fecha, periodo.inicio, periodo.fin)));

    if (!delPeriodoB && !delPeriodoT) {
      // Pendientes: solo expedientes activos (un residente dado de baja no es un pendiente).
      if (!exp.inactivo) sinEvaluacion.push({ expedienteId: exp.id, nombre: nombreParaLista(exp), _orden: exp });
      continue;
    }

    const antB = masReciente((barthelPorExp.get(exp.id) ?? []).filter((x) => enRango(x.fecha, periodo.anteriorInicio, periodo.anteriorFin)));
    const antT = masReciente((tinettiPorExp.get(exp.id) ?? []).filter((x) => enRango(x.fecha, periodo.anteriorInicio, periodo.anteriorFin)));
    const comparacion: ComparacionReporte | null =
      antB || antT
        ? {
            barthel: antB ? { puntaje: antB.puntajeTotal, grado: antB.gradoDependencia, diferencia: delPeriodoB ? delPeriodoB.puntajeTotal - antB.puntajeTotal : null } : null,
            tinetti: antT ? { total: antT.puntajeTotal, diferencia: delPeriodoT ? delPeriodoT.puntajeTotal - antT.puntajeTotal : null } : null,
          }
        : null;

    const valoracion = masReciente((valoracionesPorExp.get(exp.id) ?? []).filter((v) => v.fecha <= periodo.fin));
    const aplicacion = masReciente((aplicacionesPorExp.get(exp.id) ?? []).filter((a) => enRango(a.fecha, periodo.inicio, periodo.fin)));
    const nacimiento = exp.fechaNacimiento ? aFechaISO(new Date(exp.fechaNacimiento)) : null;

    const dx = limitarTexto(valoracion?.diagnosticoDiferencial);
    const tx = limitarTexto(valoracion?.tratamiento);
    const av = limitarTexto(valoracion?.avances);

    evaluados.push({
      _orden: exp,
      expedienteId: exp.id,
      nombre: nombreParaLista(exp),
      edad: nacimiento && nacimiento <= fechaCorte ? calcularEdad(nacimiento, fechaCorte) : null,
      inactivo: exp.inactivo,
      barthel: delPeriodoB ? { puntaje: delPeriodoB.puntajeTotal, grado: delPeriodoB.gradoDependencia, fecha: delPeriodoB.fecha } : null,
      tinetti: delPeriodoT ? { total: delPeriodoT.puntajeTotal, equilibrio: delPeriodoT.puntajeEquilibrio, marcha: delPeriodoT.puntajeMarcha, fecha: delPeriodoT.fecha } : null,
      ayuda: valoracion
        ? { usa: valoracion.usoAyudasBiomecanicas === true, cuales: valoracion.usoAyudasBiomecanicas && (valoracion.detalleAyudasBiomecanicas ?? '').trim() ? (valoracion.detalleAyudasBiomecanicas as string).trim() : null }
        : null,
      testMovimiento: aplicacion
        ? {
            fecha: aplicacion.fecha,
            ejercicios: [...(ejerciciosPorAplicacion.get(aplicacion.id) ?? [])]
              .sort((a, b) => a.ejercicioId - b.ejercicioId)
              .map((e) => ({ ejercicio: e.ejercicio, resultado: e.resultado })),
          }
        : null,
      comparacion,
      diagnosticoDiferencial: dx.texto,
      tratamiento: tx.texto,
      avances: valoracion ? { texto: av.texto, fechaValoracion: valoracion.fecha } : null,
    });
  }

  const quitarOrden = <T extends { _orden: FilaExpediente }>(x: T): Omit<T, '_orden'> => {
    const copia = { ...x } as Partial<T>;
    delete copia._orden;
    return copia as Omit<T, '_orden'>;
  };
  const ordenar = <T extends { _orden: FilaExpediente }>(xs: T[]) => xs.sort((a, b) => compararPorApellidoYNombre(a._orden, b._orden));
  return {
    periodo,
    fechaCorte,
    evaluados: ordenar(evaluados).map((x) => quitarOrden(x)),
    sinEvaluacion: ordenar(sinEvaluacion).map((x) => quitarOrden(x)),
  };
}

// ───────────────────────── leyenda generada ─────────────────────────

export interface Leyenda {
  barthel: { rango: string; grado: string }[];
  barthelSilla: string;
  tinetti: { rango: string; riesgo: string }[];
  maximos: string;
}

/** Agrupa valores consecutivos con la misma etiqueta: [(0,'A'),(1,'A'),(2,'B')] ⇒ [{desde:0,hasta:1,'A'},{2,2,'B'}]. */
function agrupar(desde: number, hasta: number, etiqueta: (n: number) => string) {
  const grupos: { desde: number; hasta: number; etiqueta: string }[] = [];
  for (let n = desde; n <= hasta; n++) {
    const e = etiqueta(n);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.etiqueta === e) ultimo.hasta = n;
    else grupos.push({ desde: n, hasta: n, etiqueta: e });
  }
  return grupos;
}
const rango = (g: { desde: number; hasta: number }): string => (g.desde === g.hasta ? `${g.desde}` : `${g.desde}–${g.hasta}`);

/** La leyenda sale de las MISMAS funciones de la tabla confirmada: si esa tabla cambia, el PDF cambia solo. */
export function generarLeyenda(): Leyenda {
  return {
    barthel: agrupar(0, 100, (n) => interpretarBarthel(n, false)).map((g) => ({ rango: rango(g), grado: g.etiqueta })),
    barthelSilla: `90 con silla de ruedas = ${interpretarBarthel(90, true)}`,
    tinetti: agrupar(0, 28, (n) => interpretarTinetti(n)).map((g) => ({ rango: g.desde === 0 ? `< ${g.hasta + 1}` : rango(g), riesgo: g.etiqueta })),
    maximos: 'Barthel máx. 100 · Tinetti: equilibrio máx. 16 + marcha máx. 12 = total máx. 28',
  };
}
