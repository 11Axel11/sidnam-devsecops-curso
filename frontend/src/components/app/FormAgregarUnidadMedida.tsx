import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useGetTipoUnidadMedida, usePostAgregarUnidadMedida } from "../../hooks/use-unidadesMedida";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FormAgregarUnidadMedida = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const agregarUnidadMedida = usePostAgregarUnidadMedida();
  const { tipoUnidadMedida } = useGetTipoUnidadMedida();

  const form = useForm({
    defaultValues: { tipoUnidadMedida: 0, nombre: "", abreviatura: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      if (!value.tipoUnidadMedida) {
        setFormErrors({ tipoUnidadMedida: "El tipo de unidad de medida es obligatorio" });
        return;
      }
      if (!value.nombre.trim()) {
        setFormErrors({ nombre: "El nombre de la unidad de medida es obligatorio" });
        return;
      }
      if (!value.abreviatura.trim()) {
        setFormErrors({ abreviatura: "La abreviatura de la unidad de medida es obligatoria" });
        return;
      }

      try {
        await agregarUnidadMedida.mutateAsync({ unidadMedida: { nombre: value.nombre, abreviatura: value.abreviatura }, idTipoUnidadMedida: Number(value.tipoUnidadMedida) });
        setOpen(false);
        toast.success("Unidad de medida agregada exitosamente", {
          duration: 4000,
        });
        form.reset();
      } catch (err: any) {
        if (err.response?.status === 400) {
          setFormErrors({ nombre: err.response.data.message });
        } else {
          toast.error("Error al agregar la unidad de medida");
        }
      }
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="flex hover:cursor-pointer items-center gap-2">
          <Ruler /> Agregar unidad de medida
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Agregar Unidad de Medida</DialogTitle>
          <DialogDescription>
            Ingresa el tipo y nombre de la nueva unidad de medida a registrar.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="tipoUnidadMedida"
            children={(field) => (
              <div className="mb-4">
                <Label className="mb-2" htmlFor="tipoUnidadMedida">Tipo de unidad de medida: </Label>
                <Select
                  value={field.state.value ? field.state.value.toString() : ""}
                  onValueChange={(value) => field.handleChange(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo de unidad de medida" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoUnidadMedida.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.tipoUnidadMedida && (
                  <p className="text-red-700 text-sm">{formErrors.tipoUnidadMedida}</p>
                )}
              </div>
            )}
          />
          <form.Field
            name="nombre"
            children={(field) => (
              <div className="mb-4">
                <Label className="mb-2" htmlFor="nombre">Nombre de la unidad de medida: </Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Ej: Kilogramos"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.nombre && (
                  <p className="text-red-700 text-sm">{formErrors.nombre}</p>
                )}
              </div>
            )}
          />
          <form.Field
            name="abreviatura"
            children={(field) => (
              <div className="mb-4">
                <Label className="mb-2" htmlFor="abreviatura">Abreviatura de la unidad de medida: </Label>
                <Input
                  id="abreviatura"
                  type="text"
                  placeholder="Ej: Kg"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.abreviatura && (
                  <p className="text-red-700 text-sm">{formErrors.abreviatura}</p>
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
            <Button variant= "create" type="submit">Guardar</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default FormAgregarUnidadMedida