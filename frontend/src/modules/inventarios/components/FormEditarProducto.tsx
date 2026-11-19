import { useForm } from "@tanstack/react-form";
import { usePatchEditarProductoInventario } from "../hooks/inventarioHooks";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EditarProductoInventario } from "../models/inventario";
import { useGetUnidadesMedida } from "../../../hooks/use-unidadesMedida";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetSubCategorias } from "../hooks/inventarioHooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { editarProductoSchema } from "../schemas/schemaInventarios";

const FormEditarProducto = ({ 
  idInventario, 
  initialValues,
  categoriaId,
  controlledOpen,
  onControlledOpenChange,
}: { 
  idInventario: number, 
  initialValues: EditarProductoInventario,
  categoriaId: number,
  controlledOpen?: boolean,
  onControlledOpenChange?: (open: boolean) => void,
}) => {
  const formMutation = usePatchEditarProductoInventario();
  const { data: UnidadesMedida } = useGetUnidadesMedida(1);
  const { subcategorias } = useGetSubCategorias();
  const showAdditionalFields = categoriaId === 1;
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (v: boolean) => { setInnerOpen(v); onControlledOpenChange?.(v); };
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
  }, [initialValues, subcategorias]);

  const defaultSubcategoriaId = initialValues.subcategoriaId || (subcategorias?.[0]?.id ?? 1);

  const form = useForm({
    defaultValues: {
      nombre: initialValues.nombre || "",
      codigo: initialValues.codigo || "",
      unidadMedida: initialValues.unidadMedida || 0,
      subcategoriaId: defaultSubcategoriaId,
      imagen_url: initialValues.imagen_url || ""
    },
    onSubmit: async ({ value }) => {
      const hasChanges = Object.keys(value).some(key => {
        const formValue = value[key as keyof typeof value];
        const initialValue = initialValues[key as keyof typeof initialValues];
        return formValue !== initialValue;
      });

      if (!hasChanges) {
        toast.info("No se detectaron cambios para guardar");
        return;
      }

      // ✅ Validación con errores en rojo
      setFormErrors({});
      const result = editarProductoSchema.safeParse({ ...value, categoriaId });
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
        await formMutation.mutateAsync({ idInventario, producto: value });
        form.reset();
        setOpen(false);
        toast.success("Producto actualizado correctamente");
      } catch (error) {
        setOpen(false);
        toast.error("Error al actualizar el producto");
      }
    }
  });

  const handleClose = () => {
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger>
          <Button variant="update">
            <Pencil className="h-3 w-3" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}>
          <div className="my-4 text-left text-black space-y-4">
        <form.Field
          name="codigo"
          children={(field) => (
            <div>
              <Label className="font-semibold" htmlFor="codigo">
                Código:
              </Label>
              <Input
                id="codigo"
                className="mt-1"
                minLength={3}
                maxLength={6}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Ejemplo: ARZ001"
              />
              {formErrors.codigo && <p className="text-red-500 text-sm mt-1">{formErrors.codigo}</p>}
            </div>
          )}
        />

        <form.Field
          name="nombre"
          children={(field) => (
            <div>
              <Label className="font-semibold" htmlFor="nombre">
                Nombre:
              </Label>
              <Input
                id="nombre"
                className="mt-1"
                minLength={3}
                maxLength={50}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Ejemplo: Arroz"
              />
              {formErrors.nombre && <p className="text-red-500 text-sm mt-1">{formErrors.nombre}</p>}
            </div>
          )}
        />

        <form.Field
          name="unidadMedida"
          children={(field) => (
            <div>
              <Label className="font-semibold">
                Unidad de Medida:
              </Label>
              <Select
                value={String(field.state.value || '')}
                onValueChange={(value) => field.handleChange(Number(value))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccione una unidad de medida" />
                </SelectTrigger>
                <SelectContent>
                  {UnidadesMedida?.map((unidad) => (
                    <SelectItem key={unidad.id_unidad} value={String(unidad.id_unidad)}>
                      {unidad.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.unidadMedida && <p className="text-red-500 text-sm mt-1">{formErrors.unidadMedida}</p>}
            </div>
          )}
        />
        {showAdditionalFields && (
          <>
            <form.Field
              name="subcategoriaId"
              children={(field) => (
                <div className="mt-4">
                  <Label className="font-semibold">Subcategoría:</Label>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(value) => {
                      field.handleChange(Number(value));
                    }}
                    disabled={!subcategorias?.length}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={
                        subcategorias?.length 
                          ? "Seleccione una subcategoría" 
                          : "Cargando subcategorías..."
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategorias?.map((subcat) => (
                        <SelectItem key={subcat.id} value={String(subcat.id)}>
                          {subcat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.subcategoriaId && <p className="text-red-500 text-sm mt-1">{formErrors.subcategoriaId}</p>}
                </div>
              )}
            />

            <form.Field
              name="imagen_url"
              children={(field) => (
                <div className="mt-4">
                  <Label className="font-semibold" htmlFor="imagen_url">
                    URL de la imagen:
                  </Label>
                  <Input
                    id="imagen_url"
                    className="mt-1"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  {formErrors.imagen_url && <p className="text-red-500 text-sm mt-1">{formErrors.imagen_url}</p>}
                </div>
              )}
            />
          </>
        )}
        <div className="flex justify-center gap-2">
          <Button type="submit" variant="update" disabled={formMutation.isPending} className="flex-1">
            {formMutation.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
    </DialogContent>
    </Dialog>
  );
};

export default FormEditarProducto;
