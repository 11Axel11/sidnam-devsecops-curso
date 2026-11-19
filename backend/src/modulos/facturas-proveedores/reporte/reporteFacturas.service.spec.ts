import { NotFoundException } from '@nestjs/common';
import { ReporteFacturaService } from './reporteFacturas.service';

describe('ReporteFacturaService — PDF de factura individual', () => {
  const base: any = {
    id_factura: 1,
    numero_factura: 'F-2026-0148',
    fecha_emitida: new Date(2026, 8, 5),
    fecha_pago: new Date(2026, 8, 20),
    fecha_pagada: null,
    monto: 245000,
    estado: 'pendiente',
    sede: 'cecuidam',
    proveedor: {
      nombre: 'Distribuidora La Nicoyana S.A.',
      numero: '2685-0000',
      correo: 'ventas@lanicoyana.cr',
      direccion: 'Nicoya centro, 100m sur del parque',
      area: { nombre: 'Cocina / Alimentación' },
    },
  };
  const svc = () => new ReporteFacturaService({ findOne: jest.fn() } as any, {} as any);
  const html = (f: any) => svc().buildHtmlFacturaIndividual(f, new Date('2026-09-09T18:00:00Z'));

  it('muestra los datos con el formato del diseño', () => {
    const h = html(base);
    expect(h).toContain('F-2026-0148');
    expect(h).toContain('05/09/2026');
    expect(h).toContain('₡ 245,000.00');
    expect(h).toContain('Cocina / Alimentación');
    expect(h).toContain('Pendiente de pago');
    expect(h).toContain('Fecha de reporte: <strong>09/09/2026</strong>');
    expect(h).toContain('Hogar de Ancianos San Blas — Nicoya, Guanacaste');
    expect(h).toContain('2685-0000');
    expect(h).toContain('ventas@lanicoyana.cr');
  });

  it('fecha límite de pago siempre visible; fecha de pago real "—" mientras esté pendiente', () => {
    const h = html(base);
    expect(h).toMatch(/Fecha límite de pago<\/div><div class="valor">20\/09\/2026</);
    expect(h).toMatch(/>Fecha de pago<\/div><div class="valor">—</);
  });

  it('pagada: muestra la fecha en que se pagó (distinta de la fecha límite) y "Pagada"', () => {
    const h = html({ ...base, estado: 'pagada', fecha_pagada: new Date(2026, 8, 15) });
    expect(h).toMatch(/Fecha límite de pago<\/div><div class="valor">20\/09\/2026</);
    expect(h).toMatch(/>Fecha de pago<\/div><div class="valor">15\/09\/2026</);
    expect(h).toContain('>Pagada<');
  });

  it('pagada sin fecha_pagada (histórico anterior a la columna): "—", no se inventa una fecha', () => {
    const h = html({ ...base, estado: 'pagada', fecha_pagada: null });
    expect(h).toMatch(/>Fecha de pago<\/div><div class="valor">—</);
  });

  it('insignia según la sede', () => {
    expect(html(base)).toMatch(/badge-cecuidam">\s*<span class="dot"><\/span>CECUIDAM/);
    const hogar = html({ ...base, sede: 'hogar' });
    expect(hogar).toMatch(/badge-hogar">\s*<span class="dot"><\/span>Hogar/);
    expect(hogar).not.toMatch(/<span class="dot"><\/span>CECUIDAM/);
  });

  it('campos faltantes del proveedor salen como "—" y el HTML se escapa', () => {
    const h = html({
      ...base,
      proveedor: { nombre: '<script>alert(1)</script>', numero: '', correo: null, direccion: undefined, area: null },
    });
    expect(h).not.toContain('<script>alert(1)</script>');
    expect(h).toContain('&lt;script&gt;');
    expect((h.match(/class="valor">—</g) || []).length).toBeGreaterThanOrEqual(4);
  });

  it('404 si la factura no existe', async () => {
    const s = new ReporteFacturaService({ findOne: jest.fn().mockResolvedValue(null) } as any, {} as any);
    await expect(s.generarPdfFacturaIndividual(9, {} as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('genera el PDF en tamaño Carta, sin márgenes, con el nombre de archivo esperado', async () => {
    const generarDesdeHtml = jest.fn();
    const s = new ReporteFacturaService({ findOne: jest.fn().mockResolvedValue(base) } as any, { generarDesdeHtml } as any);
    await s.generarPdfFacturaIndividual(1, {} as any);
    expect(generarDesdeHtml).toHaveBeenCalledWith(
      expect.stringContaining('badge-cecuidam'),
      expect.anything(),
      expect.objectContaining({ filename: 'Factura_F-2026-0148.pdf', format: 'Letter', margin: { top: '0', right: '0', bottom: '0', left: '0' } }),
    );
  });
});
