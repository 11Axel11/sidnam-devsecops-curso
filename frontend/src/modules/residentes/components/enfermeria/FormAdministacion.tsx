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
import { useGetTurnos, useCreateAdministracion } from "../../hooks/enfermeria/enfermeriaHooks";
import { useParams } from "@tanstack/react-router";
import type { CrearAdministracion } from "../../models/enfermeria";
import type { FormAdministracionProps } from "../../types/enfermeriaProps";
import { toast } from "sonner";

const FormAdministracion = ({
    medicamentoSeleccionado,
    onCancel,
}: FormAdministracionProps) => {
    const { id: expedienteId } = useParams({ from: "/residentes/$id/enfermeria/" });
    const { data: unidadesMedida } = useGetUnidadesMedida(3);
    const { turnos, loadingTurnos } = useGetTurnos();
    const agregarAdministracion = useCreateAdministracion();

    const form = useForm({
        defaultValues: {
            cantidad: "",
            id_unidadMedida: "",
            turno: "",
        },
        onSubmit: async ({ value }) => {
            try {
                const data: CrearAdministracion = {
                    turno: value.turno as "AM" | "PM" | "MD" | "MN",
                    id_medicamento: medicamentoSeleccionado.id,
                    cantidad: parseFloat(value.cantidad.toString()) || 0,
                    id_unidadMedida: parseInt(value.id_unidadMedida.toString()) || 0,
                };

                await agregarAdministracion.mutateAsync({
                    idExpediente: Number(expedienteId),
                    ...data,
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
                    <h3 className="text-lg font-semibold">Agregar Administración</h3>
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
                    {/* Campo Cantidad */}
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

                    {/* Campo Unidad de Medida */}
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
                </div>

                {/* Campo Turno */}
                <form.Field
                    name="turno"
                    validators={{
                        onChange: ({ value }) => {
                            if (!value) {
                                return 'Selecciona un turno';
                            }
                            return undefined;
                        },
                    }}
                >
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Turno</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={field.handleChange}
                                disabled={loadingTurnos}
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={loadingTurnos ? "Cargando turnos..." : "Seleccionar turno"}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {turnos?.map((t) => (
                                        <SelectItem
                                            key={t.id}
                                            value={t.nombre}
                                        >
                                            {t.nombre}
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
                        variant={"create"}
                        disabled={!form.state.canSubmit || form.state.isSubmitting}
                        className="flex-1"
                    >
                        {form.state.isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Agregar Administración"
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

export default FormAdministracion;