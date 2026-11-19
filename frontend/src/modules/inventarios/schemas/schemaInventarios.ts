import z from "zod";

export const agregarProductoSchema = z.object({
    nombre: z.string().nonempty("El nombre es obligatorio").min(3, "El nombre debe tener al menos 3 caracteres").max(50, "El nombre no puede exceder los 100 caracteres"),
    codigo: z.string().nonempty("El código es obligatorio").min(6, "El código debe tener al menos 6 caracteres").max(6, "El código no puede exceder los 6 caracteres"),
    unidadMedida: z.number().min(1, "Seleccione una unidad de medida"),
    categoriaId: z.number().min(1, "Categoría es requerida"),
    subcategoriaId: z.number().min(1, "La subcategoría es obligatoria para alimentos").optional(),
    imagen_url: z.string().nonempty("La URL de imagen es obligatoria para alimentos").url("URL de imagen inválida").optional().or(z.literal(""))
}).refine(
    (data) => {
        if (data.categoriaId === 1) {
            return data.subcategoriaId && data.subcategoriaId > 0;
        }
        return true;
    },
    {
        message: "La subcategoría es obligatoria para alimentos",
        path: ["subcategoriaId"],
    }
).refine(
    (data) => {
        if (data.categoriaId === 1) {
            return data.imagen_url && data.imagen_url.length > 0;
        }
        return true;
    },
    {
        message: "La URL de imagen es obligatoria para alimentos",
        path: ["imagen_url"],
    }
);

export type AgregarProductoInput = z.infer<typeof agregarProductoSchema>;

export const editarProductoSchema = z.object({
    nombre: z.string().nonempty("El nombre es obligatorio").min(3, "El nombre debe tener al menos 3 caracteres").max(50, "El nombre no puede exceder los 100 caracteres"),
    codigo: z.string().nonempty("El código es obligatorio").min(6, "El código debe tener al menos 6 caracteres").max(6, "El código no puede exceder los 6 caracteres"),
    unidadMedida: z.number().min(1, "Seleccione una unidad de medida"),
    categoriaId: z.number().min(1, "Categoría es requerida"),
    subcategoriaId: z.number().min(1, "La subcategoría es obligatoria para alimentos").optional(),
    imagen_url: z.string().nonempty("La URL de imagen es obligatoria para alimentos").url("URL de imagen inválida").optional().or(z.literal(""))
}).refine(
    (data) => {
        if (data.categoriaId === 1) {
            return data.subcategoriaId && data.subcategoriaId > 0;
        }
        return true;
    },
    {
        message: "La subcategoría es obligatoria para alimentos",
        path: ["subcategoriaId"],
    }
).refine(
    (data) => {
        if (data.categoriaId === 1) {
            return data.imagen_url && data.imagen_url.length > 0;
        }
        return true;
    },
    {
        message: "La URL de imagen es obligatoria para alimentos",
        path: ["imagen_url"],
    }
);

export type EditarProductoInput = z.infer<typeof editarProductoSchema>;

export const agregarCategoriaSchema = z.object({
    nombre: z.string().nonempty("El nombre es obligatorio"),
    descripcion: z.string().nonempty("La descripción es obligatoria")
});

export type AgregarCategoriaInput = z.infer<typeof agregarCategoriaSchema>;