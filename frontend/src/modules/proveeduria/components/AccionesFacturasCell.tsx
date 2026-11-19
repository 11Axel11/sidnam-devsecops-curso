import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileDown, Pencil, SquareCheckBig } from "lucide-react";
import FormEditarFactura from "./FormEditarFactura";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Factura } from "../models/proveedores";
import { useDescargarFacturaPdf, usePatchEstadoFactura } from "../hooks/proveedoresHooks";
import { toast } from "sonner";
import IfPerm from "@/components/auth/IfPerm";
import CalendarField from "@/components/CalendarField";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { mensajeError } from "@/utils/apiError";

const AccionesFacturasCell = ({ row }: { row: any }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const factura = row.original as Factura;

  const idFactura = (factura as Factura).id_factura;

  const estado = (factura as Factura).estado;

  const [fechaPagada, setFechaPagada] = useState(format(new Date(), "yyyy-MM-dd"));
  const { mutateAsync: patchEstadoFactura, isPending: guardandoEstado } = usePatchEstadoFactura();
  const { mutate: descargarPdf, isPending: descargando } = useDescargarFacturaPdf();

  const confirmarEstado = async () => {
    try {
      await patchEstadoFactura({ idFactura: Number(idFactura), fecha_pagada: fechaPagada });
      toast.success("Estado de la factura actualizado correctamente");
      setShowConfirmDialog(false);
    } catch (error) {
      toast.error(mensajeError(error, "Error al actualizar el estado de la factura"));
    }
  };

  return (
    <div className="flex gap-2">
      <IfPerm perm="Proveduría.Facturas Proveduría:Ver">
        <Button
          variant="outline"
          title="Descargar PDF"
          disabled={descargando}
          onClick={() =>
            descargarPdf(
              { idFactura: Number(idFactura), numero: factura.numero_factura },
              { onError: () => toast.error("No se pudo descargar el PDF de la factura") }
            )
          }
        >
          <FileDown className="h-3 w-3" />
        </Button>
      </IfPerm>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <IfPerm perm="Proveduría.Facturas Proveduría:Actualizar">
            <Button variant="update" onClick={() => setIsDialogOpen(true)} disabled={estado === "pagada"}>
              <Pencil />
            </Button>
          </IfPerm>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar factura</DialogTitle>
            <DialogDescription />
          </DialogHeader>

          <FormEditarFactura
            idFactura={Number(idFactura)}
            onSuccess={() => setIsDialogOpen(false)}
            initial={{
              numero_factura: factura.numero_factura,
              fecha_emitida: factura.fecha_emitida,
              fecha_pago: factura.fecha_pago,
              monto: factura.monto,
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogTrigger asChild>
          <IfPerm perm="Proveduría.Facturas Proveduría:Eliminar">
          <Button variant="update" onClick={() => setShowConfirmDialog(true)}
           disabled={estado === "pagada"}>
            <SquareCheckBig className="h-3 w-3" />
          </Button>
          </IfPerm>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cambio de estado</DialogTitle>
          </DialogHeader>
          <DialogDescription className="flex justify-center text-black mt-3">
            ¿Estás seguro de que deseas marcar esta factura como pagada? 
          </DialogDescription>
          <div className="mt-4 space-y-2">
            <Label>Fecha de pago</Label>
            <CalendarField disableFuture value={fechaPagada} onChange={(iso) => setFechaPagada(iso)} />
          </div>
          <div className="flex justify-end gap-4 mt-4">
            <Button 
              variant="approve"
              onClick={confirmarEstado}
              disabled={guardandoEstado || !fechaPagada}
            >
              Aceptar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccionesFacturasCell;