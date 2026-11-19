import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import { useEditLibroDeCampo } from "../../hooks/trabajo-social/trabajoSocialHooks";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { CardLibroDeCampoProps } from "../../types/enfermeriaProps";
import RichTextEditor from "../enfermeria/RichTextEditor";
import { renderRichText, richTextPlainText } from "../../utils/richText";
import IfPerm from "@/components/auth/IfPerm";

const CardLibroDeCampo = ({ entrada }: CardLibroDeCampoProps) => {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useEditLibroDeCampo();

  const form = useForm({
    defaultValues: {
      descripcion: entrada.descripcion,
      problematica: entrada.problematica,
      acuerdoAlcanzado: entrada.acuerdoAlcanzado,
      fechaActividad: entrada.fechaActividad,
    },
    onSubmit: async () => {
      mutation.mutate({
        idNota: entrada.id,
        notaEditada: {
          descripcionCompleta: form.state.values.descripcion,
          problematica: form.state.values.problematica,
          acuerdo_alcanzado: form.state.values.acuerdoAlcanzado,
          fecha_actividad: new Date(form.state.values.fechaActividad).toISOString(),
        },
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['libroDeCampo', Number(entrada.id)] });
          setIsEditing(false);
          toast.success('Nota editada', {
            description: 'Ya puedes ver los cambios a la nota. Se ha registrado el usuario que hizo los cambios. ',
            duration: 4000,
          });
        },
      });
    },
  });

  const descripcionRenderizada = renderRichText(entrada.descripcion);
  const acuerdoRenderizado = renderRichText(entrada.acuerdoAlcanzado);
  const descripcionTextoPlano = richTextPlainText(entrada.descripcion);
  const snippet =
    descripcionTextoPlano.length > 100
      ? descripcionTextoPlano.slice(0, 100) + "..."
      : descripcionTextoPlano;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="lg:w-135 h-60 cursor-pointer overflow-hidden border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-lg flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base leading-snug break-words">Fecha de actividad — {entrada.fechaActividad}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground break-words overflow-hidden">
              <strong className="font-semibold">Problemática:</strong> {entrada.problematica}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative flex-1 overflow-hidden break-words">
            <p className="max-h-28 overflow-hidden text-sm leading-relaxed text-muted-foreground">{snippet}</p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 " />
          </CardContent>
          <CardFooter className="mt-auto border-t border-border/60 pt-4 text-xs font-medium tracking-wide text-muted-foreground break-all">{entrada.fecha}</CardFooter>
        </Card>
      </DialogTrigger>

      <DialogContent className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl flex flex-col max-h-[88vh] overflow-y-auto p-7 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent rounded-2xl border-border/60 bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl break-words">
            Entrada del Libro de Campo - {entrada.fechaActividad}
          </DialogTitle>
          <CardDescription>
            <p className="text-sm text-gray-600 break-words">Registrado el: {entrada.fecha}</p>
          </CardDescription>
        </DialogHeader>

        {!isEditing ? (
          <div className="overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-2">Problemática:</h4>
              <p className="text-justify text-sm bg-gray-50 p-3 rounded-md break-words overflow-hidden">{entrada.problematica}</p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-2">Descripción:</h4>
              <div
                className="text-justify prose prose-sm max-w-none break-words text-foreground prose-strong:font-semibold prose-em:italic prose-u:underline"
                dangerouslySetInnerHTML={{ __html: descripcionRenderizada }}
              />
            </div>

            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-2">Acuerdo Alcanzado:</h4>
              <div
                className="prose prose-sm max-w-none text-justify break-words bg-green-50 p-3 rounded-md border-l-4 border-green-400 text-foreground prose-strong:font-semibold prose-em:italic prose-u:underline"
                dangerouslySetInnerHTML={{ __html: acuerdoRenderizado }}
              />
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field
              name="problematica"
              children={(field) => (
                <div>
                  <label className="text-sm font-medium">Problemática</label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            />

            <form.Field
              name="descripcion"
              children={(field) => (
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <RichTextEditor
                    value={field.state.value}
                    onChange={field.handleChange}
                    placeholder="Edita la descripción de la actividad"
                  />
                </div>
              )}
            />

            <form.Field
              name="acuerdoAlcanzado"
              children={(field) => (
                <div>
                  <label className="text-sm font-medium">Acuerdo Alcanzado</label>
                  <RichTextEditor
                    value={field.state.value}
                    onChange={field.handleChange}
                    placeholder="Edita el acuerdo alcanzado"
                  />
                </div>
              )}
            />

            <form.Field
              name="fechaActividad"
              children={(field) => (
                <div>
                  <label className="text-sm font-medium">Fecha Actividad</label>
                  <Input
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            />
            <DialogFooter className="sticky bottom-0 z-20 mt-2 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <Button variant="create" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={mutation.isPending}>
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        )}

        {!isEditing && (
          <DialogFooter className="flex justify-between">
            <IfPerm perm='Residencia.Trabajo Social:Actualizar'>
              <Button onClick={() => setIsEditing(true)}
                variant={"update"}>
                Editar
              </Button>
            </IfPerm>
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CardLibroDeCampo;