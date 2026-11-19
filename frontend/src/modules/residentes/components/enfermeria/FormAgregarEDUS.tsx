import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { Stethoscope } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { useCreateEDUS } from "../../hooks/enfermeria/enfermeriaHooks";
import { EDUSschema } from "../../schema/enfermeriaSchema";

const FormAgregarEDUS = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const agregarEDUS = useCreateEDUS();

  const form = useForm({
    defaultValues: { password: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});

      const result = EDUSschema.safeParse(value);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      try {
        await agregarEDUS.mutateAsync({ edus: { password: value.password } });
        setOpen(false);
        toast.success("Contraseña de EDUS agregada exitosamente");
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.message ?? "Error del servidor";
          // show backend message and also render it in the form area
          setFormErrors((prev) => ({ ...prev, server: String(message) }));
          toast.warning(String(message), { duration: 4000 });
        } else {
          setFormErrors((prev) => ({ ...prev, server: "Error inesperado" }));
          toast.error("Error inesperado");
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="flex hover:cursor-pointer items-center gap-2">
          <Stethoscope /> Agregar contraseña de EDUS
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Agregar nueva contraseña de EDUS</DialogTitle>
          <DialogDescription>
            Ingresa la nueva contraseña de EDUS del sistema.
            Solo puedes hacer esto una vez.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="password"
            children={(field) => (
              <div className="mb-4">
                <Label className="mb-2" htmlFor="password">Contraseña: </Label>
                <Input
                  id="password"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.password && (
                  <p className="text-red-700 text-sm">{formErrors.password}</p>
                )}
              </div>
            )}
          />
          <DialogDescription className="text-justify mb-4">Si deseas actualizar la contraseña de EDUS registrada en SIDNAM, puedes hacerlo desde el apartado de Residentes.</DialogDescription>

          {formErrors.server && (
            <p className="text-red-700 text-sm text-center mb-2">
              {formErrors.server}
            </p>
          )}

          <DialogFooter>
            <Button type="submit"
              variant={"create"}>Guardar</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default FormAgregarEDUS;