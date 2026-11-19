/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- base simulada y JSON sin tipar */
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { DatoFuncionalNutricion, TipoEventoImportante } from 'src/modulos/catalogos/entities/catalogos.entities';
import { ValoracionNutricional } from 'src/modulos/nutricion/entities/valoracion-nutricional.entity';
import { EvaluacionBarthel } from 'src/modulos/terapia-fisica/entities/evaluacion-barthel.entity';
import { EventoImportanteTf } from 'src/modulos/terapia-fisica/entities/evento-importante-tf.entity';
import { ValoracionFisioterapeutica } from 'src/modulos/terapia-fisica/entities/valoracion-fisioterapeutica.entity';
import { crearDbSimulada } from 'src/modulos/terapia-fisica/valoraciones/testing/db-simulada';
import { CLAVES_PERMITIDAS } from './ficha-resumen.dto';
import { FichaResumenService } from './ficha-resumen.service';

/**
 * LISTA BLANCA (RF-TR-01): la ficha NO incluye diagnóstico, tratamiento, resultados bioquímicos, MNA ni el detalle de los
 * instrumentos. Se llenan TODAS las columnas sensibles de las filas y se comprueba que (a) las claves de la respuesta, en
 * cualquier nivel, son EXACTAMENTE las permitidas y (b) ningún valor sensible se filtra.
 */
const CENTINELA = 'SENSIBLE-NO-DEBE-SALIR';

// Todo lo que NO puede aparecer (claves), por origen.
const CLAVES_PROHIBIDAS = [
  // valoración fisioterapéutica
  'diagnosticoDiferencial', 'tratamiento', 'avances', 'detalleCaidas', 'otrosDiagnosticos', 'presentaDolor', 'zonaDolorosa',
  'intensidadDolor', 'caracteristicasDolor', 'direccionIrradiacion', 'rangoMovimiento', 'fuerzaMuscularDinamometria', 'postura',
  'riesgoUlcera', 'cambiosConductuales', 'estadosAnimo', 'conscienteOrientado',
  // nutrición
  'nivelDeterioroCognitivo', 'estadoCognitivo', 'depresion', 'ansiedad', 'problemaVisual', 'problemaCavidadOral', 'datoFuncionalId',
  // MNA y bioquímicos / antropometría
  'subtotalCribaje', 'evaluacionGlobal', 'interpretacionGlobal', 'itemA', 'itemQ', 'itemR', 'imc', 'peso', 'talla',
  'circunferenciaBraquial', 'circunferenciaPantorrilla', 'glucosa', 'colesterol',
  // detalle de instrumentos
  'puntajeTotal', 'puntajeEquilibrio', 'puntajeMarcha', 'riesgoCaida', 'comer', 'lavarse', 'deambular', 'versionInstrumento', 'numeroControl',
  // auditoría, usuarios y anulación
  'creadoPorId', 'modificadoPorId', 'anuladoPorId', 'usuarioResponsableId', 'usuarioExaminadorId', 'creadoPorNombre', 'modificadoPorNombre',
  'anuladoPorNombre', 'usuarioResponsableNombre', 'usuarioExaminadorNombre', 'motivoAnulacion', 'anulado', 'fechaCreacion', 'fechaModificacion',
  // otros
  'descripcion', 'observaciones', 'id', 'usuarioId',
];

const escenarioConTodoLleno = () => {
  const db = crearDbSimulada([1]);
  db.insertar(TipoEventoImportante, { id: 1, nombre: 'Caída', activo: true });
  db.insertar(DatoFuncionalNutricion, { id: 2, nombre: 'Deambula con ayuda', activo: true });
  const audit = { creadoPorId: 5, modificadoPorId: 6, anuladoPorId: null, motivoAnulacion: CENTINELA, fechaCreacion: new Date(), fechaModificacion: new Date() };
  db.insertar(EvaluacionBarthel, {
    expedienteId: 1, fecha: '2026-10-05', gradoDependencia: 'Dependencia Severa', puntajeTotal: 45, versionInstrumento: 'Barthel-v1', observaciones: CENTINELA,
    usuarioExaminadorId: 5, comer: 10, lavarse: 0, deambular: 0, anulado: false, ...audit,
  });
  db.insertar(ValoracionNutricional, {
    expedienteId: 1, fecha: '2026-10-03', estado: EstadoValoracion.VIGENTE, datoFuncionalId: 2, alergiaMedicamentos: true, detalleAlergiaMedicamentos: 'Penicilina',
    estadoCognitivo: 'con_deterioro', nivelDeterioroCognitivo: CENTINELA, depresion: true, ansiedad: true, problemaVisual: true, problemaCavidadOral: true,
    usuarioResponsableId: 5, ...audit,
  });
  db.insertar(ValoracionFisioterapeutica, {
    expedienteId: 1, fecha: '2026-10-04', estado: EstadoValoracion.VIGENTE, antecedentesCaidas: true, detalleCaidas: CENTINELA, usoAyudasBiomecanicas: true,
    detalleAyudasBiomecanicas: 'Bastón', diagnosticoDiferencial: CENTINELA, tratamiento: CENTINELA, avances: CENTINELA, otrosDiagnosticos: CENTINELA,
    presentaDolor: true, zonaDolorosa: CENTINELA, intensidadDolor: 8, rangoMovimiento: CENTINELA, postura: CENTINELA, riesgoUlcera: CENTINELA,
    usuarioResponsableId: 5, ...audit,
  });
  db.insertar(EventoImportanteTf, { expedienteId: 1, tipoEventoId: 1, fechaHora: new Date('2026-09-10T15:00:00Z'), descripcion: CENTINELA, anulado: false, ...audit });
  return new FichaResumenService(db.dataSource);
};

/** Todas las claves de un objeto JSON, en cualquier nivel (ruta → claves). */
const clavesPorNivel = (valor: unknown, ruta = '$', salida: Record<string, string[]> = {}): Record<string, string[]> => {
  if (Array.isArray(valor)) valor.forEach((v, i) => clavesPorNivel(v, `${ruta}[${i}]`, salida));
  else if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    salida[ruta] = Object.keys(valor);
    for (const [k, v] of Object.entries(valor)) clavesPorNivel(v, `${ruta}.${k}`, salida);
  }
  return salida;
};

describe('Ficha resumen — LISTA BLANCA (RF-TR-01)', () => {
  it('las claves de la respuesta son EXACTAMENTE las permitidas, en la raíz, en cada bloque y en cada `datos`', async () => {
    const f = JSON.parse(JSON.stringify(await escenarioConTodoLleno().obtener(1)));
    const niveles = clavesPorNivel(f);
    expect(niveles.$.sort()).toEqual([...CLAVES_PERMITIDAS.raiz].sort());
    for (const bloque of Object.keys(CLAVES_PERMITIDAS.datos) as (keyof typeof CLAVES_PERMITIDAS.datos)[]) {
      expect(niveles[`$.${bloque}`].sort()).toEqual([...CLAVES_PERMITIDAS.bloque].sort());
      expect(niveles[`$.${bloque}.datos`].sort()).toEqual([...CLAVES_PERMITIDAS.datos[bloque]].sort());
    }
    // y no hay ninguna otra ruta con claves (nada anidado de más)
    const esperadas = 1 + Object.keys(CLAVES_PERMITIDAS.datos).length * 2;
    expect(Object.keys(niveles)).toHaveLength(esperadas);
  });

  it('NO hay diagnóstico, tratamiento, bioquímicos, MNA ni detalle de instrumentos: ninguna clave prohibida en ningún nivel', async () => {
    const f = JSON.parse(JSON.stringify(await escenarioConTodoLleno().obtener(1)));
    const todas = new Set(Object.values(clavesPorNivel(f)).flat());
    for (const prohibida of CLAVES_PROHIBIDAS) {
      if (prohibida === 'expedienteId') continue;
      expect(todas.has(prohibida)).toBe(false);
    }
    // `id` solo existe como `expedienteId` (el de la URL)
    expect(todas.has('id')).toBe(false);
  });

  it('ningún VALOR sensible se filtra (diagnóstico, tratamiento, avances, nivel de deterioro, observaciones, motivos…)', async () => {
    const json = JSON.stringify(await escenarioConTodoLleno().obtener(1));
    expect(json).not.toContain(CENTINELA);
    expect(json).not.toMatch(/deterioro|diagn|trat|puntaje|MNA|bioqu/i);
  });

  it('lo permitido SÍ sale (la lista blanca no es vacía): grado y fecha, movilidad, alergia con «Penicilina», ayudas, caída', async () => {
    const f = JSON.parse(JSON.stringify(await escenarioConTodoLleno().obtener(1)));
    expect(f.dependenciaBarthel.datos).toEqual({ grado: 'Dependencia Severa', fecha: '2026-10-05' });
    expect(f.condicionMovilidad.datos).toEqual({ condicion: 'Deambula con ayuda' });
    expect(f.alergiaMedicamentos.datos).toEqual({ presenta: true, cuales: 'Penicilina' });
    expect(f.ayudasBiomecanicas.datos).toEqual({ usa: true, cuales: 'Bastón' });
    expect(f.antecedentesCaidas.datos).toEqual({ presenta: true });
    expect(f.ultimoEventoCaida.datos).toEqual({ fechaHora: '2026-09-10T15:00:00.000Z' });
  });

  it('NO lleva ids ni nombres de usuario (por eso no aplica NombresDeUsuarioInterceptor de BE-9)', async () => {
    const json = JSON.stringify(await escenarioConTodoLleno().obtener(1));
    expect(json).not.toMatch(/PorId|PorNombre|usuarioResponsable|usuarioExaminador/);
  });

  it('el controller NO lleva el NombresDeUsuarioInterceptor (la respuesta no trae ids de usuario)', async () => {
    const { INTERCEPTORS_METADATA } = await import('@nestjs/common/constants');
    const { FichaResumenController } = await import('./ficha-resumen.controller');
    expect(Reflect.getMetadata(INTERCEPTORS_METADATA, FichaResumenController)).toBeUndefined();
  });
});
