import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { FormEditarImagenProps } from "../types/galeria";
import { useState } from "react";
import { useGetCategorias } from "../hooks/galeriaHooks";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatchUpdateImagen } from "../hooks/galeriaHooks";
import { toast } from "sonner";

const FormEditarImagen = ({ id, categoriaId }: FormEditarImagenProps) => {
    const [open, setOpen] = useState(false);
    const [selectedCategoriaId, setSelectedCategoriaId] = useState(categoriaId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { Categorias } = useGetCategorias();
    const { mutate } = usePatchUpdateImagen();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedCategoriaId && !isSubmitting) {
            setIsSubmitting(true);
            try {
                await mutate({ id, categoriaId: selectedCategoriaId });
                toast.success('Imagen actualizada correctamente');
                setOpen(false);
                setSelectedCategoriaId(categoriaId); 
            } catch (error) {
                toast.error('Error al actualizar la imagen');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(true);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <Button
                    onClick={handleEdit}
                    className="p-2 bg-white bg-opacity-20 hover:bg-update/20 border-update border-2 transition-all duration-200"
                    title="Editar imagen"
                >
                    <Pencil className="w-5 h-5 text-update" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar imagen</DialogTitle>
                    <DialogDescription>
                        Puedes cambiar la categoría de esta imagen
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <Label className="mb-2 mt-4" htmlFor="categoriaId">Categoría</Label>
                    <Select
                        value={selectedCategoriaId?.toString()}
                        onValueChange={(value) => {
                            setSelectedCategoriaId(Number(value));
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            {Categorias.map((categoria) => (
                                <SelectItem key={categoria.id} value={categoria.id.toString()}>
                                    {categoria.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter className="flex gap-2 mt-6">
                        <Button className="flex-1" variant="update" type="submit">
                            Actualizar
                        </Button>
                        <Button className="flex-1" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default FormEditarImagen;