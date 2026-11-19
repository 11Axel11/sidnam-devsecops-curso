/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- base simulada y respuesta HTTP simulada */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { EstadoValoracion } from 'src/common/enums/estadoValoracion.enum';
import { PdfHtmlService } from 'src/common/services/pdf-html.service';
import { EjercicioTestMovimiento } from 'src/modulos/catalogos/entities/catalogos.entities';
import { AplicacionTestMovimientoEjercicio } from '../entities/aplicacion-test-movimiento-ejercicio.entity';
import { AplicacionTestMovimiento } from '../entities/aplicacion-test-movimiento.entity';
import { Expediente_Residente } from 'src/modulos/residentes/entities/expedientes.entity';
import { EvaluacionBarthel } from '../entities/evaluacion-barthel.entity';
import { EvaluacionTinetti } from '../entities/evaluacion-tinetti.entity';
import { ValoracionFisioterapeutica } from '../entities/valoracion-fisioterapeutica.entity';
import { crearDbSimulada } from '../valoraciones/testing/db-simulada';
import { ReporteSemestralService } from './reporte-semestral.service';
import { interpretarBarthel } from 'src/common/utils/interpretarBarthel';

/**
 * PDF REAL (Chromium de Puppeteer + `PdfHtmlService`) con 35 residentes FICTICIOS: debe ser un PDF válido en A4 apaisado
 * (841.9 × 595.3 pt) de varias páginas. Si se define `EJEMPLO_PDF_SALIDA`, además guarda el PDF de ejemplo en esa ruta.
 */
const APELLIDOS = ['Aguilar', 'Barrantes', 'Calderón', 'Delgado', 'Espinoza', 'Fonseca', 'Guzmán'];
const LARGO = 'Paciente con deterioro funcional progresivo; se trabaja fortalecimiento de miembros inferiores, equilibrio estático y dinámico, y reeducación de la marcha con apoyo. ';

jest.setTimeout(120000);

describe('Reporte semestral — PDF real en A4 apaisado', () => {
  const pdf = new PdfHtmlService();
  afterAll(async () => {
    await pdf.onApplicationShutdown();
  });

  it('35 residentes ficticios ⇒ PDF válido, A4 horizontal, varias páginas, application/pdf', async () => {
    const ids = Array.from({ length: 37 }, (_, i) => i + 1);
    const db = crearDbSimulada(ids, {}, [36]);
    for (const e of db.filas(Expediente_Residente)) {
      const n = e.id_expediente;
      Object.assign(e.residente, { nombre: `Residente ${String(n).padStart(2, '0')}`, apellido1: APELLIDOS[n % APELLIDOS.length], apellido2: 'Ficticio' });
    }
    ids.slice(0, 35).forEach((n, i) => {
      const puntaje = 20 + ((i * 7) % 81);
      db.insertar(EvaluacionBarthel, { expedienteId: n, fecha: '2026-03-10', puntajeTotal: puntaje, gradoDependencia: interpretarBarthel(puntaje, false) });
      db.insertar(EvaluacionTinetti, { expedienteId: n, fecha: '2026-03-10', puntajeTotal: 8 + (i % 20), puntajeEquilibrio: 5 + (i % 11), puntajeMarcha: 3 + (i % 9) });
      db.insertar(ValoracionFisioterapeutica, {
        expedienteId: n,
        fecha: '2026-05-15',
        estado: EstadoValoracion.VIGENTE,
        usoAyudasBiomecanicas: i % 3 !== 0,
        detalleAyudasBiomecanicas: ['Bastón', 'Andadera', 'Silla de ruedas'][i % 3],
        diagnosticoDiferencial: `Diagnóstico ficticio ${n}: artrosis de rodilla y debilidad muscular generalizada.`,
        tratamiento: `Fisioterapia ficticia ${n}: ejercicios activos asistidos, marcha en barras paralelas, 3 veces por semana. ${i % 5 === 0 ? LARGO.repeat(3) : ''}`,
        avances: i % 7 === 0 ? null : `Avance ficticio ${n}: mejora la tolerancia a la marcha. ${i % 4 === 0 ? LARGO : ''}`,
      });
    });
    // 36 inactivo sin evaluación (no aparece); 37 activo sin evaluación (sección aparte)
    const svc = new ReporteSemestralService(db.dataSource, pdf);

    const cabeceras: Record<string, string> = {};
    let cuerpo: Uint8Array | undefined;
    const res: any = {
      set: (h: Record<string, string>) => Object.assign(cabeceras, h),
      send: (b: Uint8Array) => {
        cuerpo = b;
      },
    };
    // el servicio usa la fecha real de hoy; 2026-S1 ya comenzó siempre que hoy ≥ 2026-01-01
    await svc.generarPdf({ anio: 2026, semestre: 1, profesionalNombre: 'Lic. Ana Mora Ficticia', profesionalCodigo: 'CFT-00000' }, res);

    expect(cabeceras['Content-Type']).toBe('application/pdf');
    expect(cabeceras['Content-Disposition']).toBe('attachment; filename="Informe_TerapiaFisica_2026_Semestre1.pdf"');
    expect(cuerpo).toBeDefined();
    const texto = Buffer.from(cuerpo!).toString('latin1');
    expect(texto.startsWith('%PDF')).toBe(true);
    const caja = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(texto);
    expect(caja).not.toBeNull();
    const [ancho, alto] = [Number(caja![1]), Number(caja![2])];
    expect(Math.abs(ancho - 841.9)).toBeLessThan(1.5);
    expect(Math.abs(alto - 595.3)).toBeLessThan(1.5);
    expect(ancho).toBeGreaterThan(alto); // apaisado
    const paginas = (texto.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(paginas).toBeGreaterThanOrEqual(3);
    expect(paginas).toBeLessThanOrEqual(10);

    const salida = process.env.EJEMPLO_PDF_SALIDA;
    if (salida) {
      mkdirSync(dirname(salida), { recursive: true });
      writeFileSync(salida, cuerpo!);
      console.log(`PDF de ejemplo: ${salida} (${paginas} páginas)`);
    }
  });

  it('ambos semestres + Test de Movimiento + textos largos: comparación, línea compacta y filas que continúan', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => i + 1);
    const db = crearDbSimulada(ids);
    for (const e of db.filas(Expediente_Residente)) {
      const n = e.id_expediente;
      Object.assign(e.residente, { nombre: `Residente ${String(n).padStart(2, '0')}`, apellido1: APELLIDOS[n % APELLIDOS.length], apellido2: 'Ficticio' });
    }
    db.insertar(EjercicioTestMovimiento, { id: 1, nombre: 'Levantarse', activo: true });
    db.insertar(EjercicioTestMovimiento, { id: 2, nombre: 'Caminar 3 m', activo: true });
    db.insertar(EjercicioTestMovimiento, { id: 3, nombre: 'Girar', activo: true });
    ids.forEach((n, i) => {
      // semestre anterior (II-2025) y actual (I-2026)
      db.insertar(EvaluacionBarthel, { expedienteId: n, fecha: '2025-10-10', puntajeTotal: 40 + i, gradoDependencia: interpretarBarthel(40 + i, false) });
      db.insertar(EvaluacionTinetti, { expedienteId: n, fecha: '2025-10-10', puntajeTotal: 10 + (i % 8), puntajeEquilibrio: 6, puntajeMarcha: 4 });
      db.insertar(EvaluacionBarthel, { expedienteId: n, fecha: '2026-04-10', puntajeTotal: 55 + i, gradoDependencia: interpretarBarthel(55 + i, false) });
      db.insertar(EvaluacionTinetti, { expedienteId: n, fecha: '2026-04-10', puntajeTotal: 12 + (i % 10), puntajeEquilibrio: 7, puntajeMarcha: 5 });
      const ap = db.insertar(AplicacionTestMovimiento, { expedienteId: n, fecha: '2026-05-12' });
      for (const [ej, r] of [[1, 'Con apoyo'], [2, 'Solo'], [3, 'No lo logra']] as const) db.insertar(AplicacionTestMovimientoEjercicio, { aplicacionId: ap.id, ejercicioId: ej, resultado: r });
      db.insertar(ValoracionFisioterapeutica, {
        expedienteId: n,
        fecha: '2026-05-15',
        estado: EstadoValoracion.VIGENTE,
        usoAyudasBiomecanicas: i % 2 === 0,
        detalleAyudasBiomecanicas: i % 2 === 0 ? 'Andadera' : null,
        diagnosticoDiferencial: `Diagnóstico ficticio ${n}: artrosis de rodilla.`,
        tratamiento: i === 3 ? LARGO.repeat(14) : i === 9 ? LARGO.repeat(12) : `Fisioterapia ficticia ${n}: ejercicios activos asistidos.`,
        avances: i === 3 ? LARGO.repeat(14) : `Avance ficticio ${n}: mejora la tolerancia.`,
      });
    });
    const svc = new ReporteSemestralService(db.dataSource, pdf);
    const reporte = await svc.construir(2026, 1, '2026-11-02');
    expect(reporte.evaluados[0].comparacion).not.toBeNull();
    expect(reporte.evaluados.every((f) => f.testMovimiento !== null)).toBe(true);

    let cuerpo: Uint8Array | undefined;
    const res: any = { set: () => undefined, send: (b: Uint8Array) => (cuerpo = b) };
    await svc.generarPdf({ anio: 2026, semestre: 1, profesionalNombre: 'Lic. Ana Mora Ficticia', profesionalCodigo: 'CFT-00000' }, res);
    const texto = Buffer.from(cuerpo!).toString('latin1');
    expect(texto.startsWith('%PDF')).toBe(true);
    const paginas = (texto.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(paginas).toBeGreaterThanOrEqual(3);
    const salida = process.env.EJEMPLO_PDF_SALIDA_2;
    if (salida) {
      mkdirSync(dirname(salida), { recursive: true });
      writeFileSync(salida, cuerpo!);
      console.log(`PDF con comparación: ${salida} (${paginas} páginas)`);
    }
  });
});
