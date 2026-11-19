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
import { Card } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { usePostAgregarTipoVoluntariado } from "../hooks/voluntariadoHooks";

const FormAgregarTipoVoluntariado = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const agregarTipoVoluntariado = usePostAgregarTipoVoluntariado();

  const form = useForm({
    defaultValues: { nombreVoluntariado: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      if (!value.nombreVoluntariado.trim()) {
        setFormErrors({ nombreVoluntariado: "El nombre del tipo de voluntariado es obligatorio" });
        return;
      }

      try {
        await agregarTipoVoluntariado.mutateAsync(value.nombreVoluntariado);
        setOpen(false);
        toast.success("Tipo de voluntariado agregado exitosamente", {
          description: "Este elemento será visible al momento de registrar un nuevo voluntariado y cuando los aplicantes envíen una solicitud de voluntariado.",
          duration: 4000,
        });
        form.reset();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        const apiMessage =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message;

        if (err?.response?.status === 400) {
          setFormErrors({
            nombreVoluntariado:
              apiMessage || "Error al agregar el tipo de voluntariado",
          });
        } else {
          setFormErrors({
            server: apiMessage || "Error al agregar el tipo de voluntariado",
          });
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="flex hover:cursor-pointer items-center gap-2">
          <LayoutDashboard /> Agregar tipo de voluntariado
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Agregar tipo de voluntariado</DialogTitle>
          <DialogDescription>
            Ingresa el nombre del nuevo tipo de voluntariado a registrar.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="nombreVoluntariado"
            children={(field) => (
              <div className="mb-4">
                <Label className="mb-2" htmlFor="nombreVoluntariado">Nombre del tipo de voluntariado: </Label>
                <Input
                  id="nombreVoluntariado"
                  type="text"
                  placeholder="Ej: Horas, Normal"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.nombreVoluntariado && (
                  <p className="text-red-700 text-sm">{formErrors.nombreVoluntariado}</p>
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

export default FormAgregarTipoVoluntariado;
