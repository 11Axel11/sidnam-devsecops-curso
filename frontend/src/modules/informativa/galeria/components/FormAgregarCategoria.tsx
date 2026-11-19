import { useForm } from "@tanstack/react-form";
import { useCreateCategoria } from "../hooks/galeriaHooks";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { categoriaSchema } from "@/schemas/schemaGaleria";

const FormAgregarCategoria = () => {
  const [open, setOpen] = useState(false);
  const { mutate, isPending, isError, error } = useCreateCategoria();

  const form = useForm({
    defaultValues: {
        nombre: "",
        descripcion: "",
    },
    onSubmit: async ({ value }) => {
        try {
            const categoria = categoriaSchema.parse(value);
            mutate(categoria, {
                onSuccess: () => {
                    setOpen(false);
                    toast.success("Categoria creada exitosamente");
                    form.reset();
                },
            });
        } catch (error) {
            toast.error("Error al crear la categoría");
        }
    },
});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={"create"} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Crear categoria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear categoria</DialogTitle>
          <DialogDescription>
            Rellene los campos para crear una categoria
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="nombre">
            {(field) => (
              <div>
                <Label className="block mb-1 text-left">Nombre de la categoría</Label>
                <Input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  maxLength={20}
                  className="border rounded p-2 w-full"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-red-500 text-sm">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="descripcion">
            {(field) => (
              <div>
                <Label className="block mb-1 text-left">Descripción</Label>
                <Textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  maxLength={70}
                  className="border rounded p-2 w-full max-w-md break-words whitespace-pre-wrap overflow-y-auto resize-y max-h-64"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-red-500 text-sm">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>
          <Button
            type="submit"
            variant= {'create'}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? "Creando..." : "Crear Categoría"}
          </Button>

          {isError && <p className="text-red-500">❌ {String(error)}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormAgregarCategoria;