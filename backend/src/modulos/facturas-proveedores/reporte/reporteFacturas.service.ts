import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response as ExpressResponse } from 'express';
import { PdfHtmlService } from 'src/common/services/pdf-html.service';
import { Factura } from '../entities/factura.entity';
import { Estado_Factura } from 'src/common/enums/estadoFactura.enum';
import { SedeEnum, SedeOpts } from 'src/common/enums/sede.enum';
import { buildStandardPdfHtml, capitalizePdfText, escapePdfHtml } from 'src/common/utils/pdfReportTemplate';

@Injectable()
export class ReporteFacturaService {
  constructor(
    @InjectRepository(Factura)

    private readonly facturaRepo: Repository<Factura>,
    private readonly pdfHtml: PdfHtmlService,

  ) {}

  // PDF de UNA factura individual (diseño: hoja Carta, encabezado con logo +
  // insignia de programa, tarjetas "Datos de la factura" y "Proveedor", barra
  // institucional al pie). Reutiliza PdfHtmlService y buildStandardPdfHtml
  // (misma paleta --accent:#A7074D y logo); solo se ajustan estilos.
  async generarPdfFacturaIndividual(id: number, res: ExpressResponse) {
    const factura = await this.facturaRepo.findOne({
      where: { id_factura: id },
      relations: { proveedor: { area: true } },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    const html = this.buildHtmlFacturaIndividual(factura, new Date());

    await this.pdfHtml.generarDesdeHtml(html, res, {
      filename: `Factura_${factura.numero_factura}.pdf`,
      waitUntil: 'networkidle0',
      ensureAssets: true,
      disposition: 'attachment',
      format: 'Letter',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  }

  buildHtmlFacturaIndividual(factura: Factura, ahora: Date): string {
    const e = escapePdfHtml;
    const guion = '—';

    const fecha = (d: Date | string | null | undefined) => {
      if (!d) return guion;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return guion;
      const dd = dt.getDate().toString().padStart(2, '0');
      const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
      return `${dd}/${mm}/${dt.getFullYear()}`;
    };

    // Fecha de reporte en hora de Costa Rica, sin depender de la zona del servidor.
    const partes = new Intl.DateTimeFormat('es-CR', {
      timeZone: 'America/Costa_Rica',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(ahora);
    const p = (t: string) => partes.find((x) => x.type === t)?.value ?? '';
    const fechaReporte = `${p('day')}/${p('month')}/${p('year')}`;

    const monto = `₡ ${Number(factura.monto).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const pagada = factura.estado === Estado_Factura.pagada;
    const proveedor = factura.proveedor;
    const esCecuidam = factura.sede === SedeEnum.CECUIDAM;

    const campo = (etiqueta: string, valor: string) =>
      `<div class="campo"><div class="etiqueta">${e(etiqueta)}</div><div class="valor">${e(valor)}</div></div>`;

    const bodyHtml = `
      <div class="badge ${esCecuidam ? 'badge-cecuidam' : 'badge-hogar'}">
        <span class="dot"></span>${esCecuidam ? 'CECUIDAM' : 'Hogar'}
      </div>
      <hr/>

      <div class="section">
        <div class="section-title">Datos de la factura</div>
        <div class="box"><div class="grid2 destacado">
          ${campo('Número de factura', String(factura.numero_factura))}
          ${campo('Área', proveedor?.area?.nombre ?? guion)}
          ${campo('Fecha emitida', fecha(factura.fecha_emitida))}
          ${campo('Fecha límite de pago', fecha(factura.fecha_pago))}
          ${campo('Monto', monto)}
          ${campo('Estado', pagada ? 'Pagada' : 'Pendiente de pago')}
          ${campo('Fecha de pago', pagada ? fecha(factura.fecha_pagada) : guion)}
        </div></div>
      </div>

      <div class="section">
        <div class="section-title">Proveedor</div>
        <div class="box"><div class="grid2">
          ${campo('Nombre', proveedor?.nombre ?? guion)}
          ${campo('Teléfono', proveedor?.numero || guion)}
          ${campo('Correo', proveedor?.correo || guion)}
          ${campo('Dirección', proveedor?.direccion || guion)}
        </div></div>
      </div>

      <div class="footer-bar"></div>
    `;

    return buildStandardPdfHtml({
      title: 'Factura',
      metaLines: [
        'Hogar de Ancianos San Blas — Nicoya, Guanacaste',
        `Fecha de reporte: <strong>${e(fechaReporte)}</strong>`,
      ],
      bodyHtml,
      extraStyles: `
        @page { size: Letter; margin: 0; }
        :root { color-scheme: light; }
        html, body { width: 816px; height: 1056px; background: #ffffff; }
        body {
          position: relative;
          padding: 40px 48px;
          font-family: Inter, 'Helvetica Neue', Arial, sans-serif;
          overflow: hidden;
        }
        .heading { grid-template-columns: 64px 1fr; gap: 18px; margin-bottom: 14px; }
        .logo { width: 64px; height: 64px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta { font-size: 11px; margin-top: 2px; }
        .meta strong { color: var(--text); margin-left: 6px; }
        hr { margin: 0 0 20px; }
        .section { margin-top: 0; margin-bottom: 22px; }
        .section-title { font-size: 13px; margin-bottom: 10px; }
        .box { border-radius: 6px; padding: 16px 20px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
        .grid2:not(.destacado) { gap: 7px 24px; }
        .etiqueta { font-size: 10px; color: var(--muted); margin-bottom: 2px; line-height: 1.3; }
        .valor { font-size: 12px; line-height: 1.35; }
        .destacado .valor { font-size: 13px; font-weight: 700; }
        .badge {
          position: absolute; top: 44px; right: 48px;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 13px; border-radius: 999px; font-size: 10px;
        }
        .badge .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .badge-cecuidam { background: #dde9dd; color: #1f6a35; }
        .badge-hogar { background: #f4dfe8; color: var(--accent); }
        .footer-bar {
          position: fixed; left: 0; right: 0; bottom: 0; height: 12px;
          background: var(--accent);
        }
      `,
    });
  }

  async generarReporteFacturas(
    anio: number,
    mes: number,
    estado: number,
    sede: SedeEnum | undefined,
    res: ExpressResponse,
  ) {
  if (!anio || !mes) {
    throw new BadRequestException('Debe especificar año y mes.');
  }
  if (mes < 1 || mes > 12) {
    throw new BadRequestException('Mes inválido (1-12).');
  }

  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const siguienteAnio = mes === 12 ? anio + 1 : anio;
  const siguienteMes = mes === 12 ? 1 : mes + 1;
  const fin = `${siguienteAnio}-${String(siguienteMes).padStart(2, '0')}-01`;

  // base query
  let qb = this.facturaRepo
    .createQueryBuilder('f')
    .innerJoin('f.proveedor', 'p')
    .where('f.fecha_emitida >= :inicio AND f.fecha_emitida < :fin', { inicio, fin });

  // filtro por estado
  if (estado === 1) {
    qb = qb.andWhere('f.estado = :estado', { estado: Estado_Factura.pagada });
  } else if (estado === 2) {
    qb = qb.andWhere('f.estado = :estado', { estado: Estado_Factura.pendiente });
  }
  // si es 0 → no aplica filtro, quedan todas

  // filtro por sede: sin sede → ambas sedes
  if (sede) {
    qb = qb.andWhere('f.sede = :sede', { sede });
  }

  const rows = (await qb
    .select('f.id_factura', 'factura_id')
    .addSelect('f.numero_factura', 'numero_factura')
    .addSelect("DATE_FORMAT(f.fecha_emitida, '%Y-%m-%d')", 'fecha_emision')
    .addSelect("DATE_FORMAT(f.fecha_pago, '%Y-%m-%d')", 'fecha_pago')
    .addSelect('f.monto', 'monto')
    .addSelect('f.estado', 'estado')
    .addSelect('f.sede', 'sede')
    .addSelect('p.nombre', 'proveedor_nombre')
    .orderBy('f.fecha_emitida', 'DESC')
    .addOrderBy('f.id_factura', 'DESC')
    .getRawMany<{
      factura_id: number;
      numero_factura: number;
      fecha_emision: string;
      fecha_pago: string;
      monto: number;
      estado: string;
      sede: SedeEnum;
      proveedor_nombre: string;
    }>())
    .filter(r => r.fecha_emision?.startsWith(`${anio}-${String(mes).padStart(2, '0')}`));

  if (!rows.length) {
    throw new NotFoundException('No hay facturas en ese período.');
  }

  // 🔹 Para el encabezado dinámico
  let titulo = 'Reporte de Facturas';
  if (estado === 1) titulo = 'Reporte de Facturas Pagadas';
  else if (estado === 2) titulo = 'Reporte de Facturas Pendientes';

  const sedeTexto = sede ? this.nombreSede(sede) : 'Ambas sedes';

  const html = this.buildHtmlTabla({
    titulo,
    anio,
    mes,
    sedeTexto,
    columnas: ['Número Factura', 'Proveedor', 'Sede', 'Fecha Emisión', 'Fecha Pago', 'Monto', 'Estado'],
    filas: rows.map(r => [
      String(r.numero_factura),
      r.proveedor_nombre,
      this.nombreSede(r.sede),
      r.fecha_emision,
      r.fecha_pago,
      `₡ ${r.monto.toLocaleString()}`,
      r.estado,
    ]),
    totalRegistros: rows.length,
  });

  const mesTexto = new Date(anio, mes - 1).toLocaleString('es-CR', { month: 'long' });
  const sufijoSede = sede ? `_${this.nombreSede(sede)}` : '';
  const filename = `Reporte_Facturas${sufijoSede}_${this.capitalize(mesTexto)}_${anio}.pdf`;

  await this.pdfHtml.generarDesdeHtml(html, res, {
    filename,
    waitUntil: 'networkidle0',
    ensureAssets: true,
    disposition: 'attachment',
  });
}


  // helpers
  private capitalize(s: string) {
    return capitalizePdfText(s);
  }
  private nombreSede(sede: SedeEnum) {
    return SedeOpts.find(o => o.value === sede)?.nombre ?? sede;
  }
  private buildHtmlTabla(params: {
    titulo: string; anio: number; mes: number; sedeTexto: string;
    columnas: string[]; filas: string[][]; totalRegistros: number;
  }) {
    const { titulo, anio, mes, sedeTexto, columnas, filas, totalRegistros } = params;
    const mesNombre = new Date(anio, mes - 1).toLocaleString('es-CR', { month: 'long', year: 'numeric' });

    const head = columnas.map(c => `<th>${escapePdfHtml(c)}</th>`).join('');
    const body = filas.map(r => `<tr>${r.map(v => `<td>${escapePdfHtml(v)}</td>`).join('')}</tr>`).join('');

    return buildStandardPdfHtml({
      title: titulo,
      metaLines: [
        `Mes: <strong>${escapePdfHtml(this.capitalize(mesNombre))}</strong>`,
        `Sede: <strong>${escapePdfHtml(sedeTexto)}</strong>`,
        `Total registros: <strong>${totalRegistros}</strong>`,
      ],
      bodyHtml: `
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      `,
    });
  }
}
