import { buildStandardPdfHtml, escapePdfHtml } from 'src/common/utils/pdfReportTemplate';
import { FilaReporte, generarLeyenda, ReporteSemestral } from './reporte-semestral.logica';

/**
 * HTML del reporte semestral de Terapia Física (RF-TF-12): tabla en A4 apaisado sobre la plantilla estándar
 * (`buildStandardPdfHtml`: logo del Hogar San Blas y paleta institucional). TODO texto dinámico se escapa.
 */
const e = escapePdfHtml;
const GUION = '—';

/** 'YYYY-MM-DD' → 'dd/mm/aaaa'. */
export const fechaLarga = (iso: string): string => {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};
const fechaCorta = (iso: string): string => iso.split('-').reverse().slice(0, 2).join('/');

/** Texto libre escapado, con saltos de línea. */
const texto = (t: string | null | undefined): string => (t && t.trim() ? e(t).replace(/\r?\n/g, '<br/>') : GUION);

const signo = (n: number | null | undefined): string => (n === null || n === undefined ? '' : n > 0 ? ` (+${n})` : n < 0 ? ` (−${Math.abs(n)})` : ' (=)');

export interface OpcionesTitulo {
  profesionalNombre?: string;
  profesionalCodigo?: string;
}

/** «INFORME <profesionalNombre> — <código> — Periodo I 2026»; sin profesional, «INFORME Terapia Física — Periodo I 2026». */
export function tituloDelInforme(r: ReporteSemestral, o: OpcionesTitulo = {}): string {
  const quien = o.profesionalNombre?.trim() || 'Terapia Física';
  const codigo = o.profesionalCodigo?.trim();
  return ['INFORME ' + quien, codigo, `Periodo ${r.periodo.romano} ${r.periodo.anio}`].filter(Boolean).join(' — ');
}

function celdaFuncional(f: FilaReporte): string {
  const lineas: string[] = [];
  lineas.push(f.barthel ? `<div><b>Barthel</b> ${f.barthel.puntaje} ${e(f.barthel.grado)}</div>` : `<div><b>Barthel</b> <span class="tenue">sin evaluación en el periodo</span></div>`);
  lineas.push(
    f.tinetti
      ? `<div><b>Tinetti</b> ${f.tinetti.total} <span class="tenue">(Eq. ${f.tinetti.equilibrio} · Marcha ${f.tinetti.marcha})</span></div>`
      : `<div><b>Tinetti</b> <span class="tenue">sin evaluación en el periodo</span></div>`,
  );
  lineas.push(`<div><b>Ayuda de marcha:</b> ${f.ayuda ? (f.ayuda.usa ? e(f.ayuda.cuales ?? 'sí (sin detalle)') : 'ninguna') : GUION}</div>`);
  if (f.testMovimiento) {
    const ej = f.testMovimiento.ejercicios.map((x) => `${e(x.ejercicio)}: ${e(x.resultado)}`).join(' · ');
    lineas.push(`<div class="test"><b>Test de movimiento (${fechaCorta(f.testMovimiento.fecha)}):</b> ${ej || GUION}</div>`);
  }
  if (f.comparacion) {
    const partes: string[] = [];
    if (f.comparacion.barthel) partes.push(`Barthel ${f.comparacion.barthel.puntaje} ${e(f.comparacion.barthel.grado)}${signo(f.comparacion.barthel.diferencia)}`);
    if (f.comparacion.tinetti) partes.push(`Tinetti ${f.comparacion.tinetti.total}${signo(f.comparacion.tinetti.diferencia)}`);
    lineas.push(`<div class="ant"><b>Sem. anterior:</b> ${partes.join(' · ')}</div>`);
  }
  return lineas.join('');
}

function filaHtml(f: FilaReporte): string {
  const larga = [f.diagnosticoDiferencial, f.tratamiento, f.avances?.texto].some((t) => (t ?? '').length > 700);
  const avances = f.avances
    ? `${texto(f.avances.texto)}<div class="fecha-val">Valoración ${fechaLarga(f.avances.fechaValoracion)}</div>`
    : GUION;
  return `<tr${larga ? ' class="larga"' : ''}>
    <td class="nom"><b>${e(f.nombre)}</b>${f.edad !== null ? `<div class="tenue">${f.edad} años</div>` : ''}${f.inactivo ? '<div class="tenue">(expediente inactivo)</div>' : ''}</td>
    <td>${celdaFuncional(f)}</td>
    <td>${texto(f.diagnosticoDiferencial)}</td>
    <td>${texto(f.tratamiento)}</td>
    <td>${avances}</td>
  </tr>`;
}

export function construirHtmlReporteSemestral(r: ReporteSemestral, ahoraCR: string, opciones: OpcionesTitulo = {}): string {
  const ley = generarLeyenda();
  const filas = r.evaluados.map(filaHtml).join('\n');
  const tabla = r.evaluados.length
    ? `<table class="inf">
  <colgroup><col style="width:17%"/><col style="width:26%"/><col style="width:19%"/><col style="width:20%"/><col style="width:18%"/></colgroup>
  <thead><tr><th>Nombre</th><th>Funcional</th><th>Diagnóstico diferencial</th><th>Tratamiento fisioterapia</th><th>Avances</th></tr></thead>
  <tbody>
${filas}
  </tbody>
</table>`
    : `<p class="vacio">No hay residentes con evaluaciones registradas en este periodo.</p>`;

  const pendientes = r.sinEvaluacion.length
    ? `<div class="pend">
  <h3>Residentes sin evaluación en el periodo (${r.sinEvaluacion.length})</h3>
  <ul>${r.sinEvaluacion.map((p) => `<li>${e(p.nombre)}</li>`).join('')}</ul>
</div>`
    : `<div class="pend"><h3>Residentes sin evaluación en el periodo</h3><p class="tenue">Ninguno: todos los residentes activos tienen al menos una evaluación.</p></div>`;

  const leyenda = `<div class="leyenda">
  <b>Escalas.</b>
  <span><b>Índice de Barthel:</b> ${ley.barthel.map((g) => `${e(g.rango)} ${e(g.grado)}`).join(' · ')}. ${e(ley.barthelSilla)}.</span>
  <span><b>Escala de Tinetti:</b> ${ley.tinetti.map((g) => `${e(g.rango)} ${e(g.riesgo)}`).join(' · ')}.</span>
  <span class="tenue">${e(ley.maximos)}.</span>
</div>`;

  const extraStyles = `
    body { font-size: 9pt; padding: 0; }
    .heading { grid-template-columns: 56px 1fr; gap: 12px; margin-bottom: 8px; }
    .logo { width: 56px; height: 56px; }
    h1 { font-size: 15pt; margin-bottom: 2px; }
    .meta { font-size: 8.5pt; margin-top: 1px; }
    table.inf { table-layout: fixed; margin-top: 4px; }
    table.inf th, table.inf td { padding: 3px 5px; font-size: 8.5pt; line-height: 1.25; overflow-wrap: anywhere; word-break: break-word; }
    table.inf thead { display: table-header-group; }
    table.inf tr { break-inside: avoid; page-break-inside: avoid; }
    table.inf tr.larga { break-inside: auto; page-break-inside: auto; }
    .tenue { color: #666; font-size: 8pt; }
    .nom .tenue { display: block; }
    .test, .ant { margin-top: 3px; font-size: 8pt; }
    .ant { color: #444; }
    .fecha-val { color: #666; font-size: 7.5pt; margin-top: 3px; }
    .vacio { margin-top: 12px; }
    .leyenda { margin-top: 10px; font-size: 8pt; line-height: 1.35; border: 1px solid #d5d5d5; padding: 6px 8px; break-inside: avoid; page-break-inside: avoid; }
    .leyenda span { display: block; margin-top: 2px; }
    .pend { margin-top: 12px; break-inside: avoid; page-break-inside: avoid; }
    .pend h3 { font-size: 10pt; margin-bottom: 4px; }
    .pend ul { margin: 0; padding-left: 16px; columns: 3; column-gap: 24px; font-size: 9pt; }
    .pend li { break-inside: avoid; }
  `;

  return buildStandardPdfHtml({
    title: tituloDelInforme(r, opciones),
    metaLines: [`Hogar San Blas · Departamento de Terapia Física`, `Generado el ${fechaLarga(ahoraCR)}`].map(e),
    bodyHtml: `${tabla}\n${pendientes}\n${leyenda}`,
    extraStyles,
  });
}
