import { usePostAgregarProducto } from "../hooks/inventarioHooks";
import { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { agregarProductoSchema } from "@/modules/inventarios/schemas/schemaInventarios";
import { toast } from "sonner";
import { Label } from "@radix-ui/react-label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetUnidadesMedida } from "../../../hooks/use-unidadesMedida";
import { useGetSubCategorias } from "../hooks/inventarioHooks";

const FormAgregarProducto = ({ categoryId, onSuccess }: { categoryId: number, onSuccess: () => void }) => {
  const formMutation = usePostAgregarProducto();
  const { data: UnidadesMedida } = useGetUnidadesMedida(1);
  const { subcategorias } = useGetSubCategorias();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);

  useEffect(() => {
    setShowAdditionalFields(categoryId === 1);
  }, [categoryId]);

  const form = useForm({
    defaultValues: {
      nombre: "",
      codigo: "",
      unidadMedida: 0,
      categoriaId: categoryId,
      subcategoriaId: 1,
      imagen_url: ""
    },

    onSubmit: async ({ value }) => {
      setFormErrors({});

const result = agregarProductoSchema.safeParse({ ...value, categoriaId: categoryId });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      try {
        const payload = {
          ...value,
          categoriaId: categoryId,
          unidadMedida: value.unidadMedida,
          ...(categoryId === 1 ? {
            subcategoriaId: value.subcategoriaId || undefined,
            imagen_url: value.imagen_url || undefined
          } : {})
        };

        await formMutation.mutateAsync({
          producto: payload
        });
        
        toast.success("Producto agregado exitosamente", {
          description: "Puedes visualizar este producto en el inventario",
          duration: 4000,
        });
        form.reset();
        onSuccess();
      } catch (err: any) {
        if (err.response?.status === 401) {
          setFormErrors({ credentials: "Credenciales incorrectas" });
        } else if (err.response?.status === 400) {
          setFormErrors({ server: err.response.data.message || "Error en la solicitud, por favor verifica los datos" });
        } else {
          setFormErrors({ server: "Error en el servidor, por favor intenta más tarde" });
        }
      }
    }
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="w-100 my-4 text-left text-black space-y-4">
        <form.Field
          name="codigo"
          validators={{ onChangeAsyncDebounceMs: 500 }}
          children={(field) => (
            <div>
              <div className="mb-2">
                <Label className="font-semibold" htmlFor="codigo">
                  Código:
                </Label>
              </div>
              <Input
                id="codigo"
                type="text"
                value={field.state.value}
                maxLength={6}
                placeholder="Ejemplo: ARZ001"
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {formErrors.codigo && (
                <p className="text-red-700 text-sm">{formErrors.codigo}</p>
              )}
            </div>
          )}
        />
        
        <form.Field
          name="nombre"
          validators={{ onChangeAsyncDebounceMs: 500 }}
          children={(field) => (
            <div>
              <div className="mb-2">
                <Label className="font-semibold" htmlFor="nombre">
                  Nombre:
                </Label>
              </div>
              <Input
                id="nombre"
                type="text"
                value={field.state.value}
                maxLength={50}
                placeholder="Ejemplo: Arroz"
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {formErrors.nombre && (
                <p className="text-red-700 text-sm">{formErrors.nombre}</p>
              )}
            </div>
          )}
        />

        <form.Field
          name="unidadMedida"
          children={(field) => (
            <div>
              <div className="mb-2">
                <Label className="font-semibold">
                  Unidad de Medida:
                </Label>
              </div>
              <Select
                value={String(field.state.value)}
                onValueChange={(value) => field.handleChange(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione una unidad de medida" />
                </SelectTrigger>
                <SelectContent>
                  {UnidadesMedida && UnidadesMedida.length > 0 ? (
                    UnidadesMedida.map((unidad) => (
                      <SelectItem key={unidad.id_unidad} value={unidad.id_unidad.toString()}>
                        {unidad.nombre}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-units" disabled>
                      No hay unidades de medida disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {formErrors.unidadMedida && (
                <p className="text-red-700 text-sm">{formErrors.unidadMedida}</p>
              )}
            </div>
          )}
        />

        {showAdditionalFields && (
          <>
            <form.Field
              name="subcategoriaId"
              children={(field) => (
                <div>
                  <div className="mb-2">
                    <Label className="font-semibold">
                      Subcategoría:
                    </Label>
                  </div>
                  <Select
                    value={field.state.value?.toString() || ""}
                    onValueChange={(value) => field.handleChange(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione una subcategoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategorias && subcategorias.length > 0 ? (
                        subcategorias.map((subcategoria) => (
                          <SelectItem key={subcategoria.id} value={subcategoria.id.toString()}>
                            {subcategoria.nombre}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-subcategories" disabled>
                          No hay subcategorías disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {formErrors.subcategoriaId && (
                    <p className="text-red-700 text-sm">{formErrors.subcategoriaId}</p>
                  )}
                </div>
              )}
            />

            <form.Field
              name="imagen_url"
              children={(field) => (
                <div>
                  <div className="mb-2">
                    <Label className="font-semibold" htmlFor="imagen_url">
                      URL de la imagen: <span className="text-sm font-normal text-gray-600">(para mostrar en la lista de productos)</span>
                    </Label>
                  </div>
                  <Input
                    id="imagen_url"
                    type="url"
                    value={field.state.value}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.imagen_url && (
                    <p className="text-red-700 text-sm">{formErrors.imagen_url}</p>
                  )}
                </div>
              )}
            />
          </>
        )}

        <Button
          type="submit"
          variant="create"
          className="w-full mt-6"
          disabled={formMutation.isPending}
        >
          {formMutation.isPending ? "Agregando..." : "Agregar"}
        </Button>

        {formErrors.server && (
          <p className="text-red-700 text-sm text-center">{formErrors.server}</p>
        )}
      </div>
    </form>
  );
};

export default FormAgregarProducto;