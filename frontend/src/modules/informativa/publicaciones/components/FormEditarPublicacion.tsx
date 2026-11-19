import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, CalendarIcon, ImageUp } from "lucide-react";
import type { FormEditarPublicacionProps } from "../types/publicaciones";
import type { UpdatePublicacion } from "../models/publicaciones";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

const FormEditarPublicacion = ({ tipo, publicacion, onSubmit }: FormEditarPublicacionProps) => {
    const [open, setOpen] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const form = useForm({
        defaultValues: {
            fecha: publicacion.fecha,
            titulo: publicacion.Titulo,
            descripcion: publicacion.Descripcion,
            imagen: undefined as File | undefined,
        },
        onSubmit: async ({ value }) => {
            setFormErrors({});

            // Build object with only changed values
            const changedValues: UpdatePublicacion = {};

            if (value.fecha !== publicacion.fecha) {
                changedValues.fecha = value.fecha;
            }

            if (value.titulo !== publicacion.Titulo) {
                changedValues.Titulo = value.titulo;
            }

            if (value.descripcion !== publicacion.Descripcion) {
                changedValues.Descripcion = value.descripcion;
            }

            if (value.imagen) {
                changedValues.imagen = value.imagen;
            }

            // Check if anything changed
            if (Object.keys(changedValues).length === 0) {
                toast.info('No se realizaron cambios');
                setOpen(false);
                return;
            }

            try {
                await onSubmit?.(publicacion.id, changedValues);
                setOpen(false);
                toast.success('Publicación actualizada exitosamente');
            } catch (error: any) {
                toast.error('Error al actualizar la publicación.', {
                    duration: 5000,
                    description: "Por favor, intente de nuevo más tarde.",
                });
            }
        },
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"update"} className="flex-1 mr-2 border border-gray-300 shadow-sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar {tipo}</DialogTitle>
                    <DialogDescription>
                        Complete el formulario para editar la información de esta publicación
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}>
                    {tipo === 'evento' && (
                        <form.Field
                            name="fecha"
                            validators={{ onChangeAsyncDebounceMs: 500 }}
                        >
                            {(field) => {
                                // Parse "YYYY-MM-DD" as local date to avoid timezone shift
                                const parseISOToLocalDate = (value: string | undefined) => {
                                    if (!value) return undefined
                                    const [y, m, d] = value.split("-").map(Number)
                                    if (!y || !m || !d) return undefined
                                    return new Date(y, m - 1, d) // local date, no UTC shift
                                }

                                const formatDateISO = (date: Date) => {
                                    const y = date.getFullYear()
                                    const m = String(date.getMonth() + 1).padStart(2, "0")
                                    const d = String(date.getDate()).padStart(2, "0")
                                    return `${y}-${m}-${d}`
                                }

                                const startOfDay = (dt: Date) => {
                                    const copy = new Date(dt)
                                    copy.setHours(0, 0, 0, 0)
                                    return copy
                                }

                                const selectedDate = parseISOToLocalDate(field.state.value)
                                const today = startOfDay(new Date())

                                return (
                                    <div className="mb-4">
                                        <Label className="font-semibold mb-2" htmlFor="fecha">Fecha:</Label>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full font-normal text-gray-600 justify-start">
                                                    <CalendarIcon className="w-4 h-4 text-black" />
                                                    {selectedDate
                                                        ? selectedDate.toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" })
                                                        : "Seleccionar fecha"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={selectedDate}
                                                    onSelect={(date) => {
                                                        if (!date) return
                                                        // Store as YYYY-MM-DD
                                                        field.handleChange(formatDateISO(date))
                                                    }}
                                                    // Allow today and future dates only
                                                    disabled={(date) => startOfDay(date) < today}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>

                                        {formErrors.fecha && (
                                            <p className="text-red-700 text-sm">{formErrors.fecha}</p>
                                        )}
                                    </div>
                                )
                            }}
                        </form.Field>
                    )}
                    <form.Field
                        name="titulo"
                        validators={{ onChangeAsyncDebounceMs: 500 }}
                        children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold mb-2" htmlFor="titulo">
                                    Título:
                                </Label>
                                <Input
                                    id="titulo"
                                    type="text"
                                    className="w-full"
                                    placeholder={publicacion.Titulo}
                                    maxLength={50}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                {formErrors.titulo && (
                                    <p className="text-red-700 text-sm">{formErrors.titulo}</p>
                                )}
                            </div>
                        )}
                    />
                    <form.Field
                        name="descripcion"
                        validators={{ onChangeAsyncDebounceMs: 500 }}
                        children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold mb-2" htmlFor="descripcion">
                                    Descripción:
                                </Label>
                                <Textarea
                                    id="descripcion"
                                    placeholder={publicacion.Descripcion}
                                    maxLength={150}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    className="border rounded p-2 w-full max-w-md break-words whitespace-pre-wrap overflow-y-auto resize-y max-h-64"
                                />
                                {formErrors.descripcion && (
                                    <p className="text-red-700 text-sm">{formErrors.descripcion}</p>
                                )}
                            </div>
                        )}
                    />
                    <form.Field
                        name="imagen"
                    >
                        {(field) => (
                            <div className="flex flex-col gap-2">
                                <Label className="block text-left">Imagen:</Label>
                                <p className="text-sm text-gray-500">Imagen actual: {publicacion.imagenUrl.split('/').pop()}</p>
                                <div className="relative flex items-center">
                                    <label htmlFor="imagen-upload" className="flex items-center gap-2 px-4 py-2 bg-white text-gray-500 text-sm rounded-lg border-1 border-gray-200 shadow cursor-pointer hover:bg-gray-100">
                                        <ImageUp className="h-4 w-4" />
                                        Cambiar imagen (opcional)
                                        <Input
                                            id="imagen-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    // Validate file size (max 5MB)
                                                    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
                                                    if (file.size > maxSize) {
                                                        toast.error('La imagen es demasiado grande. El tamaño máximo es 5MB.', {
                                                            duration: 5000,
                                                        });
                                                        e.target.value = ''; // Reset input
                                                        return;
                                                    }

                                                    // Validate file type
                                                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                                                    if (!validTypes.includes(file.type)) {
                                                        toast.error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, GIF, WebP).', {
                                                            duration: 5000,
                                                        });
                                                        e.target.value = ''; // Reset input
                                                        return;
                                                    }

                                                    field.handleChange(file);
                                                }
                                            }}
                                            className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
                                            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                        />
                                    </label>
                                    {field.state.value && typeof field.state.value === 'object' && (
                                        <span className="ml-3 text-sm text-night truncate max-w-xs">{field.state.value.name}</span>
                                    )}
                                </div>
                                {field.state.meta.errors[0] && (
                                    <p className="text-red-500 text-sm mt-1">{field.state.meta.errors[0]}</p>
                                )}
                            </div>
                        )}
                    </form.Field>
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="w-full mt-2"
                            variant={'update'}
                            disabled={form.state.isSubmitting}
                        >
                            {form.state.isSubmitting ? 'Actualizando...' : 'Actualizar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default FormEditarPublicacion;