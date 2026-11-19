import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Loader2, Plus, Receipt } from "lucide-react";
import BadgeForm from "@/components/BadgeForm";
import { useGetProveedoresPreview } from "../hooks/proveedoresHooks";
import FormCrearFacturaEmbed from "./FormCrearFacturaEmbed";
import type { Sede } from "@/store/sedeStore";

type Proveedor = { id_proveedor: number; nombre: string };

const AsociarFacturaPorProveedor = ({ sede }: { sede?: Sede }) => {
  const [open, setOpen] = useState(false);
  const [proveedorSel, setProveedorSel] = useState<Proveedor | null>(null);
  const queryClient = useQueryClient();

  const { ProveedoresPreview, loadingProveedoresPreview, errorProveedoresPreview } = useGetProveedoresPreview();

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setProveedorSel(null);
    }
  };

  const handleProveedorClick = (id_proveedor: number, nombre: string) => {
    setProveedorSel({ id_proveedor, nombre });
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["facturasProveedor"] });
    setProveedorSel(null);
    setOpen(false);
  };

  const handleFormCancel = () => {
    setProveedorSel(null);
  };

  if (errorProveedoresPreview) {
    return (
      <Button disabled variant="destructive" className="hover:cursor-not-allowed">
        <Receipt className="mr-2 h-4 w-4" />
        Error al cargar
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button disabled={loadingProveedoresPreview} variant={"create"}>
          {loadingProveedoresPreview ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando...
            </>
          ) : (
            <>
              <Plus /> 
              Agregar facturas
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto text-justify
        scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">
        {!proveedorSel ? (
          <>
            <DialogHeader>
              <DialogTitle>Selecciona un proveedor</DialogTitle>
              <DialogDescription>
                Elige un proveedor para registrar una nueva factura.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-60 overflow-y-auto text-justify py-4 pr-2
              scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">
              <div className="flex flex-wrap gap-2">
                {loadingProveedoresPreview ? (
                  <div className="flex items-center justify-center w-full py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Cargando proveedores...</span>
                  </div>
                ) : ProveedoresPreview && ProveedoresPreview.length > 0 ? (
                    ProveedoresPreview.map((prov) => (
                    <BadgeForm
                      key={prov.id_proveedor}
                      id={Number(prov.id_proveedor)}
                      nombre={prov.nombre}
                      onClick={handleProveedorClick}
                    />
                  ))
                ) : (
                  <div className="w-full text-center py-8 text-muted-foreground">
                    No hay proveedores disponibles
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cerrar</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <FormCrearFacturaEmbed
            sede={sede}
            proveedorId={proveedorSel.id_proveedor}
            proveedorNombre={proveedorSel.nombre}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AsociarFacturaPorProveedor;
