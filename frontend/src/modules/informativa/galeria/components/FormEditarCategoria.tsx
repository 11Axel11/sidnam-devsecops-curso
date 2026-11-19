import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter, DialogHeader, DialogTrigger, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Pencil } from "lucide-react"
import { useForm } from "@tanstack/react-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { FormEditarCategoriaProps } from "../types/galeria"
import { usePatchUpdateCategoria } from "../hooks/galeriaHooks"
import { useGetCategorias } from "../hooks/galeriaHooks"
import { toast } from "sonner"
import { useMemo } from "react"
import { useState } from "react"
import { categoriaSchema } from "@/schemas/schemaGaleria"

const FormEditarCategoria = ({id} : FormEditarCategoriaProps) => {
    const { mutate, isPending } = usePatchUpdateCategoria();
    const { Categorias } = useGetCategorias();  
    const [open, setOpen] = useState(false);

    const categoria = useMemo(() => {
        return Categorias.find(cat => cat.id === id);
    }, [Categorias, id]);

    const defaultValues = useMemo(() => ({
        nombre: categoria?.nombre || "",
        descripcion: categoria?.descripcion || ""
    }), [categoria]);

    const form = useForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            if (
                value.nombre === defaultValues.nombre &&
                value.descripcion === defaultValues.descripcion
            ) {
                toast.info("No hay cambios por guardar");
                setOpen(false);
                return;
            }

            try {
                const toastId = toast.loading("Actualizando categoría...");
                const validation = categoriaSchema.safeParse(value);
                if (!validation.success) {
                    toast.error("Error al validar los datos", {
                        id: toastId,
                        description: validation.error.issues.map(issue => issue.message).join(", "),
                    });
                    return;
                }

                await mutate(
                    {
                        id,
                        nombre: value.nombre,
                        descripcion: value.descripcion,
                    },
                    {
                        onSuccess: () => {
                            toast.success("Categoría actualizada correctamente", { id: toastId });
                            setOpen(false);
                        },
                        onError: () => {
                            toast.error("Error al actualizar la categoría", {
                                id: toastId,
                                description: "Intente nuevamente más tarde",
                            });
                        },
                    }
                );
            } catch (error) {
                console.error("Unexpected error:", error);
            }
        },
    });
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <Button variant="update">
                    <Pencil/>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar categoría</DialogTitle>
                    <DialogDescription>
                        Puede cambiar los datos de la categoría en el formulario
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}
                className="space-y-4"
                >
                    <form.Field name="nombre">
                        {(field) => (
                        <div>
                            <Label className="block mb-1 text-left">Nombre de la categoría</Label>
                            <Input
                            type="text"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            maxLength={20}
                            minLength={5}
                            className="border rounded p-2 w-full"
                            />
                            {field.state.meta.errors[0] && (
                            <p className="text-red-500 text-sm">{field.state.meta.errors[0]}</p>
                            )}
                        </div>
                        )}
                    </form.Field>
                    <form.Field name="descripcion">
                        {(field) => (
                        <div>
                            <Label className="block mb-1 text-left">Descripción</Label>
                            <Textarea
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            maxLength={70}
                            minLength={10}
                            className="border rounded p-2 w-full max-w-md break-words whitespace-pre-wrap overflow-y-auto resize-y max-h-64"
                            />
                            {field.state.meta.errors[0] && (
                            <p className="text-red-500 text-sm">{field.state.meta.errors[0]}</p>
                            )}
                        </div>
                        )}
                    </form.Field>
                </form>
                <DialogFooter>
                    <Button
                        variant="create"
                        className="flex-1"
                        disabled={isPending}
                        onClick={() => form.handleSubmit()}
                    >
                        Guardar cambios
                    </Button>
                    <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => setOpen(false)}
                    >
                        Cancelar
                    </Button>   
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default FormEditarCategoria
