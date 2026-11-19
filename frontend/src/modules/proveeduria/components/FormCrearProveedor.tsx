import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { useParams } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCreateProveedor } from "../hooks/proveedoresHooks";
import { crearProveedorSchema } from "../schemas/proveedor";
import { useQueryClient } from "@tanstack/react-query";
import RestaurarProveedor from "./RestaurarProveedor";

const FormCrearProveedor = () => {
  const { idAreaProv } = useParams({ from: "/proveeduria/$idAreaProv/" });
  const areaId = idAreaProv ?? ""; 
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const crearProveedor = useCreateProveedor();

  const form = useForm({
    defaultValues: {
      nombre: "",
      numero_proveedor: "",
      email: "",
      direccion: "",
      id_area: Number(areaId), 
    },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      setServerError(null);

      const valueWithRoute = { ...value, id_area: Number(areaId) };

      const result = crearProveedorSchema.safeParse(valueWithRoute);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const path = err.path.join(".");
          fieldErrors[path] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      try {
        await crearProveedor.mutateAsync({ proveedor: { ...result.data, id_area: Number(result.data.id_area) } });
        toast.success("Proveedor agregado exitosamente", {
          description: "Puedes gestionarlo desde el área actual.",
          duration: 4000,
        });
          setOpen(false);
          form.reset();
          queryClient.invalidateQueries({
            queryKey: ['Proveedores', areaId]
          });
          form.reset();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err?.response?.status === 400) {
          toast.warning("No puedes hacer eso", {
            description: err.response?.data?.message || "Ya existe.",
            duration: 4000,
          });
          form.reset();
        } else if (err?.response?.status === 403) {
          toast.warning("Acceso denegado", {
            description:
              err.response?.data?.message || "No tienes permisos para este recurso",
            duration: 4000,
          });
          form.reset();
        } else {
          setServerError("Error en el servidor, por favor intenta más tarde");
          form.reset();
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="create" className="flex items-center gap-2">
          <Plus /> Agregar proveedor
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center justify-between mr-6">
            <DialogTitle>Agregar proveedor</DialogTitle>
            <RestaurarProveedor idArea={Number(areaId)} onCloseParent={() => setOpen(false)} />
          </div>
          <DialogDescription>
            Completa los datos para registrar un nuevo proveedor.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="nombre"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej. Proveedora XYZ S.A."
                  autoFocus
                  maxLength={50}
                />
                {(formErrors["nombre"]) && (
                  <p className="text-red-700 text-sm">{formErrors["nombre"]}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="numero_proveedor"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor="numero_proveedor">Número telefónico</Label>
                <Input
                  id="numero_proveedor"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  max="99999999"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej. 26658888"
                  maxLength={8}
                />
                {(formErrors["numero_proveedor"]) && (
                  <p className="text-red-700 text-sm">
                    {formErrors["numero_proveedor"]}
                  </p>
                )}
              </div>
            )}
          />

          <form.Field
            name="email"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="proveedor@correo.com"
                  maxLength={100}
                />
                {(formErrors["email"]) && (
                  <p className="text-red-700 text-sm">{formErrors["email"]}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="direccion"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej. San José, Costa Rica"
                  maxLength={100}
                />
                {(formErrors["direccion"]) && (
                  <p className="text-red-700 text-sm">{formErrors["direccion"]}</p>
                )}
              </div>
            )}
          />

          {serverError && (
            <p className="text-red-700 text-sm text-center -mt-2">
              {serverError}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={crearProveedor.isPending}
              variant={"create"}>
              {crearProveedor.isPending ? "Guardando..." : "Guardar"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => {
                setOpen(false);
                form.reset();
              }}>
                Cancelar
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormCrearProveedor;
