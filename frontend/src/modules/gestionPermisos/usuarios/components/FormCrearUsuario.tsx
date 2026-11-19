import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { useCreateUsuario } from "../hooks/usuariosHooks";
import { useGetRolesActivos } from "@/modules/gestionPermisos/roles/hooks/rolesHooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Agregamos Eye y EyeOff
import { Plus, Eye, EyeOff } from "lucide-react";
import { crearUsuarioSchema } from "../schemas/usuarioSchema";

const FormCrearUsuario = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Estado para la visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false);

  const crearUsuario = useCreateUsuario();
  const { Roles, loadingRoles } = useGetRolesActivos();

  const form = useForm({
    defaultValues: {
      cedula: "",
      name: "",
      apellido1: "",
      apellido2: "",
      email: "",
      password: "",
      idRol: 0,
    },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      const result = crearUsuarioSchema.safeParse(value);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const path = err.path.join(".");
          fieldErrors[path] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      try {
        const { ...usuario } = result.data;
        await crearUsuario.mutateAsync({
          usuario,
        });
        setOpen(false);
        form.reset();
      } catch (err: any) {
        setFormErrors({
          server:
            err?.response?.data?.message ||
            "Error en el servidor, por favor intenta más tarde",
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
          setFormErrors({});
          form.reset();
          setShowPassword(false); // Resetear visibilidad al cerrar
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="hover:cursor-pointer" variant="create">
          <Plus />
          Crear usuario
        </Button>
      </DialogTrigger>

      {/* Ajuste de ancho responsivo y altura máxima */}
      <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[90vh] sm:h-auto flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>
            Registra un nuevo usuario del sistema y asigna su rol.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-4 py-2"
          >
            {/* Grid Responsivo: 1 columna en móvil, 2 en tablets/desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field name="cedula">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="cedula">Cédula</Label>
                    <Input
                      id="cedula"
                      type="text"
                      inputMode="numeric"
                      value={String(field.state.value ?? "")}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Ej. 401234567"
                    />
                    {formErrors["cedula"] && (
                      <p className="text-red-700 text-sm">{formErrors["cedula"]}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      type="text"
                      value={String(field.state.value ?? "")}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Nombre"
                    />
                    {formErrors["name"] && (
                      <p className="text-red-700 text-sm">{formErrors["name"]}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="apellido1">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="apellido1">Primer apellido</Label>
                    <Input
                      id="apellido1"
                      type="text"
                      value={String(field.state.value ?? "")}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Primer apellido"
                    />
                    {formErrors["apellido1"] && (
                      <p className="text-red-700 text-sm">{formErrors["apellido1"]}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="apellido2">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="apellido2">Segundo apellido</Label>
                    <Input
                      id="apellido2"
                      type="text"
                      value={String(field.state.value ?? "")}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Segundo apellido"
                    />
                    {formErrors["apellido2"] && (
                      <p className="text-red-700 text-sm">{formErrors["apellido2"]}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={String(field.state.value ?? "")}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="usuario@example.com"
                    />
                    {formErrors["email"] && (
                      <p className="text-red-700 text-sm">{formErrors["email"]}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="pr-10"
                        value={String(field.state.value ?? "")}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formErrors["password"] && (
                      <p className="text-red-700 text-sm">{formErrors["password"]}</p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="idRol">
              {(field) => (
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select
                    value={field.state.value ? String(field.state.value) : ""}
                    onValueChange={(v) => field.handleChange(Number(v))}
                    disabled={loadingRoles}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingRoles ? "Cargando roles..." : "Selecciona un rol"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(Roles ?? []).map((r) => (
                        <SelectItem key={r.id_rol} value={String(r.id_rol)}>
                          {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors["idRol"] && (
                    <p className="text-red-700 text-sm">{formErrors["idRol"]}</p>
                  )}
                </div>
              )}
            </form.Field>

            {formErrors.server && (
              <p className="text-red-700 text-sm text-center font-medium bg-red-50 p-2 rounded">
                {formErrors.server}
              </p>
            )}

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
              <DialogClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
              </DialogClose>
              <Button
                variant="approve"
                type="submit"
                className="w-full sm:w-auto"
                disabled={crearUsuario.isPending}
              >
                {crearUsuario.isPending ? "Creando..." : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormCrearUsuario;