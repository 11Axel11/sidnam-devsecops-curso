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
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useEditarEDUS } from "../../hooks/enfermeria/enfermeriaHooks";
import { EDUSschema } from "../../schema/enfermeriaSchema";

export type FormActualizarEDUSProps = {
    idActual: number;
};

const FormActualizarEDUS = ({ idActual }: FormActualizarEDUSProps) => {
    const [open, setOpen] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const editarEDUS = useEditarEDUS();

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
                await editarEDUS.mutateAsync({ edus: { newPassword: value.password, id: idActual } });
                setOpen(false);
                toast.success("Contraseña de EDUS actualizada exitosamente");
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                if (err.response?.status === 400) {
                    toast.warning("No puedes hacer eso", {
                        description:
                            "La contraseña debe tener más de 6 caracteres",
                        duration: 4000,
                    });
                }
            }
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"update"}>
                    <Pencil /> Actualizar contraseña
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Actualizar contraseña de EDUS</DialogTitle>
                    <DialogDescription>
                        Ingresa la nueva contraseña de EDUS del sistema.
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
export default FormActualizarEDUS;