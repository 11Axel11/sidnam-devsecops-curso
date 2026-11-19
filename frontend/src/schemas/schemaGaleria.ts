import { z } from "zod";

export const uploadSchema = z.object({
  categoriaId: z.number().min(1, "Debes seleccionar una categoría"),
  imagen: z
    .instanceof(File, { message: "Debes seleccionar un archivo" })
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type),
      "Formato inválido (solo JPG, PNG, WEBP o GIF)"
    )
    .refine((file) => file.size <= 5 * 1024 * 1024, "El archivo debe pesar menos de 5MB"),
});

export type UploadFormValues = z.infer<typeof uploadSchema>;

export const categoriaSchema = z.object({
  nombre: z.string().nonempty("El nombre es obligatorio"),
  descripcion: z.string().nonempty("La descripción es obligatoria"),
});

export type CategoriaFormValues = z.infer<typeof categoriaSchema>;