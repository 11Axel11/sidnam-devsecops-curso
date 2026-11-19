import { interpretarBarthel } from 'src/common/utils/interpretarBarthel';
import { interpretarTinetti } from 'src/common/utils/interpretarTinetti';
import { construirHtmlReporteSemestral, tituloDelInforme } from './reporte-semestral.html';
import { armarReporte, FilaReporte, generarLeyenda, periodoDe, ReporteSemestral } from './reporte-semestral.logica';

/** Datos FICTICIOS. */
const fila = (p: Partial<FilaReporte> = {}): FilaReporte => ({
  expedienteId: 1,
  nombre: 'Ficticio Uno, Residente',
  edad: 80,
  inactivo: false,
  barthel: { puntaje: 95, grado: 'Dependencia Escasa', fecha: '2026-03-01' },
  tinetti: { total: 22, equilibrio: 13, marcha: 9, fecha: '2026-03-01' },
  ayuda: { usa: true, cuales: 'Bastón' },
  testMovimiento: { fecha: '2026-04-15', ejercicios: [{ ejercicio: 'Levantarse', resultado: 'Solo' }] },
  comparacion: { barthel: { puntaje: 85, grado: 'Dependencia Moderada', diferencia: 10 }, tinetti: { total: 25, diferencia: -3 } },
  diagnosticoDiferencial: 'Dx',
  tratamiento: 'Tx',
  avances: { texto: 'Avance', fechaValoracion: '2026-05-20' },
  ...p,
});
const reporte = (evaluados: FilaReporte[], sinEvaluacion: ReporteSemestral['sinEvaluacion'] = []): ReporteSemestral => ({ periodo: periodoDe(2026, 1), fechaCorte: '2026-06-30', evaluados, sinEvaluacion });

describe('HTML del reporte semestral', () => {
  it('título: profesional tal como se digita, luego el código y el periodo; sin «Dra.» fijo', () => {
    const r = reporte([]);
    expect(tituloDelInforme(r, { profesionalNombre: 'Lic. Ana Mora', profesionalCodigo: 'CFT-1' })).toBe('INFORME Lic. Ana Mora — CFT-1 — Periodo I 2026');
    expect(tituloDelInforme(r, { profesionalNombre: 'Ana Mora' })).toBe('INFORME Ana Mora — Periodo I 2026');
    expect(tituloDelInforme(r, {})).toBe('INFORME Terapia Física — Periodo I 2026');
    expect(tituloDelInforme(r, { profesionalNombre: 'Ana' })).not.toContain('Dra.');
  });

  it('columnas, Funcional con Barthel/Tinetti/ayuda/test/comparación, avances con la fecha de la valoración', () => {
    const html = construirHtmlReporteSemestral(reporte([fila()]), '2026-11-02');
    for (const c of ['Nombre', 'Funcional', 'Diagnóstico diferencial', 'Tratamiento fisioterapia', 'Avances']) expect(html).toContain(`<th>${c}</th>`);
    expect(html).toContain('<b>Barthel</b> 95 Dependencia Escasa');
    expect(html).toContain('Eq. 13 · Marcha 9');
    expect(html).toContain('Ayuda de marcha:</b> Bastón');
    expect(html).toContain('Test de movimiento (15/04):</b> Levantarse: Solo');
    expect(html).toContain('Barthel 85 Dependencia Moderada (+10)');
    expect(html).toContain('Tinetti 25 (−3)');
    expect(html).toContain('Valoración 20/05/2026');
    expect(html).toContain('Generado el 02/11/2026');
  });

  it('avances vacío ⇒ «—»; sin valoración ⇒ guiones', () => {
    const html = construirHtmlReporteSemestral(reporte([fila({ avances: { texto: null, fechaValoracion: '2026-05-20' }, tratamiento: null })]), '2026-11-02');
    expect(html).toMatch(/<td>—<\/td>\s*<td>—<div class="fecha-val">Valoración 20\/05\/2026/);
  });

  it('se escapa TODO el texto dinámico (nombre, clínica, profesional)', () => {
    const mal = '<script>alert(1)</script>';
    const html = construirHtmlReporteSemestral(
      reporte([fila({ nombre: mal, diagnosticoDiferencial: mal, tratamiento: mal, avances: { texto: mal, fechaValoracion: '2026-01-01' }, ayuda: { usa: true, cuales: mal } })], [{ expedienteId: 9, nombre: mal }]),
      '2026-11-02',
      { profesionalNombre: mal, profesionalCodigo: mal },
    );
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('el estado de grado/riesgo mostrado es el almacenado, no el recalculado', () => {
    const html = construirHtmlReporteSemestral(reporte([fila({ barthel: { puntaje: 100, grado: 'Etiqueta almacenada', fecha: '2026-03-01' } })]), '2026-11-02');
    expect(html).toContain('100 Etiqueta almacenada');
  });

  it('sección aparte de residentes sin evaluación', () => {
    const html = construirHtmlReporteSemestral(reporte([fila()], [{ expedienteId: 2, nombre: 'Ficticio Dos, Residente' }]), '2026-11-02');
    expect(html).toContain('Residentes sin evaluación en el periodo (1)');
    expect(html).toContain('Ficticio Dos, Residente');
  });

  it('las filas con texto muy largo pueden continuar en la página siguiente; las normales no se cortan', () => {
    const html = construirHtmlReporteSemestral(reporte([fila({ tratamiento: 'x'.repeat(900) }), fila({ expedienteId: 2 })]), '2026-11-02');
    expect(html.match(/<tr class="larga">/g)).toHaveLength(1);
    expect(html).toContain('table.inf tr { break-inside: avoid');
    expect(html).toContain('display: table-header-group');
  });

  it('la leyenda del PDF se genera desde interpretarBarthel/interpretarTinetti', () => {
    const l = generarLeyenda();
    // cada total 0–100 / 0–28 cae en el rango que la leyenda le asigna
    for (let n = 0; n <= 100; n++) {
      const g = l.barthel.find((x) => {
        const [d, h] = x.rango.split('–').map(Number);
        return n >= d && n <= (h ?? d);
      });
      expect(g?.grado).toBe(interpretarBarthel(n, false));
    }
    for (let n = 0; n <= 28; n++) {
      const g = l.tinetti.find((x) => {
        if (x.rango.startsWith('<')) return n < Number(x.rango.slice(2));
        const [d, h] = x.rango.split('–').map(Number);
        return n >= d && n <= (h ?? d);
      });
      expect(g?.riesgo).toBe(interpretarTinetti(n));
    }
    expect(l.barthelSilla).toContain(interpretarBarthel(90, true));
    expect(l.barthel.some((g) => g.rango === '91–99' && g.grado === 'Dependencia Escasa')).toBe(true);
    const html = construirHtmlReporteSemestral(reporte([]), '2026-11-02');
    expect(html).toContain('91–99 Dependencia Escasa');
  });

  it('sin residentes evaluados el informe se genera igual', () => {
    const html = construirHtmlReporteSemestral(armarReporte(periodoDe(2026, 1), { expedientes: [], barthel: [], tinetti: [], valoraciones: [], aplicaciones: [], ejercicios: [] }, '2026-11-02'), '2026-11-02');
    expect(html).toContain('No hay residentes con evaluaciones');
  });
});
