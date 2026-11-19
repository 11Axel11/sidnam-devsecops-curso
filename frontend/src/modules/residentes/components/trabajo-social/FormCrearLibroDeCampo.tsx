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
import { toast } from "sonner";
import { useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { CrearLibroDeCampo } from "../../models/enfermeria";
import { useCreateLibroDeCampo } from "../../hooks/trabajo-social/trabajoSocialHooks";
import { richTextPlainText } from "../../utils/richText";
import RichTextEditor from "../enfermeria/RichTextEditor";
import { NotebookText } from "lucide-react";

const FormCrearLibroDeCampo = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { id } = useParams({ from: "/residentes/$id/trabajo-social/" });
  const queryClient = useQueryClient();

  const createLibroDeCampo = useCreateLibroDeCampo();

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      setFormErrors({});
      queryClient.invalidateQueries({
        queryKey: ['bitacoraTS', Number(id)]
      });
    }
  };

  const form = useForm({
    defaultValues: {
      problematica: "",
      descripcionCompleta: "",
      fechaActividad: "",
      acuerdoAlcanzado: ""
    },
    onSubmit: async ({ value }) => {
      setFormErrors({});

      try {
        if (!value.problematica.trim()) {
          setFormErrors({ problematica: "La problemática es requerida" });
          return;
        }

        if (!richTextPlainText(value.descripcionCompleta)) {
          setFormErrors({ descripcionCompleta: "La descripción es requerida" });
          return;
        }

        if (!value.fechaActividad.trim()) {
          setFormErrors({ fechaActividad: "La fecha de actividad es requerida" });
          return;
        }

        if (!richTextPlainText(value.acuerdoAlcanzado)) {
          setFormErrors({ acuerdoAlcanzado: "El acuerdo alcanzado es requerido" });
          return;
        }

        const fechaFormateada = `${value.fechaActividad} ${new Date().toLocaleTimeString('en-US', { hour12: false })}`;

        const dataToSend: CrearLibroDeCampo = {
          descripcionCompleta: value.descripcionCompleta,
          problematica: value.problematica,
          fecha_actividad: fechaFormateada,
          acuerdo_alcanzado: value.acuerdoAlcanzado
        };

        await createLibroDeCampo.mutateAsync({
          idExpediente: Number(id),
          nota: dataToSend
        });

        toast.success("Entrada del libro de campo agregada correctamente");
        setOpen(false);
        form.reset();

        queryClient.invalidateQueries({
          queryKey: ['bitacoraTS', Number(id)]
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('Error creating libro de campo entry:', err);

        if (err.errors) {
          const errors: Record<string, string> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          err.errors.forEach((e: any) => {
            if (e.path?.[0]) errors[e.path[0]] = e.message;
          });
          setFormErrors(errors);
        } else if (err.message && Array.isArray(err.message)) {
          const serverError = err.message.join(', ');
          toast.error(`Error de validación: ${serverError}`);
          setFormErrors({ server: serverError });
        } else {
          toast.error("Error en el servidor, intenta más tarde");
          setFormErrors({ server: "Error en el servidor" });
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="create">
          <NotebookText />Registrar nota
        </Button>
      </DialogTrigger>

      <DialogContent className="w-full sm:max-w-lg md:max-w-xl 
        lg:max-w-2xl mx-auto my-6 sm:my-12 max-h-[80vh] overflow-y-auto
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      >
        <DialogHeader>
          <DialogTitle>Agregar nota al Libro de Campo</DialogTitle>
          <DialogDescription>
            Ingresa los detalles de la nueva nota del libro de campo.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4 px-2 sm:px-4"
        >
          <form.Field
            name="problematica"
            children={(field) => (
              <div>
                <Label htmlFor="problematica" className="mb-1 block">
                  Problemática:
                </Label>
                <Input
                  id="problematica"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Describe la problemática abordada"
                  className="break-words w-full max-w-full overflow-x-hidden"
                  style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
                />
                {formErrors.problematica && (
                  <p className="text-red-700 text-sm mt-1 break-words">{formErrors.problematica}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="fechaActividad"
            children={(field) => (
              <div>
                <Label htmlFor="fechaActividad" className="mb-1 block">
                  Fecha de actividad:
                </Label>
                <Input
                  id="fechaActividad"
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.fechaActividad && (
                  <p className="text-red-700 text-sm mt-1 break-words">{formErrors.fechaActividad}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="descripcionCompleta"
            children={(field) => (
              <div>
                <Label htmlFor="descripcionCompleta" className="mb-1 block">
                  Descripción completa:
                </Label>
                <RichTextEditor
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder="Describe detalladamente la actividad realizada"
                />
                {formErrors.descripcionCompleta && (
                  <p className="text-red-700 text-sm mt-1 break-words">{formErrors.descripcionCompleta}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="acuerdoAlcanzado"
            children={(field) => (
              <div>
                <Label htmlFor="acuerdoAlcanzado" className="mb-1 block">
                  Acuerdo alcanzado:
                </Label>
                <RichTextEditor
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder="Describe los acuerdos o conclusiones alcanzadas"
                />
                {formErrors.acuerdoAlcanzado && (
                  <p className="text-red-700 text-sm mt-1 break-words">{formErrors.acuerdoAlcanzado}</p>
                )}
              </div>
            )}
          />

          {formErrors.server && (
            <p className="text-red-700 text-sm text-center break-words">{formErrors.server}</p>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              variant={"create"}
              disabled={createLibroDeCampo.isPending}
            >
              {createLibroDeCampo.isPending ? "Guardando..." : "Guardar"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormCrearLibroDeCampo;