/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEditarRol } from "../hooks/rolesHooks";
import { toast } from "sonner";
import {
  editarRolSchema,
  ROLE_DESCRIPTION_MAX_LENGTH,
  ROLE_NAME_MAX_LENGTH,
} from "../schemas/rolesSchemas";
import type { Rol } from "../models/roles";
import { Pencil } from "lucide-react";

type EditarRolDialogProps = {
  rol: Rol; // { id_rol, nombre, descripcion, estado }
  trigger?: React.ReactNode; // opcional para personalizar el botón de apertura
};

const FormEditarRol = ({ rol, trigger }: EditarRolDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const limitTextLength = (value: string, maxLength: number) => value.slice(0, maxLength);

  const editarRolMutation = useEditarRol();

  const form = useForm({
    defaultValues: {
      nombre: rol.nombre ?? "",
      descripcion: rol.descripcion ?? "",
    },
    onSubmit: async ({ value }) => {
      setFormErrors({});

      const parsed = editarRolSchema.safeParse(value);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.issues.forEach((err) => {
          const field = String(err.path[0] ?? "form");
          fieldErrors[field] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      try {
        await editarRolMutation.mutateAsync({
          idRol: Number(rol.id_rol),
          payload: parsed.data, // { nombre, descripcion }
        });
        toast.success("Rol actualizado correctamente");
        setOpen(false);
      } catch (err: any) {
        if (err?.response?.status === 400) {
          setFormErrors({
            server: err?.response?.data?.message ?? "No se pudo actualizar el rol",
          });
        } else {
          toast.error(err?.response?.data?.message ?? "No se pudo actualizar el rol");
          setFormErrors({
            server: "No se pudieron guardar los cambios. Intenta de nuevo.",
          });
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="update">
            <Pencil /> Editar rol
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar rol</DialogTitle>
          <DialogDescription>
            Actualiza el nombre y la descripción del rol.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="w-full"
        >
          {/* Nombre */}
          {form.Field({
            name: "nombre",
            children: (field) => (
              <div className="mb-4">
                <Label className="mb-1" htmlFor="nombre">
                  Nombre
                </Label>
                <Input
                  id="nombre"
                  maxLength={ROLE_NAME_MAX_LENGTH}
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(limitTextLength(e.target.value, ROLE_NAME_MAX_LENGTH))
                  }
                  placeholder="Nombre del rol"
                />
                {formErrors.nombre && (
                  <p className="mt-1 text-sm text-red-700 break-words">{formErrors.nombre}</p>
                )}
              </div>
            ),
          })}

          {/* Descripción */}
          {form.Field({
            name: "descripcion",
            children: (field) => (
              <div className="mb-2">
                <Label className="mb-1" htmlFor="descripcion">
                  Descripción (opcional)
                </Label>
                <Textarea
                  id="descripcion"
                  maxLength={ROLE_DESCRIPTION_MAX_LENGTH}
                  value={field.state.value ?? ""}
                  onChange={(e) =>
                    field.handleChange(
                      limitTextLength(e.target.value, ROLE_DESCRIPTION_MAX_LENGTH)
                    )
                  }
                  placeholder="Breve descripción del rol…"
                  rows={4}
                />
                {formErrors.descripcion && (
                  <p className="mt-1 text-sm text-red-700 break-words">
                    {formErrors.descripcion}
                  </p>
                )}
              </div>
            ),
          })}

          {formErrors.server && (
            <p className="mt-2 text-center text-sm text-red-700 break-words">
              {formErrors.server}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="submit" variant="create" disabled={editarRolMutation.isPending}>
              {editarRolMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormEditarRol;
