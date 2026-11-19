import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { mensajeError, statusDe } from "@/utils/apiError";
import { CATALOGOS, NOMBRE_MAX, type CatalogoKey } from "../catalogosConfig";
import { itemCatalogoSchema } from "../schemas/catalogoSchema";
import { usePostItemCatalogo } from "../hooks/catalogosHooks";

export default function AgregarItemCatalogoDialogo({ catalogo }: { catalogo: CatalogoKey }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const crear = usePostItemCatalogo();

  const cerrar = (v: boolean) => {
    setOpen(v);
    if (!v) { setError(null); form.reset(); }
  };

  const form = useForm({
    defaultValues: { nombre: "" },
    onSubmit: async ({ value }) => {
      setError(null);
      const parsed = itemCatalogoSchema.safeParse(value);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Nombre inválido");
        return;
      }
      try {
        await crear.mutateAsync({ catalogo, nombre: parsed.data.nombre });
        toast.success("Ítem agregado correctamente");
        cerrar(false);
      } catch (err) {
        if (statusDe(err) === 409) {
          setError("Ya existe un ítem con ese nombre.");
        } else {
          setError(mensajeError(err, "No se pudo agregar el ítem."));
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogTrigger asChild>
        <Button variant="create"><Plus /> Agregar ítem</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Agregar ítem</DialogTitle>
          <DialogDescription>{CATALOGOS[catalogo].etiqueta}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
          <form.Field name="nombre" children={(field) => (
            <div className="space-y-2">
              <Label htmlFor="nombre-catalogo">Nombre</Label>
              <Input
                id="nombre-catalogo"
                value={field.state.value}
                maxLength={NOMBRE_MAX}
                autoFocus
                onChange={(e) => { setError(null); field.handleChange(e.target.value); }}
              />
              {error && <p className="text-sm text-red-700">{error}</p>}
            </div>
          )} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
            <Button type="submit" variant="create" disabled={crear.isPending}>
              {crear.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
