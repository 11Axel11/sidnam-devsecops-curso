import { Label } from "@radix-ui/react-label";
import { Button } from "../ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Input } from "../ui/input";
import { useForm } from "@tanstack/react-form";
import { useLogin } from "@/hooks/login";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { loginSchema } from "@/schemas/schemaLogin";
// Importamos los íconos del ojo
import { Eye, EyeOff } from "lucide-react";

export const LoginForm = () => {
  const loginMutation = useLogin();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // NUEVO: Estado para controlar la visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: { cedula: "", password: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      const result = loginSchema.safeParse(value);

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
        await loginMutation.mutateAsync(value);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setFormErrors({ credentials: "Credenciales incorrectas" });
        } else if (err.response?.status === 403) {
          setFormErrors({
            credentials: "Ese usuario está inactivo o no existe. Contacta a tu administrador si crees que fue un error.",
          });
        } else {
          setFormErrors({ server: "Error en el servidor, por favor intenta más tarde" });
        }
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <Card className="w-full max-w-sm md:w-[400px] md:max-w-none">
        <CardHeader>
          <CardTitle>Bienvenido</CardTitle>
          <CardDescription>
            Inicia sesión en <span className="font-open-sans font-bold">SIDNAM</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form.Field
            name="cedula"
            children={(field) => (
              <div className="mb-4">
                <Label htmlFor="cedula">Cédula</Label>
                <Input
                  id="cedula"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.cedula && (
                  <p className="text-red-700 text-sm">{formErrors.cedula}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="password"
            children={(field) => (
              <div className="mb-4">
                <Label htmlFor="password">Contraseña</Label>
                {/* Contenedor relativo para posicionar el botón del ojo */}
                <div className="relative">
                  <Input
                    id="password"
                    // Dinámico: cambia entre 'password' y 'text'
                    type={showPassword ? "text" : "password"}
                    className="pr-10" // Padding a la derecha para que el texto no choque con el icono
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1} // Para que no interfiera con la navegación por teclado del formulario
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-700 text-sm">{formErrors.password}</p>
                )}
              </div>
            )}
          />

          {formErrors.credentials && (
            <p className="text-red-700 text-sm text-center mb-2">
              {formErrors.credentials}
            </p>
          )}
          {formErrors.server && (
            <p className="text-red-700 text-sm text-center mb-2">
              {formErrors.server}
            </p>
          )}

          <Link to="/forgotpassword">
            <span className="text-gray-700 hover:text-amaranthPinkDark text-sm">
              Olvidé mi contraseña
            </span>
          </Link>
        </CardContent>

        <CardFooter className="flex items-center gap-4">
          <Button className="flex-1" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Iniciando..." : "Iniciar sesión"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};