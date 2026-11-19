import z from "zod";

// Espejo del contrato (§4.2), no la única barrera: el backend valida igualmente.
// `esOtro` indica que el tipo elegido es «Otro» (ver `esTipoOtro`): ahí la descripción es obligatoria.
export const crearAntecedenteTraumaticoSchema = (esOtro: boolean) =>
  z
    .object({
      tipoId: z.number({ message: "Selecciona el tipo de antecedente" }).int().min(1, "Selecciona el tipo de antecedente"),
      descripcion: z.string().max(20000, "No puede superar los 20 000 caracteres"),
      localizacionAnatomica: z.string().max(255, "No puede superar los 255 caracteres"),
      tiempoTranscurrido: z.string().max(255, "No puede superar los 255 caracteres"),
    })
    .superRefine((v, ctx) => {
      if (esOtro && v.descripcion.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["descripcion"],
          message: "La descripción es obligatoria cuando el tipo es «Otro»",
        });
      }
    });
