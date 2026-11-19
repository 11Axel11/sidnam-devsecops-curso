import { useEffect, useMemo, useState } from "react";
import { useEditarActividadVoluntariado } from "../hooks/gestionVoluntariado/gestionHooks";
import { useForm } from "@tanstack/react-form";
import { edtiarActividadesSchema } from "@/modules/voluntariado/schemas/schemaVoluntariado";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EditarActividadesProps } from "../types/tablaActividadesProps";
import CalendarField from "@/components/CalendarField";
import { normalizeToYmd } from "@/utils/dateInputs";

const FormEditarActividades = ({ actividad, onClose }: EditarActividadesProps) => {
  const patchActividad = useEditarActividadVoluntariado();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const initialValues = useMemo(() => ({
    id: actividad.id,
    actividades: actividad.actividades ?? "",
    cantidadHoras: actividad.cantidadHoras ?? 0,
    fecha: normalizeToYmd(actividad.fecha),
  }), [actividad]);

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setFormErrors({});
      const result = edtiarActividadesSchema.safeParse(value);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const key = err.path.map(String).join(".");
          fieldErrors[key] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }
      try {
        await patchActividad.mutateAsync({
          idActividad: Number(actividad.id),
          actividadEditada: value,
        });
        toast.success("Actividad editada", {
          description: "Puedes visualizar los cambios en el expediente.",
          duration: 4000,
        });
        onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.response?.status === 401) {
          setFormErrors({ credentials: "Credenciales incorrectas" });
        } else if (err.response?.status === 400) {
          setFormErrors({ error: err.response.data.message});
        } else {
          setFormErrors({ server: "Error en el servidor, por favor intenta más tarde" });
        }
      }
    },
  });

  useEffect(() => {
    form.setFieldValue("fecha", initialValues.fecha);
    form.setFieldValue("actividades", initialValues.actividades);
    form.setFieldValue("cantidadHoras", initialValues.cantidadHoras);
  }, [initialValues.fecha, initialValues.actividades, initialValues.cantidadHoras]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" key={actividad.id}>
        <DialogHeader>
          <DialogTitle>Editar actividad</DialogTitle>
          <DialogDescription>Modifica los datos de la actividad seleccionada.</DialogDescription>
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
                    value={field.state.value ?? ""}
                    onChange={field.handleChange}
                  />
                  {formErrors["fecha"] && (
                    <p className="text-red-700 text-sm">{formErrors["fecha"]}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <div>
            <form.Field name="actividades">
              {(field) => (
                <div className="mb-4">
                  <Label htmlFor="actividades" className="font-semibold mb-2">
                    Descripción de las actividades realizadas
                  </Label>
                  <Input
                    id="actividades"
                    type="text"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.actividades && (
                    <p className="text-red-700 text-sm">{formErrors.actividades}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <div>
            <form.Field name="cantidadHoras">
              {(field) => (
                <div className="mb-4">
                  <Label htmlFor="cantidadHoras" className="font-semibold mb-2">
                    Horas dedicadas
                  </Label>
                  <Input
                    id="cantidadHoras"
                    type="number"
                    min={0}
                    value={field.state.value ?? 0}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                  {formErrors.cantidadHoras && (
                    <p className="text-red-700 text-sm">{formErrors.cantidadHoras}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {formErrors.server && (
            <p className="text-red-700 text-sm text-center">{formErrors.server}</p>
          )}

          <DialogFooter>
            <Button variant={"create"} type="submit">Guardar cambios</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default FormEditarActividades;