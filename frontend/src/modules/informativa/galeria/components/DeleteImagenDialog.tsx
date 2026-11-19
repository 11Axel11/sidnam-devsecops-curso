import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteImagen } from "../hooks/galeriaHooks";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const DeleteImagenDialog = ({ id }: { id: number }) => {
    const { mutate: deleteImagen } = useDeleteImagen();

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteImagen({ id });
        toast.success('Imagen eliminada correctamente');
    };
    
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    className="p-2 bg-white bg-opacity-20 hover:bg-destructive/30 border-destructive border-2 transition-all duration-200"
                    title="Eliminar imagen"
                >
                    <Trash2 className="w-5 h-5 text-destructive" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Eliminar imagen</DialogTitle>
                    <DialogDescription className="text-black text-center my-6">
                        ¿Estás seguro de eliminar esta imagen?
                        <br />
                        <br />
                        <span className="font-bold">Esta acción no se puede deshacer.</span>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button className="flex-1" variant="destructive" onClick={handleDelete}>
                        Eliminar
                    </Button>
                    <DialogClose asChild>
                        <Button className="flex-1" variant="outline">Cancelar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteImagenDialog;
