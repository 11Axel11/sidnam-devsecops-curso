import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateFacturaDto } from './createFacturaDto';
import { SedeEnum } from 'src/common/enums/sede.enum';

// A.1.8: la regla fecha_pago >= fecha_emision solo existía en el frontend
// (TanStack Form + Zod). Estas pruebas confirman que el backend también la
// exige, sin depender solo del cliente.
describe('CreateFacturaDto — validación fecha_pago >= fecha_emision', () => {
  const base = {
    proveedor_id: 8,
    numero_factura: 20345,
    monto: 154300.5,
    sede: SedeEnum.CECUIDAM,
  };

  it('rechaza fecha_pago anterior a fecha_emision', async () => {
    const dto = plainToInstance(CreateFacturaDto, {
      ...base,
      fecha_emision: '2026-09-10',
      fecha_pago: '2026-09-05',
    });

    const errores = await validate(dto);

    expect(errores.length).toBeGreaterThan(0);
    expect(
      errores.some((e) => e.constraints && 'fechaPagoFacturaValida' in e.constraints),
    ).toBe(true);
  });

  it('acepta fecha_pago igual a fecha_emision', async () => {
    const dto = plainToInstance(CreateFacturaDto, {
      ...base,
      fecha_emision: '2026-09-10',
      fecha_pago: '2026-09-10',
    });

    const errores = await validate(dto);

    expect(errores.length).toBe(0);
  });

  it('acepta fecha_pago posterior a fecha_emision', async () => {
    const dto = plainToInstance(CreateFacturaDto, {
      ...base,
      fecha_emision: '2026-09-10',
      fecha_pago: '2026-09-25',
    });

    const errores = await validate(dto);

    expect(errores.length).toBe(0);
  });
});
