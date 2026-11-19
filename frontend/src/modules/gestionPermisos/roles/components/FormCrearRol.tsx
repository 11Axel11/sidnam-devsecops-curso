import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { useCreateRol, } from "../hooks/rolesHooks";
import {
  crearRolSchema,
  ROLE_DESCRIPTION_MAX_LENGTH,
  ROLE_NAME_MAX_LENGTH,
} from "../schemas/rolesSchemas";
import FormAsignarPermisos from "./FormAsignarPermisos";
import { Plus } from "lucide-react";

type Step = "create" | "assign";

const FormCrearRol = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("create");
  const [createdRolId, setCreatedRolId] = useState<number | null>(null);

  const crearRol = useCreateRol();
  const limitTextLength = (value: string, maxLength: number) => value.slice(0, maxLength);

  const form = useForm({
    defaultValues: { nombre: "", descripcion: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      const result = crearRolSchema.safeParse(value);
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
        const rolCreado = await crearRol.mutateAsync({
          rol: { nombre: value.nombre, descripcion: value.descripcion },
        });
        setCreatedRolId(rolCreado.id_rol);
        setStep("assign");
      } catch (err: any) {
        setFormErrors({ 
          server: err.response?.data?.message || "Error en el servidor, por favor intenta más tarde" 
        });
      }
    },
  });


  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setStep("create");
          setCreatedRolId(null);
          setFormErrors({});
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="hover:cursor-pointer" variant="create">
          <Plus /> Crear rol
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl overflow-hidden">
        {step === "create" && (
          <>
            <DialogHeader>
              <DialogTitle>Crear un rol de usuario</DialogTitle>
              <DialogDescription>
                Podrás asignar permisos al rol creado para definir las acciones que podrán hacer sus usuarios.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
              className="space-y-4"
            >
              <div>
                <form.Field name="nombre" validators={{ onChangeAsyncDebounceMs: 500 }}>
                  {(field) => (
                    <div className="mb-4">
                      <Label className="font-semibold mb-2" htmlFor="nombre">Nombre:</Label>
                      <Input
                        id="nombre"
                        type="text"
                        maxLength={ROLE_NAME_MAX_LENGTH}
                        value={field.state.value}
                        onChange={(e) =>
                          field.handleChange(limitTextLength(e.target.value, ROLE_NAME_MAX_LENGTH))
                        }
                      />
                      {formErrors.nombre && (
                        <p className="text-red-700 text-sm break-words">{formErrors.nombre}</p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              <div>
                <form.Field name="descripcion" validators={{ onChangeAsyncDebounceMs: 500 }}>
                  {(field) => (
                    <div className="mb-4">
                      <Label className="font-semibold mb-2" htmlFor="descripcion">Descripción:</Label>
                      <Input
                        id="descripcion"
                        type="text"
                        maxLength={ROLE_DESCRIPTION_MAX_LENGTH}
                        value={field.state.value}
                        onChange={(e) =>
                          field.handleChange(
                            limitTextLength(e.target.value, ROLE_DESCRIPTION_MAX_LENGTH)
                          )
                        }
                      />
                      {formErrors.descripcion && (
                        <p className="text-red-700 text-sm break-words">{formErrors.descripcion}</p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              {formErrors.server && (
                <p className="text-red-700 text-sm text-center break-words">{formErrors.server}</p>
              )}

              <DialogFooter>
                <Button variant="approve" type="submit" disabled={crearRol.isPending}>
                  {crearRol.isPending ? "Creando..." : "Crear"}
                </Button>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              </DialogFooter>
            </form>
          </>
        )}
        {step === "assign" && createdRolId && (
          <FormAsignarPermisos
            rolId={createdRolId}
            rolNombre={form.state.values.nombre}
            onSuccess={() => {
              setOpen(false);
              setStep("create");
              setCreatedRolId(null);
              form.reset();
            }}
            onCancel={() => {
              setStep("create");
              setCreatedRolId(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FormCrearRol;
