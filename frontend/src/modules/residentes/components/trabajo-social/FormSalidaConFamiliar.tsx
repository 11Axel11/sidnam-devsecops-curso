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
import { toast } from "sonner";
import { useParams } from "@tanstack/react-router";
import CalendarField from "@/components/CalendarField";
import { useCreateSalidaConFamiliar } from "@/modules/residentes/hooks/trabajo-social/trabajoSocialHooks";
import type { CrearRegistroSalidaConFamiliar } from "@/modules/residentes/models/expedienteResidente";
import { schemaSalidaConFamiliar } from "@/modules/residentes/schema/residentesSchema";
import { MapPinHouse } from "lucide-react";


const FormSalidaConFamiliar = () => {
    const [open, setOpen] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const { id } = useParams({ from: "/residentes/$id/trabajo-social/" });
    const createSalida = useCreateSalidaConFamiliar();

    const form = useForm({
        defaultValues: {
            parentezco: "",
            fechaSalida: "",
            horaSalida: "",
            fechaRegreso: "",
            horaRegreso: "",
            encargadoNombre: "",
            encargadoApellido1: "",
            encargadoApellido2: "",
        },
        onSubmit: async ({ value }) => {
            setFormErrors({});

            const result = schemaSalidaConFamiliar.safeParse(value);

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
                await createSalida.mutateAsync({
                    idExpediente: Number(id),
                    nota: {
                        parentesco: value.parentezco,
                        nombre_familiar: value.encargadoNombre,
                        apellido1_familiar: value.encargadoApellido1,
                        apellido2_familiar: value.encargadoApellido2 ?? "",
                        fecha_salida: value.fechaSalida,
                        hora_salida: value.horaSalida,
                        fecha_regreso: value.fechaRegreso,
                        hora_regreso: value.horaRegreso,
                    } as CrearRegistroSalidaConFamiliar,
                });

                toast.success("Registro de salida con familiar creado correctamente");
                setOpen(false);
                form.reset();

            } catch (err: any) {
                toast.error("Error en el servidor, intenta más tarde");
                setFormErrors({ server: "Error en el servidor" });
            }
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="create">
                    <MapPinHouse />Registrar salida con familiar
                </Button>
            </DialogTrigger>

            <DialogContent className="w-full sm:max-w-lg md:max-w-xl mx-auto my-6 sm:my-12">
                <DialogHeader>
                    <DialogTitle>Registro de salida con familiar</DialogTitle>
                    <DialogDescription>
                        Completa los datos de la salida y regreso con familiar.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.handleSubmit();
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <div className="py-2">
                            <div className="flex items-center">
                                <h3 className="font-semibold">Familiar</h3>
                                <hr className="flex-1 border-t ml-3" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                <form.Field name="parentezco">
                                    {(field) => (
                                        <div>
                                            <Label className="mb-1 block">Parentesco</Label>
                                            <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                                            {formErrors.parentezco && (
                                                <p className="text-red-700 text-sm mt-1">{formErrors.parentezco}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>

                                <form.Field name="encargadoNombre">
                                    {(field) => (
                                        <div>
                                            <Label className="mb-1 block">Nombre</Label>
                                            <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                                            {formErrors.encargadoNombre && (
                                                <p className="text-red-700 text-sm mt-1">{formErrors.encargadoNombre}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>

                                <form.Field name="encargadoApellido1">
                                    {(field) => (
                                        <div>
                                            <Label className="mb-1 block">Apellido 1</Label>
                                            <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                                            {formErrors.encargadoApellido1 && (
                                                <p className="text-red-700 text-sm mt-1">{formErrors.encargadoApellido1}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>

                                <form.Field name="encargadoApellido2">
                                    {(field) => (
                                        <div>
                                            <Label className="mb-1 block">Apellido 2</Label>
                                            <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                                            {formErrors.encargadoApellido2 && (
                                                <p className="text-red-700 text-sm mt-1">{formErrors.encargadoApellido2}</p>
                                            )}
                                        </div>
                                    )}
                                </form.Field>
                            </div>
                        </div>
                        <hr className="my-4" />

                        <div className="py-2">
                            <div className="flex items-center">
                                <h3 className="font-semibold">Salida</h3>
                                <hr className="flex-1 border-t ml-3" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <form.Field name="fechaSalida">
                                        {(field) => (
                                            <div>
                                                <Label className="mb-1 block">Fecha</Label>
                                                <CalendarField value={field.state.value} onChange={field.handleChange} />
                                                {formErrors.fechaSalida && (
                                                    <p className="text-red-700 text-sm mt-1">{formErrors.fechaSalida}</p>
                                                )}
                                            </div>
                                        )}
                                    </form.Field>
                                </div>

                                <div>
                                    <form.Field name="horaSalida">
                                        {(field) => (
                                            <div>
                                                <Label className="mb-1 block">Hora</Label>
                                                <Input
                                                    type="time"
                                                    step="1"
                                                    value={field.state.value}
                                                    onChange={(e) => {
                                                        const timeValue = e.target.value;
                                                        const formattedTime = timeValue.includes(':') && timeValue.split(':').length === 2
                                                            ? `${timeValue}:00`
                                                            : timeValue;
                                                        field.handleChange(formattedTime);
                                                    }}
                                                />
                                                {formErrors.horaSalida && (
                                                    <p className="text-red-700 text-sm mt-1">{formErrors.horaSalida}</p>
                                                )}
                                            </div>
                                        )}
                                    </form.Field>
                                </div>
                            </div>
                        </div>
                        <hr className="my-4" />

                        <div className="py-2">
                            <div className="flex items-center">
                                <h3 className="font-semibold">Regreso</h3>
                                <hr className="flex-1 border-t ml-3" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <form.Field name="fechaRegreso">
                                        {(field) => (
                                            <div>
                                                <Label className="mb-1 block">Fecha</Label>
                                                <CalendarField value={field.state.value} onChange={field.handleChange} />
                                                {formErrors.fechaRegreso && (
                                                    <p className="text-red-700 text-sm mt-1">{formErrors.fechaRegreso}</p>
                                                )}
                                            </div>
                                        )}
                                    </form.Field>
                                </div>

                                <div>
                                    <form.Field name="horaRegreso">
                                        {(field) => (
                                            <div>
                                                <Label className="mb-1 block">Hora</Label>
                                                <Input
                                                    type="time"
                                                    step="1"
                                                    value={field.state.value}
                                                    onChange={(e) => {
                                                        const timeValue = e.target.value;
                                                        const formattedTime = timeValue.includes(':') && timeValue.split(':').length === 2
                                                            ? `${timeValue}:00`
                                                            : timeValue;
                                                        field.handleChange(formattedTime);
                                                    }}
                                                />
                                                {formErrors.horaRegreso && (
                                                    <p className="text-red-700 text-sm mt-1">{formErrors.horaRegreso}</p>
                                                )}
                                            </div>
                                        )}
                                    </form.Field>
                                </div>
                            </div>
                        </div>
                    </div>

                    {formErrors.server && (
                        <p className="text-red-700 text-sm text-center">{formErrors.server}</p>
                    )}

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
                        <Button type="submit" className="w-full sm:w-auto" variant="create" disabled={form.state.isSubmitting}>
                            {form.state.isSubmitting ? "Guardando..." : "Guardar"}
                        </Button>
                        <DialogClose asChild>
                            <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
                        </DialogClose>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default FormSalidaConFamiliar;
