import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// RF/CA de facturación CECUIDAM: fecha_pago debe ser posterior o igual a
// fecha_emitida. Hasta esta tarea esta regla solo existía en el frontend
// (TanStack Form + Zod) — se agrega también en el backend para no depender
// solo de la validación del cliente.
export function FechaPagoFacturaValida(validationOptions?: ValidationOptions) {
  return function (constructor: Function) {
    registerDecorator({
      name: 'fechaPagoFacturaValida',
      target: constructor,
      propertyName: 'fecha_pago',
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const object = args.object as any;

          if (!object.fecha_pago || !object.fecha_emision) {
            return false;
          }

          const fechaPago = new Date(object.fecha_pago);
          const fechaEmitida = new Date(object.fecha_emision);

          if (isNaN(fechaPago.getTime()) || isNaN(fechaEmitida.getTime())) {
            return false;
          }

          return fechaPago.getTime() >= fechaEmitida.getTime();
        },

        defaultMessage() {
          return 'La fecha de pago no puede ser anterior a la fecha de emisión de la factura';
        },
      },
    });
  };
}
