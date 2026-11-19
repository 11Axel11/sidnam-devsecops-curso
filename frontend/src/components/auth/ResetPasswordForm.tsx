import { resetPasswordSchema } from "@/schemas/schemaLogin";
import { Label } from "@radix-ui/react-label";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Input } from "../ui/input";
import { ArrowLeft } from "lucide-react";
import { useResetPassword } from "@/hooks/login";

const ResetPasswordForm = () => {
  const navigate = useNavigate();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const resetPasswordMutation = useResetPassword();

  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState(null, "", cleanUrl);
    }
  }, []);

  const form = useForm({
    defaultValues: { password: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});

      const result = resetPasswordSchema.safeParse(value);

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      if (!token) {
        setFormErrors({
          server: "Token no válido o ausente en la URL",
        });
        return;
      }

      try {
        await resetPasswordMutation.mutateAsync({
          token,
          password: value.password,
        });
        navigate({ to: "/login" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        const message = err?.response?.data?.message;

        if (message === "Email confirmation token expired") {
          setFormErrors({
            server: "El enlace ha expirado. Solicita uno nuevo.",
          });
        } else {
          setFormErrors({
            server: "Error al reestablecer la contraseña. Intenta más tarde.",
          });
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
      <Card className="w-[400px]">
        <CardHeader>
          <Link to="/login" className="flex gap-2 items-center mb-4">
            <ArrowLeft size={20} /> Regresar
          </Link>
          <CardTitle>Reestablece tu contraseña</CardTitle>
        </CardHeader>

        <CardContent>
          <form.Field
            name="password"
            validators={{
              onChangeAsyncDebounceMs: 500,
            }}
            children={(field) => (
              <div className="mb-4">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.password && (
                  <p className="text-red-700 text-sm">{formErrors.password}</p>
                )}
              </div>
            )}
          />

          {formErrors.credentials && (
            <p className="text-red-700 text-sm text-center">
              {formErrors.credentials}
            </p>
          )}
          {formErrors.server && (
            <p className="text-red-700 text-sm text-center">
              {formErrors.server}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-4">
          <Button onClick={form.handleSubmit} className="flex-1" type="submit">
            Reestablecer
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default ResetPasswordForm;
