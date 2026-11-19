import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Proveedores } from "../models/proveedores";
import FormEditarProveedor from "./FormEditarProveedor";
import { usePatchEstadoProveedor } from "../hooks/proveedoresHooks";
import { toast } from "sonner";
import IfPerm from "@/components/auth/IfPerm";

const AccionesProveedorCell = ({ row }: { row: any }) => {
  const [isDialogOpenn, setIsDialogOpenn] = useState(false);
  const [showConfirmDialogg, setShowConfirmDialogg] = useState(false);
  const proveedor = row.original as Proveedores;

  const idProveedor = (proveedor as Proveedores).id_proveedor;

  const { mutate: patchEstadoProveedor } = usePatchEstadoProveedor();

  const confirmarArchivado = async () => {
    try {
      await patchEstadoProveedor(
        { idProveedor: Number(idProveedor) },
        {
          onSuccess: () => {
            toast.success("Proveedor archivado correctamente");
            setShowConfirmDialogg(false);
          },
          onError: (error: any) => {
            const errorMessage = error.response?.data?.message || "Error al archivar el proveedor";
            toast.error(errorMessage);
            setShowConfirmDialogg(false);
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al archivar el proveedor";
      toast.error(errorMessage);
      setShowConfirmDialogg(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex gap-2">
      <Dialog open={isDialogOpenn} onOpenChange={setIsDialogOpenn}>
        <DialogTrigger asChild>
          <IfPerm perm="Proveduría.General Proveduría:Actualizar">
            <Button 
              variant="update" 
              onClick={(e) => {
                e.preventDefault();
                setIsDialogOpenn(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </IfPerm>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar proveedor</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <FormEditarProveedor
            idProveedor={Number(idProveedor)}
            onSuccess={() => setIsDialogOpenn(false)}
            initial={{
              nombre: proveedor.nombre,
              numero: proveedor.numero,
              direccion: proveedor.direccion,
              correo: proveedor.correo,
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={showConfirmDialogg} onOpenChange={setShowConfirmDialogg}>
        <DialogTrigger asChild>
          <IfPerm perm="Proveduría.General Proveduría:Eliminar">
            <Button 
              variant="destructive" 
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirmDialogg(true);
              }}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </IfPerm>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar archivado</DialogTitle>
          </DialogHeader>
          <DialogDescription className="flex justify-center text-black mt-3">
            ¿Estás seguro de que deseas archivar este proveedor? 
          </DialogDescription>
          <div className="flex justify-end gap-4 mt-4">
            <Button 
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                confirmarArchivado();
              }}
            >
              Aceptar
            </Button>
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirmDialogg(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccionesProveedorCell;