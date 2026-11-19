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
import { Activity } from "lucide-react";
import { useCreatePatologia } from "../../hooks/enfermeria/enfermeriaHooks";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

const FormAgregarPatologia = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const agregarPatologia = useCreatePatologia();

  const form = useForm({
    defaultValues: { nombre: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      if (!value.nombre.trim()) {
        setFormErrors({ nombre: "El nombre de la patología es obligatorio" });
        return;
      }

      try {
        await agregarPatologia.mutateAsync({ patologia: { nombre: value.nombre } });
        setOpen(false);
        toast.success("Patología agregada exitosamente");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.response?.status === 400) {
          setFormErrors({
            server: err.response?.data?.message || "Ya existe una patología con este nombre"
          });
        } else {
          setFormErrors({ server: "Error en el servidor, intenta más tarde" });
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="flex hover:cursor-pointer items-center gap-2">
          <Activity /> Agregar Patología
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Agregar Patología</DialogTitle>
          <DialogDescription>
            Ingresa el nombre de la nueva patología a registrar.
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
                <Label className="mb-2" htmlFor="nombre">Nombre de la patología: </Label>
                <Input
                  id="nombre"
                  type="text"
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

export default FormAgregarPatologia;
