import z from "zod";

export const publicacionSchema = z.object({
    fecha: z.string().nonempty("La fecha es obligatoria"),
    titulo: z.string().nonempty("El titulo es obligatorio").min(5, "El titulo debe tener al menos 5 caracteres"),
    descripcion: z.string().nonempty("La descripcion es obligatoria").min(5, "La descripcion debe tener al menos 5 caracteres"),
     imagen: z
        .instanceof(File, { message: "Debes seleccionar un archivo" })
        .refine(
          (file) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type),
          "Formato inválido (solo JPG, PNG, WEBP o GIF)"
        )
        .refine((file) => file.size <= 5 * 1024 * 1024, "El archivo debe pesar menos de 5MB"),
})

export type PublicacionSchema = z.infer<typeof publicacionSchema>
