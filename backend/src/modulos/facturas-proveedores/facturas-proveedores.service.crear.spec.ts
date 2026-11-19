import { FacturasProveedoresService } from './facturas-proveedores.service';

// Regresión: un monto entero (sin punto decimal) se guardaba dividido entre
// 100 (154300 -> 1543.00). El monto debe guardarse exactamente como llega.
describe('FacturasProveedoresService.createFactura — monto', () => {
  const dto = (monto: number): any => ({
    proveedor_id: 8,
    numero_factura: 20345,
    fecha_emision: '2026-09-10',
    fecha_pago: '2026-09-25',
    monto,
    sede: 'cecuidam',
  });

  const build = () => {
    const facturaRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue({}),
    };
    const proveedorRepo = { findOneBy: jest.fn().mockResolvedValue({ id_proveedor: 8 }) };
    const service = new FacturasProveedoresService(facturaRepo as any, proveedorRepo as any, {} as any);
    return { service, facturaRepo };
  };

  it.each([154300, 154300.5, 245000, 99, 0.5])('guarda el monto %p tal cual, sin dividirlo', async (monto) => {
    const { service, facturaRepo } = build();
    await service.createFactura(dto(monto));
    expect(facturaRepo.create).toHaveBeenCalledWith(expect.objectContaining({ monto }));
  });
});
