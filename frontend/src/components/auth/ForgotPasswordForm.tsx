import { forgotPasswordSchema } from "@/schemas/schemaLogin";
import { Label } from "@radix-ui/react-label";
import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "../ui/card";
import { Input } from "../ui/input";
import { ArrowLeft } from "lucide-react";
import { useForgotPassword } from "@/hooks/login";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../animate-ui/radix/accordion";

const ForgotPasswordForm = () => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const forgotPasswordMutation = useForgotPassword();
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      setEmailSent(false);

      const result = forgotPasswordSchema.safeParse(value);
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
        await forgotPasswordMutation.mutateAsync(value.email);
        toast.success("Correo enviado", {
          description:
            "Si este correo está vinculado a una cuenta en SIDNAM, podrás restablecer tu contraseña.",
          duration: 4000,
        });
        setEmailSent(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      } catch (err: any) {
        setFormErrors({
          server:
            "Error al reestablecer la contraseña. El servidor no está disponible, intenta de nuevo más tarde.",
        });
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
          <CardDescription>
            Ingresa tu correo electrónico para continuar
          </CardDescription>
        </CardHeader>

        <CardContent>
          {form.Field({
            name: "email",
            children: (field) => (
              <div className="mb-4">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.email && (
                  <p className="text-red-700 text-sm">{formErrors.email}</p>
                )}
              </div>
            ),
          })}

          {emailSent && (
            <Accordion type="single" collapsible>
              <AccordionItem value="resend-info" >
                <AccordionTrigger className="hover:cursor-pointer">¿No recibiste un correo?</AccordionTrigger>
                <AccordionContent>
                  Verifica que el correo electrónico
                  que ingresaste está asociado a una cuenta en SIDNAM, revisa tu
                  carpeta de spam o intenta de nuevo.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {formErrors.server && (
            <p className="text-red-700 text-sm text-center">
              {formErrors.server}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-4">
          <Button
            className="flex-1"
            type="submit"
            disabled={forgotPasswordMutation.isPending}
          >
            {forgotPasswordMutation.isPending ? "Enviando..." : "Reestablecer"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default ForgotPasswordForm;
