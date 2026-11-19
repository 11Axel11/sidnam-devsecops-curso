import { useForm } from "@tanstack/react-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCreateFotoPerfil } from "../hooks/usuariosHooks";
import { useState } from "react";

const FormFotoPerfil = ({ idUsuario }: { idUsuario: number }) => {
  const { mutate, isPending, isError, error } = useCreateFotoPerfil();
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: { imagen: undefined as unknown as File },
    onSubmit: ({ value }) => {
      mutate(
        { file: value.imagen, usuarioId: idUsuario },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSuccess: (data: any) => {
            toast.success(data?.message ?? "Foto de perfil actualizada", {
              description: "Podrás verla en tu perfil",
              duration: 4000,
            });
            setOpen(false);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onError: (err: any) => {
            toast.error(String(err?.response?.data?.message ?? "Error al subir la imagen"));
          },
        }
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Plus />
          Agregar imagen
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar imagen</DialogTitle>
          <DialogDescription>Selecciona el archivo para tu foto de perfil</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
          className="space-y-4"
        >
          <form.Field
            name="imagen"
            validators={{ onChange: ({ value }) => (!value ? "Seleccione una imagen" : undefined) }}
          >
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label className="mb-1 text-left">Imágen</Label>
                <div className="relative flex items-center">
                  <label
                    htmlFor="imagen-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 text-sm rounded-lg border border-gray-200 shadow cursor-pointer hover:bg-gray-100"
                  >
                    <ImageUp className="h-4 w-4" />
                    Seleccionar imagen
                    <Input
                      id="imagen-upload"
                      name="imagen"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) field.handleChange(file);
                      }}
                      className="absolute left-0 top-0 h-full w-full opacity-0 cursor-pointer"
                      style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity: 0 }}
                    />
                  </label>
                  {field.state.value && typeof field.state.value === "object" && (
                    <span className="ml-3 max-w-xs truncate text-sm text-muted-foreground">
                      {(field.state.value as File).name}
                    </span>
                  )}
                </div>
                {field.state.meta.errors[0] && (
                  <p className="text-sm text-red-600">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <Button variant={"create"} type="submit" disabled={isPending || !form.state.isValid} className="w-full">
            {isPending ? "Subiendo..." : "Subir imagen"}
          </Button>

          {isError && <p className="text-sm text-red-600">{String(error)}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormFotoPerfil;
