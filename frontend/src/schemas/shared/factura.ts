import z from "zod";

export const yyyyMmDd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (usa yyyy-MM-dd)");

const montoFormatoLatam = /^(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}$/;
const montoFormatoInternacional = /^(?:\d{1,3}(?:,\d{3})*|\d+)\.\d{2}$/;

export const parseMontoCRC = (value: string) => {
  const monto = value.trim();
  if (!monto) return null;

  if (montoFormatoLatam.test(monto)) {
    const normalized = monto.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (montoFormatoInternacional.test(monto)) {
    const normalized = monto.replace(/,/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const montoFacturaSchema = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z.string().trim().min(1, "El monto es obligatorio")
)
  .transform((value) => parseMontoCRC(value))
  .pipe(
    z
      .number({
        message:
          "Formato de monto inválido. Usa 10.900,20 o 10,900.20 con exactamente dos decimales",
      })
      .positive("Monto debe ser mayor a 0")
  );

/** Adjunta la regla "fecha de pago no puede ser anterior a la fecha de emisión" a un
 * z.object() que tenga los campos yyyy-MM-dd indicados. */
export function conFechaPagoValida<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  campoEmision: keyof T & string,
  campoPago: keyof T & string
) {
  return schema.refine(
    (v) => {
      const r = v as Record<string, string>;
      const e = new Date(`${r[campoEmision]}T00:00:00`);
      const p = new Date(`${r[campoPago]}T00:00:00`);
      return p.getTime() >= e.getTime();
    },
    {
      message: "La fecha de pago no puede ser anterior a la fecha de emisión",
      path: [campoPago],
    }
  );
}
