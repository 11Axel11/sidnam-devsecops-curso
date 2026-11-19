import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ImageUp, Plus } from "lucide-react"
import type { FormAgregarPublicacionProps } from "../types/publicaciones"
import { useForm } from "@tanstack/react-form"
import { publicacionSchema } from "@/schemas/schemaPublicaciones"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"

const FormAgregarPublicacion = ({ tipo, onSubmit }: FormAgregarPublicacionProps) => {
    const [open, setOpen] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const fechaActual = new Date().toISOString().split('T')[0];

    const titulosPH = (tipo: string) => {
        switch (tipo) {
            case 'solicitud de donación':
                return 'Ej. Pañales'
            case 'proyecto':
                return 'Ej. Mejoras en infraestructura'
            case 'evento':
                return 'Ej. Bingo'
            default:
                return ''
        }
    }

    const descripcionesPH = (tipo: string) => {
        switch (tipo) {
            case 'solicitud de donación':
                return 'Ej. Estamos requiriendo pañales para adultos talla M'
            case 'proyecto':
                return 'Ej. Estamos renovando áreas comunes para mayor comodidad de los residentes'
            case 'evento':
                return 'Ej. Bingo a beneficio de los residentes del hogar'
            default:
                return ''
        }
    }

    const form = useForm({
        defaultValues: {
            fecha: fechaActual,
            titulo: "",
            descripcion: "",
            imagen: undefined as unknown as File,
        },
        onSubmit: async ({ value }) => {
            setFormErrors({});

            const result = publicacionSchema.safeParse(value);
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
                const result = onSubmit?.({
                    fecha: value.fecha,
                    Titulo: value.titulo,
                    Descripcion: value.descripcion,
                    imagen: value.imagen
                });

                if (result instanceof Promise) {
                    await result;
                }

                setOpen(false);
                form.reset();
                toast.success('Publicación agregada exitosamente');
            } catch (error) {
                console.error('Error al agregar la publicación:', error);
                toast.error('Ocurrió un error al agregar la publicación');
            }
        },
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={'create'} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Agregar {tipo}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Agregar {tipo}</DialogTitle>
                    <DialogDescription>
                        Complete el formulario para agregar una nueva publicación de {tipo}
                        {tipo !== 'evento' && (
                            <>
                                <br />
                                <br />
                                <p>La fecha registrada en la publicación será la fecha actual</p>
                            </>
                        )}
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
                                const parseISOToLocalDate = (value: string | undefined) => {
                                    if (!value) return undefined
                                    const [y, m, d] = value.split("-").map(Number)
                                    if (!y || !m || !d) return undefined
                                    return new Date(y, m - 1, d)
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
                                                        field.handleChange(formatDateISO(date))
                                                    }}
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
                        validators={{
                            onChange: ({ value }) => {
                                const result = publicacionSchema.shape.titulo.safeParse(value);
                                return result.success ? undefined : result.error.issues[0]?.message;
                            }
                        }}
                        children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold mb-2" htmlFor="titulo">
                                    Título:
                                </Label>
                                <Input
                                    id="titulo"
                                    type="text"
                                    className="w-full"
                                    placeholder={titulosPH(tipo)}
                                    maxLength={50}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors ? (
                                    <p className="text-red-700 text-sm">{field.state.meta.errors[0]}</p>
                                ) : formErrors.titulo ? (
                                    <p className="text-red-700 text-sm">{formErrors.titulo}</p>
                                ) : null}
                            </div>
                        )}
                    />

                    <form.Field
                        name="descripcion"
                        validators={{
                            onChange: ({ value }) => {
                                const result = publicacionSchema.shape.descripcion.safeParse(value);
                                return result.success ? undefined : result.error.issues[0]?.message;
                            }
                        }}
                        children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold mb-2" htmlFor="descripcion">
                                    Descripción:
                                </Label>
                                <Textarea
                                    id="descripcion"
                                    placeholder={descripcionesPH(tipo)}
                                    minLength={5}
                                    maxLength={150}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                    className="border rounded p-2 w-full max-w-md break-words whitespace-pre-wrap overflow-y-auto resize-y max-h-64"
                                />
                                {field.state.meta.errors ? (
                                    <p className="text-red-700 text-sm">{field.state.meta.errors[0]}</p>
                                ) : formErrors.descripcion ? (
                                    <p className="text-red-700 text-sm">{formErrors.descripcion}</p>
                                ) : null}
                            </div>
                        )}
                    />

                    <form.Field
                        name="imagen"
                        validators={{
                            onChange: ({ value }) => !value ? 'Seleccione una imagen' : undefined,
                        }}
                    >
                        {(field) => (
                            <div className="flex flex-col gap-2">
                                <Label className="block text-left">Imagen:</Label>
                                <div className="relative flex items-center">
                                    <label htmlFor="imagen-upload" className="flex items-center gap-2 px-4 py-2 bg-white text-gray-500 text-sm rounded-lg border-1 border-gray-200 shadow cursor-pointer hover:bg-gray-100">
                                        <ImageUp className="h-4 w-4" />
                                        Seleccionar imagen
                                        <Input
                                            id="imagen-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) field.handleChange(file);
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
                            variant={'create'}
                            disabled={form.state.isSubmitting}
                        >
                            {form.state.isSubmitting ? 'Agregando...' : 'Agregar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default FormAgregarPublicacion
