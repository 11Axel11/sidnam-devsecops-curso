import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { useEditarPerfil } from "@/modules/gestionPermisos/usuarios/hooks/usuariosHooks";
import { editarPerfilSchema } from "../schemas/usuarioSchema";
import type { EditarPerfilDialogProps } from "../types/userType";
import FormFotoPerfil from "./FormFotoPerfil";

const EditarPerfilDialogForm = ({ idUsuario, initialValues }: EditarPerfilDialogProps) => {

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const editarPerfilMutation = useEditarPerfil();

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setFormErrors({});
      const parsed = editarPerfilSchema.safeParse(value);
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
        await editarPerfilMutation.mutateAsync({
          idUsuario,
          payload: parsed.data,
        });
      } catch {
        setFormErrors({
          server: "No se pudieron guardar los cambios. Intenta de nuevo.",
        });
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="w-full max-w-xl"
    >
      <div className="mb-5 space-y-1">
        <h3 className="text-lg font-semibold">Editar perfil</h3>
        <p className="text-sm text-muted-foreground">
          Actualiza los datos de tu perfil.
        </p>
      </div>

      {form.Field({
        name: "cedula",
        children: (field) => (
          <div className="mb-4">
            <Label className="mb-1"  htmlFor="cedula">Cédula</Label>
            <Input
              id="cedula"
              inputMode="numeric"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="123456789"
            />
            {formErrors.cedula && (
              <p className="mt-1 text-sm text-red-700">{formErrors.cedula}</p>
            )}
          </div>
        ),
      })}

      {/* Email */}
      {form.Field({
        name: "email",
        children: (field) => (
          <div className="mb-4">
            <Label className="mb-1" htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="usuario@example.com"
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-700">{formErrors.email}</p>
            )}
          </div>
        ),
      })}

      {form.Field({
        name: "name",
        children: (field) => (
          <div className="mb-4">
            <Label className="mb-1"  htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Juan"
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-700">{formErrors.name}</p>
            )}
          </div>
        ),
      })}

      {form.Field({
        name: "apellido1",
        children: (field) => (
          <div className="mb-4">
            <Label className="mb-1" htmlFor="apellido1">Primer apellido</Label>
            <Input
              id="apellido1"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Pérez"
            />
            {formErrors.apellido1 && (
              <p className="mt-1 text-sm text-red-700">{formErrors.apellido1}</p>
            )}
          </div>
        ),
      })}

      {form.Field({
        name: "apellido2",
        children: (field) => (
          <div className="mb-4">
            <Label  className="mb-1" htmlFor="apellido2">Segundo apellido (opcional)</Label>
            <Input
              id="apellido2"
              value={field.state.value ?? ""}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Gómez"
            />
            {formErrors.apellido2 && (
              <p className="mt-1 text-sm text-red-700">{formErrors.apellido2}</p>
            )}
          </div>
        ),
      })}

          <div className="mb-4">
              <Label>Imagen de perfil</Label>
              <div className="mt-2">
                  <FormFotoPerfil idUsuario={idUsuario} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                  La imagen se guarda por separado de los datos del perfil.
              </p>
          </div>

      {formErrors.server && (
        <p className="mb-2 text-center text-sm text-red-700">
          {formErrors.server}
        </p>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button type="submit" variant="create" disabled={editarPerfilMutation.isPending}>
          {editarPerfilMutation.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
      </div>
    </form>
  );
};

export default EditarPerfilDialogForm;
