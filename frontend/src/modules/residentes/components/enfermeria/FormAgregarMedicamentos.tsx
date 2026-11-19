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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { Activity } from "lucide-react";
import { useCreateMedicamento, useGetTiposMedicamento } from "../../hooks/enfermeria/enfermeriaHooks";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

const FormAgregarMedicamento = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { TiposMedicamentos, loadingTiposMedicamentos } = useGetTiposMedicamento();
  const agregarMedicamento = useCreateMedicamento();

  const form = useForm({
    defaultValues: {
      nombre: "",
      idTipoMedicamento: ""
    },
    onSubmit: async ({ value }) => {
      setFormErrors({});

      if (!value.nombre.trim()) {
        setFormErrors({ nombre: "El nombre del medicamento es obligatorio" });
        return;
      }

      if (!value.idTipoMedicamento) {
        setFormErrors({ idTipoMedicamento: "Debe seleccionar un tipo de medicamento" });
        return;
      }

      try {
        await agregarMedicamento.mutateAsync({
          idTipoMedicamento: parseInt(value.idTipoMedicamento),
          medicamento: {
            nombre: value.nombre,
            id: value.idTipoMedicamento
          }
        });
        setOpen(false);
        form.reset();
        toast.success("Medicamento agregado exitosamente");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.response?.status === 400) {
          setFormErrors({
            server: err.response?.data?.message || "Ya existe un medicamento con este nombre"
          });
        } else {
          setFormErrors({ server: "Error en el servidor, intenta más tarde" });
        }
      }
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setFormErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Card className="flex hover:cursor-pointer items-center gap-2 p-4">
          <Activity /> Agregar medicamento
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Agregar Medicamento</DialogTitle>
          <DialogDescription>
            Ingresa el nombre del nuevo medicamento y selecciona su tipo.
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
            name="idTipoMedicamento"
            children={(field) => (
              <div>
                <Label className="mb-2">
                  Tipo de medicamento <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                  disabled={loadingTiposMedicamentos}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingTiposMedicamentos
                          ? "Cargando..."
                          : "Selecciona un tipo de medicamento"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {TiposMedicamentos?.map((tipo) => (
                      <SelectItem key={tipo.id} value={String(tipo.id)}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.idTipoMedicamento && (
                  <p className="text-red-700 text-sm mt-1">{formErrors.idTipoMedicamento}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="nombre"
            children={(field) => (
              <div>
                <Label className="mb-2" htmlFor="nombre">
                  Nombre del medicamento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Ej: Paracetamol"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.nombre && (
                  <p className="text-red-700 text-sm mt-1">{formErrors.nombre}</p>
                )}
              </div>
            )}
          />

          {formErrors.server && (
            <p className="text-red-700 text-sm text-center">
              {formErrors.server}
            </p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={agregarMedicamento.isPending || loadingTiposMedicamentos}
              variant={"create"}
            >
              {agregarMedicamento.isPending ? "Guardando..." : "Guardar"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormAgregarMedicamento;