import z from "zod";
import { crearFechaClinicaSchema } from "@/components/app/clinico/fechaSchema";

export const MAX_TEXTO_EJERCICIO = 255;

export type FilaTest = { modalidad: string; modificacion: string; resultado: string };
export const filaVacia = (): FilaTest => ({ modalidad: "", modificacion: "", resultado: "" });

// Espejo del contrato del test de movimiento (§2.1), no la única barrera: el backend valida igualmente.
// Una fila por cada ejercicio ACTIVO del catálogo (`ids`): modalidad y resultado obligatorios, modificación
// opcional, los tres texto libre de hasta 255 caracteres. No se inventa ninguna lista de valores.
export const crearAplicacionSchema = (ids: readonly number[]) =>
  z
    .object({
      fecha: crearFechaClinicaSchema("de la aplicación"),
      filas: z.record(
        z.string(),
        z.object({ modalidad: z.string(), modificacion: z.string(), resultado: z.string() }),
      ),
    })
    .superRefine((v, ctx) => {
      const error = (id: number, campo: keyof FilaTest, message: string) =>
        ctx.addIssue({ code: "custom", path: ["filas", id, campo], message });
      const largo = `No puede superar los ${MAX_TEXTO_EJERCICIO} caracteres`;

      for (const id of ids) {
        const f = v.filas[id] ?? filaVacia();
        if (f.modalidad.trim() === "") error(id, "modalidad", "La modalidad es obligatoria");
        else if (f.modalidad.length > MAX_TEXTO_EJERCICIO) error(id, "modalidad", largo);
        if (f.modificacion.length > MAX_TEXTO_EJERCICIO) error(id, "modificacion", largo);
        if (f.resultado.trim() === "") error(id, "resultado", "El resultado es obligatorio");
        else if (f.resultado.length > MAX_TEXTO_EJERCICIO) error(id, "resultado", largo);
      }
    });
