import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FacturasProveedoresService } from './facturas-proveedores.service';

describe('FacturasProveedoresService.actualizarEstadoFactura — fecha_pagada', () => {
  const dias = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  const build = (factura: any) => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(factura),
      save: jest.fn().mockImplementation((f) => Promise.resolve(f)),
    };
    const service = new FacturasProveedoresService(repo as any, {} as any, {} as any);
    return { service, repo };
  };
  const pendiente = () => ({ id_factura: 1, estado: 'pendiente', fecha_emitida: dias(-10), fecha_pago: dias(20), fecha_pagada: null });

  it('sin fecha: marca pagada con fecha_pagada = ahora (la fecha límite no cambia)', async () => {
    const f = pendiente();
    const limite = f.fecha_pago;
    const { service } = build(f);
    const antes = Date.now();

    const r: any = await service.actualizarEstadoFactura(1);

    expect(r.estado).toBe('pagada');
    expect(r.fecha_pagada.getTime()).toBeGreaterThanOrEqual(antes);
    expect(r.fecha_pago).toBe(limite);
  });

  it('con fecha explícita: guarda esa fecha', async () => {
    const f = pendiente();
    const { service } = build(f);
    const r: any = await service.actualizarEstadoFactura(1, dias(-3).toISOString());
    expect(r.fecha_pagada.getTime()).toBeCloseTo(dias(-3).getTime(), -4);
  });

  it('rechaza una fecha anterior a la emisión', async () => {
    const { service, repo } = build(pendiente());
    await expect(service.actualizarEstadoFactura(1, dias(-30).toISOString())).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rechaza una fecha futura', async () => {
    const { service, repo } = build(pendiente());
    await expect(service.actualizarEstadoFactura(1, dias(10).toISOString())).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('factura ya pagada: no pisa la fecha de pago original ni vuelve a guardar', async () => {
    const original = dias(-5);
    const f = { ...pendiente(), estado: 'pagada', fecha_pagada: original };
    const { service, repo } = build(f);
    const r: any = await service.actualizarEstadoFactura(1, dias(-1).toISOString());
    expect(r.fecha_pagada).toBe(original);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('404 si la factura no existe', async () => {
    const { service } = build(null);
    await expect(service.actualizarEstadoFactura(9)).rejects.toBeInstanceOf(NotFoundException);
  });
});
