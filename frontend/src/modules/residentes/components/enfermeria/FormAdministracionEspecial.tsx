import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft } from "lucide-react";
import { useGetUnidadesMedida } from "@/hooks/use-unidadesMedida";
import { useCreateAdministracionEspecial } from "../../hooks/enfermeria/enfermeriaHooks";
import { useParams } from "@tanstack/react-router";
import type { CrearAdministracionesEspeciales } from "../../models/enfermeria";
import { toast } from "sonner";
import type { FormAdministracionEspecialProps } from "../../types/enfermeriaProps";

const FormAdministracionEspecial = ({
    medicamentoSeleccionado,
    onCancel,
}: FormAdministracionEspecialProps) => {
    const { id: expedienteId } = useParams({ from: "/residentes/$id/enfermeria/" });
    const { data: unidadesMedida } = useGetUnidadesMedida(3);
    const agregarAdministracionEspecial = useCreateAdministracionEspecial();

    const form = useForm({
        defaultValues: {
            hora: "",
            cantidad: "",
            id_unidadMedida: "",
        },
        onSubmit: async ({ value }) => {
            try {
                const data: CrearAdministracionesEspeciales = {
                    hora: value.hora,
                    cantidad: value.cantidad,
                    id_medicamento: medicamentoSeleccionado.id.toString(),
                    id_unidadMedida: value.id_unidadMedida,
                };

                await agregarAdministracionEspecial.mutateAsync({
                    idExpediente: Number(expedienteId),
                    hora: data.hora,
                    cantidad: data.cantidad,
                    id_medicamento: data.id_medicamento,
                    id_unidadMedida: data.id_unidadMedida,
                });

                toast.success("Administración asignada exitosamente.", {
                    description: "Ya puedes visualizar este expediente y sus cambios.",
                    duration: 4000,
                });

                onCancel();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                if (error.response?.status === 400) {
                    toast.warning("No puedes hacer eso", {
                        description: error.response?.data?.message || "Ya existe.",
                        duration: 4000,
                    });
                }

            }
        },
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    className="p-1 h-8 w-8"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h3 className="text-lg font-semibold">Agregar Administración Especial</h3>
                    <p className="text-sm text-muted-foreground">
                        Medicamento: <span className="font-medium">{medicamentoSeleccionado.nombre}</span>
                    </p>
                </div>
            </div>

            <Separator />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
                className="space-y-4"
            >
                <div className="grid grid-cols-2 gap-4">
                    <form.Field
                        name="hora"
                        validators={{
                            onChange: ({ value }) => {
                                if (!value) {
                                    return 'La hora es requerida';
                                }
                                const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
                                if (!timeRegex.test(value)) {
                                    return 'Formato de hora inválido (HH:MM:SS)';
                                }
                                return undefined;
                            },
                        }}
                    >
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Hora</Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type="time"
                                    step="1"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => {
                                        // Convertir HH:MM a HH:MM:SS
                                        const timeValue = e.target.value;
                                        const formattedTime = timeValue.includes(':') && timeValue.split(':').length === 2
                                            ? `${timeValue}:00`
                                            : timeValue;
                                        field.handleChange(formattedTime);
                                    }}
                                    placeholder="HH:MM:SS"
                                />
                                {field.state.meta.errors && (
                                    <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
                                )}
                            </div>
                        )}
                    </form.Field>

                    <form.Field
                        name="cantidad"
                        validators={{
                            onChange: ({ value }) => {
                                const numValue = parseFloat(value.toString());
                                if (!value || isNaN(numValue) || numValue <= 0) {
                                    return 'La cantidad debe ser mayor a 0';
                                }
                                return undefined;
                            },
                        }}
                    >
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Cantidad</Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    placeholder="Ej: 5.5"
                                />
                                {field.state.meta.errors && (
                                    <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
                                )}
                            </div>
                        )}
                    </form.Field>
                </div>

                <form.Field
                    name="id_unidadMedida"
                    validators={{
                        onChange: ({ value }) => {
                            if (!value || value === "" || value === "0") {
                                return 'Selecciona una unidad de medida';
                            }
                            return undefined;
                        },
                    }}
                >
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Unidad de Medida</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={field.handleChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar unidad" />
                                </SelectTrigger>
                                <SelectContent>
                                    {unidadesMedida?.map((unidad) => (
                                        <SelectItem
                                            key={unidad.id_unidad}
                                            value={unidad.id_unidad.toString()}
                                        >
                                            {unidad.nombre} ({unidad.abreviatura})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {field.state.meta.errors && (
                                <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
                            )}
                        </div>
                    )}
                </form.Field>

                <div className="flex gap-2 pt-4">
                    <Button
                        type="submit"
                        disabled={!form.state.canSubmit || form.state.isSubmitting}
                        className="flex-1"
                        variant={"create"}
                    >
                        {form.state.isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Agregar Administración Especial"
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={form.state.isSubmitting}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default FormAdministracionEspecial;