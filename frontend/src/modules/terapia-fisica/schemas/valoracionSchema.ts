import z from "zod";
import { CARACTERISTICAS_DOLOR } from "../models/valoracion";
import { fechaClinicaSchema } from "@/components/app/clinico/fechaSchema";

// Esquema de BORRADOR: formato y coherencia. Lo obligatorio para cerrar lo dicta el backend
// con `faltantes`; aquí no se replica. Es un espejo del contrato, no la única barrera.
const textoLargo = z.string().max(20000, "No puede superar los 20 000 caracteres");
const textoCorto = z.string().max(255, "No puede superar los 255 caracteres");

export const valoracionBorradorSchema = z
  .object({
    fecha: fechaClinicaSchema,
    otrosDiagnosticos: textoLargo,
    antecedentesCaidas: z.boolean(),
    detalleCaidas: textoLargo,
    usoAyudasBiomecanicas: z.boolean(),
    detalleAyudasBiomecanicas: textoLargo,
    presentaDolor: z.boolean(),
    zonaDolorosa: textoCorto,
    caracteristicasDolor: z
      .array(z.enum(CARACTERISTICAS_DOLOR))
      .refine((a) => new Set(a).size === a.length, "No se admiten características repetidas"),
    direccionIrradiacion: textoCorto,
    intensidadDolor: z
      .number()
      .int("La intensidad debe ser un número entero")
      .min(1, "La intensidad va de 1 a 10")
      .max(10, "La intensidad va de 1 a 10")
      .nullable(),
    orientacionPersona: z.boolean(),
    orientacionEspacio: z.boolean(),
    orientacionTiempo: z.boolean(),
    conscienteOrientado: z.boolean(),
    cambiosConductuales: textoLargo,
    estadosAnimo: textoLargo,
    rangoMovimiento: textoLargo,
    fuerzaMuscularDinamometria: textoLargo,
    postura: textoLargo,
    riesgoUlcera: textoLargo,
    diagnosticoDiferencial: textoLargo,
    tratamiento: textoLargo,
    avances: textoLargo,
  })
  .superRefine((v, ctx) => {
    const sinTexto = (s: string) => s.trim() === "";
    if (!v.presentaDolor) {
      if (!sinTexto(v.zonaDolorosa)) ctx.addIssue({ code: "custom", path: ["zonaDolorosa"], message: "Solo aplica si hay zona dolorosa" });
      if (v.intensidadDolor !== null) ctx.addIssue({ code: "custom", path: ["intensidadDolor"], message: "Solo aplica si hay zona dolorosa" });
      if (v.caracteristicasDolor.length) ctx.addIssue({ code: "custom", path: ["caracteristicasDolor"], message: "Solo aplica si hay zona dolorosa" });
    }
    if (!v.caracteristicasDolor.includes("irradiado") && !sinTexto(v.direccionIrradiacion)) {
      ctx.addIssue({ code: "custom", path: ["direccionIrradiacion"], message: 'Solo aplica si la característica incluye "irradiado"' });
    }
    if (!v.antecedentesCaidas && !sinTexto(v.detalleCaidas)) {
      ctx.addIssue({ code: "custom", path: ["detalleCaidas"], message: "Solo aplica si hay antecedentes de caídas" });
    }
    if (!v.usoAyudasBiomecanicas && !sinTexto(v.detalleAyudasBiomecanicas)) {
      ctx.addIssue({ code: "custom", path: ["detalleAyudasBiomecanicas"], message: "Solo aplica si usa ayudas biomecánicas" });
    }
  });

export const antecedentesPersonalesSchema = z.array(
  z.object({
    antecedenteId: z.number().int().min(1),
    presente: z.boolean(),
    observacion: z.string().max(20000, "La observación no puede superar los 20 000 caracteres"),
  }),
);
