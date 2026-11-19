import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCreateAreaProveedor } from "../hooks/proveedoresHooks";
import { useQueryClient } from "@tanstack/react-query";
import { areaSchema } from "../schemas/proveedor";

const FormCrearArea = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const agregarArea = useCreateAreaProveedor();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: { nombre: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});

      const result = areaSchema.safeParse(value);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      try {
        await agregarArea.mutateAsync({ area: { nombre: value.nombre } });
        setOpen(false);
        toast.success("Área agregada exitosamente");
        queryClient.invalidateQueries({
          queryKey: ["areasProveedores"]
        });
        form.reset();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.response?.status === 400) {
          setFormErrors({
            server: err.response?.data?.message || "Ya existe un área con este nombre",
          });
        } else {
          setFormErrors({
            server: "Error en el servidor, intenta más tarde",
          });
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={"create"} className="flex hover:cursor-pointer items-center gap-2">
          <Plus />Agregar área
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Agregar área</DialogTitle>
          <DialogDescription>
            Ingresa el nombre de la nueva área a registrar.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="nombre"
            children={(field) => (
              <div className="mb-4">
                <Label className="mb-2" htmlFor="nombre">Nombre del área: </Label>
                <Input
                  id="nombre"
                  type="text"
                  maxLength={25}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.nombre && (
                  <p className="text-red-700 text-sm">{formErrors.nombre}</p>
                )}
              </div>
            )}
          />

          {formErrors.server && (
            <p className="text-red-700 text-sm text-center mb-2">
              {formErrors.server}
            </p>
          )}

          <DialogFooter>
            <Button type="submit"
              variant={"create"}>Guardar</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormCrearArea;
