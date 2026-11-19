import { useParams } from "@tanstack/react-router";
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
import { actividadesSchema } from "@/modules/voluntariado/schemas/schemaVoluntariado";
import { CalendarPlus } from "lucide-react";
import { useCreateActividadVoluntariado } from "../hooks/gestionVoluntariado/gestionHooks";
import CalendarField from "@/components/CalendarField";
import { toast } from "sonner";

const FormAgregarActividades = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const agregarHoras = useCreateActividadVoluntariado();
  const { id } = useParams({ from: "/voluntarios/gestion/$id" });

  const form = useForm({
    defaultValues: { actividades: "", cantidadHoras: 0, fecha: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});

      const result = actividadesSchema.safeParse(value);

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
        await agregarHoras.mutateAsync({
          idExpediente: Number(id),
          agregarActividades: value,
        });
        setOpen(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.response?.status === 404) {
          setFormErrors({
            maxQuota: "No puedes agregar más horas, ya se cumplió el límite establecido",
          });
        } else if (err.response?.status === 400) {
          toast.warning("No puedes hacer eso", {
            description:
              err.response?.data?.message || "Invalido. ",
            duration: 4000,
          });
        } else {
          setFormErrors({
            server: "Error en el servidor, por favor intenta más tarde",
          });
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="hover:cursor-pointer" variant="update">
          <CalendarPlus /> Agregar actividades
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar actividades</DialogTitle>
          <DialogDescription>
            Agrega las actividades realizadas por el voluntario a su expediente
            activo.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div>
            <form.Field name="fecha">
              {(field) => (
                <div className="flex flex-col mb-4">
                  <Label className="font-semibold mb-2">Fecha de la actividad:</Label>
                  <CalendarField
                  disableFuture
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                  {formErrors['fecha'] && (
                    <p className="text-red-700 text-sm">{formErrors['fecha']}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <div>
            <form.Field
              name="actividades"
              validators={{
                onChangeAsyncDebounceMs: 500,
              }}
              children={(field) => (
                <div className="mb-4">
                  <Label className="font-semibold mb-2" htmlFor="actividades">
                    Descripción de las actividades realizadas
                  </Label>
                  <Input
                    id="actividades"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.actividades && (
                    <p className="text-red-700 text-sm">
                      {formErrors.actividades}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          <div>
            <form.Field
              name="cantidadHoras"
              validators={{
                onChangeAsyncDebounceMs: 500,
              }}
              children={(field) => (
                <div className="mb-4">
                  <Label className="font-semibold mb-2" htmlFor="cantidadHoras">
                    Horas dedicadas
                  </Label>
                  <Input
                    id="cantidadHoras"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                  {formErrors.cantidadHoras && (
                    <p className="text-red-700 text-sm">
                      {formErrors.cantidadHoras}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          {formErrors.maxQuota && (
            <p className="text-red-700 text-sm text-center mb-2">
              {formErrors.maxQuota}
            </p>
          )}
          {formErrors.server && (
            <p className="text-red-700 text-sm text-center">
              {formErrors.server}
            </p>
          )}
          <DialogFooter>
            <Button variant={"create"} type="submit">Agregar actividad</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormAgregarActividades;
