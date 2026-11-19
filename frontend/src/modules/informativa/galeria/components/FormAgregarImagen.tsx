import { useForm } from "@tanstack/react-form";
import { useCreateImagen, useGetCategorias } from "../hooks/galeriaHooks";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ImageUp, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";

const FormAgregarImagen = () => {
    const { mutate, isPending, isError, error } = useCreateImagen();
    const { Categorias } = useGetCategorias();
    const [open, setOpen] = useState(false);

    const form = useForm({
        defaultValues: {
            categoriaId: '',
            imagen: undefined as unknown as File,
        },
        onSubmit: ({ value }) => {
            if (!value.categoriaId || !value.imagen) return;
                mutate(
                    { file: value.imagen, categoriaId: Number(value.categoriaId) },
                    {
                        onSuccess: () => {
                            toast.success("Imagen agregada a la galeria", {
                                description: "Puedes visualizar esta imagen en la galeria y en el apartado de su categoria",
                                duration: 4000,
                            });
                            form.reset();
                            setOpen(false);
                        },
                    }
                );
            },
        });

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            form.reset();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger>
            <Button variant={"create"} className="flex items-center gap-2">
              <Plus className="w-4 h-4"/> 
              Agregar imagen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>Agregar imagen</DialogTitle>
                <DialogDescription>
                    Seleccione la categoria y suba el archivo con la imagen
                </DialogDescription>
            </DialogHeader>

            <form
            onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
            }}
            className="space-y-4"
            >
                <form.Field
                    name="categoriaId"
                    validators={{
                        onChange: ({ value }) => !value ? 'Seleccione una categoría' : undefined,
                    }}
                >
                    {(field) => (
                        <div>
                            <Label className="block mb-3 text-left">Categoría</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={field.handleChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione una categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Categorias?.map((categoria: { id: number; nombre: string }) => (
                                        <SelectItem key={categoria.id} value={String(categoria.id)}>
                                            {categoria.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {field.state.meta.errors[0] && (
                                <p className="text-red-500 text-sm">{field.state.meta.errors[0]}</p>
                            )}
                        </div>
                    )}
                    </form.Field>

                    <form.Field
                        name="imagen"
                        validators={{
                            onChange: ({ value }) => !value ? 'Seleccione una imagen' : undefined,
                        }}
                    >
                        {(field) => (
                            <div className="flex flex-col gap-2">
                                 <Label className="block mb-1 text-left">Imagen</Label>
                                    <div className="relative flex items-center">
                                        <label htmlFor="imagen-upload" className="flex items-center gap-2 px-4 py-2 bg-white text-gray-500 text-sm rounded-lg border-1 border-gray-200 shadow cursor-pointer hover:bg-gray-100">
                                            <ImageUp className="h-4 w-4"/>
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

                    <Button
                        type="submit"
                        variant= {'create'}
                        disabled={isPending || !form.state.isValid}
                        className="w-full"
                    >
                        {isPending ? "Subiendo..." : "Subir Imagen"}
                    </Button>

                    {isError && <p className="text-red-500">❌ {String(error)}</p>}
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default FormAgregarImagen;    