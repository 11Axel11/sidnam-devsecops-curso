import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { usePostAgregarSubCategoria } from "../hooks/inventarioHooks";

const FormAgregarSubCategoria = () => {
    const [open, setOpen] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const agregarSubCategoria = usePostAgregarSubCategoria();

    const form = useForm({
        defaultValues: { nombre: "" },
        onSubmit: async ({ value }) => {
          setFormErrors({});
          if (!value.nombre.trim()) {
            setFormErrors({ nombre: "El nombre de la sub categoría es obligatorio" });
            return;
          }
    
          try {
            await agregarSubCategoria.mutateAsync({ nombre: value.nombre });
            setOpen(false);
            toast.success("Sub categoría agregada exitosamente", {
              description: "Puedes visualizar esta sub categoría en el inventario",
              duration: 4000,
            });
            form.reset();
          } catch (err: any) {
            if (err.response?.status === 400) {
              setFormErrors({ nombre: err.response.data.message });
            } else {
              toast.error("Error al agregar la sub categoría");
            }
          }
        },
      });
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="flex hover:cursor-pointer items-center gap-2">
          <LayoutDashboard /> Agregar sub categoría de alimentos
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Agregar Sub Categoría</DialogTitle>
          <DialogDescription>
            Ingresa el nombre de la nueva sub categoría a registrar.
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
                <Label className="mb-2" htmlFor="nombre">Nombre de la sub categoría: </Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Ej: Enlatados, Granos, Condimentos"
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
            <Button variant="create" type="submit">Guardar</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    );
};

export default FormAgregarSubCategoria;
