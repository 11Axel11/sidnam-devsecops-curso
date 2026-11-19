import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { forgotPasswordSchema } from "@/schemas/schemaLogin";
import { useForgotPassword } from "@/hooks/login";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/animate-ui/radix/accordion";

const FormCambiarContrasena = () => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [emailSent, setEmailSent] = useState(false);
  const forgotPasswordMutation = useForgotPassword();

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
      } catch {
        setFormErrors({
          server:
            "Error al reestablecer la contraseña. El servidor no está disponible, intenta de nuevo más tarde.",
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
      className="w-full max-w-md"
    >
      <div className="mb-5 space-y-1">
        <h3 className="text-lg font-semibold">Reestablecer contraseña</h3>
        <p className="text-sm text-muted-foreground">
          Ingresa tu correo electrónico para continuar.
        </p>
      </div>

      {form.Field({
        name: "email",
        children: (field) => (
          <div className="mb-4">
            <Label className="block mb-2 text-left" htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              autoFocus
            />
            {formErrors.email && (
              <p className="text-sm text-red-700 mt-1">{formErrors.email}</p>
            )}
          </div>
        ),
      })}

      {emailSent && (
        <Accordion type="single" collapsible className="mb-2">
          <AccordionItem value="resend-info">
            <AccordionTrigger className="hover:cursor-pointer">
              ¿No recibiste un correo?
            </AccordionTrigger>
            <AccordionContent>
              Verifica que el correo ingresado está asociado a una cuenta en
              SIDNAM, revisa tu carpeta de spam o intenta de nuevo.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {formErrors.server && (
        <p className="text-sm text-center text-red-700 mb-2">
          {formErrors.server}
        </p>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant={"create"} type="submit" disabled={forgotPasswordMutation.isPending}>
          {forgotPasswordMutation.isPending ? "Enviando..." : "Reestablecer"}
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

export default FormCambiarContrasena;
