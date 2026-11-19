import { useForm } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePatchProveedor } from "../hooks/proveedoresHooks";
import type { defaultValuesProveedor, EditarProveedor } from "../models/proveedores";
import type { FormEditarProveedorProps } from "../types/proveedoresTypes";


export default function FormEditarProveedor({
  idProveedor,
  initial,
  onSuccess,
}: FormEditarProveedorProps) {

  const proveedorMutation = usePatchProveedor();

  const defaults: defaultValuesProveedor = {
    nombre: initial.nombre != null ? String(initial.nombre) : "",
    numero: initial.numero != null ? Number(initial.numero) : undefined,
    direccion: initial.direccion != null ? String(initial.direccion) : "",
    correo: initial.correo != null ? String(initial.correo) : "",
  };

  const form = useForm({
    defaultValues: defaults,
    onSubmit: async ({ value }) => {
      const changed: Partial<EditarProveedor> = {};
  
      if (value.nombre !== defaults.nombre) {
        changed.nombre = value.nombre;
      }
      if (value.numero !== defaults.numero) {
        changed.numero = value.numero;
      }
      if (value.direccion !== defaults.direccion) {
        changed.direccion = value.direccion;
      }
      if (value.correo !== defaults.correo) {
        changed.correo = value.correo;
      }
  
      if (Object.keys(changed).length === 0) {
        toast.info("No hay cambios por guardar");
        return;
      }
  
      try {
        const toastId = toast.loading("Actualizando proveedor...");
        await proveedorMutation.mutateAsync({ 
          proveedor: changed, 
          idProveedor 
        }, {
          onSuccess: () => {
            toast.success("Proveedor actualizado correctamente", { id: toastId });
            onSuccess?.();
          },
          onError: () => {
            toast.error("Error al actualizar el proveedor", { 
              id: toastId,
              description: "Intente nuevamente más tarde"
            });
          }
        });
      } catch (error) {
        console.error('Unexpected error:', error);
      }
    },
  });

  return (
    <form
  onSubmit={(e) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit();
  }}
>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <form.Field name="nombre">
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre: </Label>
          <Input
            id="nombre"
            type="text"
            value={field.state.value ?? ""}
            onChange={(e) => {
              if (e.target.value.length <= 50) {
                field.handleChange(e.target.value);
              }
            }}
            placeholder="Ej. Proveedora XYZ S.A."
            maxLength={50}
            required
          />
          <p className="text-xs text-muted-foreground">
            {field.state.value?.length || 0}/50 caracteres
          </p>
        </div>
      )}
    </form.Field>

    <form.Field name="numero">
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor="numero">Número telefónico: </Label>
          <Input
            id="numero"
            type="tel"
            inputMode="tel"
            pattern="[0-9+ ]{8,20}"
            value={field.state.value ?? ""}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9+ ]/g, '');
              if (value.length <= 20) {
                field.handleChange(Number(value));
              }
            }}
            placeholder="Ej: +506 2222 2222"
            required
          />
          <p className="text-xs text-muted-foreground">
            {field.state.value?.toString().length || 0}/20 caracteres
          </p>
        </div>
      )}
    </form.Field>

    <form.Field name="direccion">
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor="direccion">Dirección: </Label>
          <Input
            id="direccion"
            type="text"
            value={field.state.value ?? ""}
            onChange={(e) => {
              if (e.target.value.length <= 50) {
                field.handleChange(e.target.value);
              }
            }}
            placeholder="Ej: 200m norte del parque central"
            maxLength={50}
            required
          />
          <p className="text-xs text-muted-foreground">
            {field.state.value?.length || 0}/50 caracteres
          </p>
        </div>
      )}
    </form.Field>

    <form.Field name="correo">
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor="correo">Correo: </Label>
          <Input
            id="correo"
            type="email"
            value={field.state.value ?? ""}
            onChange={(e) => {
              if (e.target.value.length <= 50) {
                field.handleChange(e.target.value);
              }
            }}
            placeholder="ejemplo@proveedor.com"
            maxLength={50}
            required
          />
          <p className="text-xs text-muted-foreground">
            {field.state.value?.length || 0}/50 caracteres
          </p>
        </div>
      )}
    </form.Field>
  </div>

  <div className="flex justify-end gap-2 pt-4">
        <Button type="submit"
          variant={"update"}>Guardar</Button>
  </div>
</form>
  );
}