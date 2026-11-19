import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useConfirmacion } from "@/hooks/useConfirmar";
import type { Sede } from "@/store/sedeStore";
import { useInventarioQuery, usePatchArchivarExistencia } from "../hooks/existenciaHooks";
import { mensajeError } from "@/utils/apiError";

export default function ExistenciasArchivadasDialogo({ sede, categoryId }: { sede: Sede; categoryId: number }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useInventarioQuery({ sede, categoria: categoryId, archivado: true, enabled: open });
  const { mutateAsync: archivar } = usePatchArchivarExistencia();
  const confirmar = useConfirmacion();

  const restaurar = async (id: number, nombre: string) => {
    if (!(await confirmar(`¿Restaurar "${nombre}"? Volverá al inventario de esta sede con su stock actual.`))) return;
    try {
      await archivar({ id, archivado: false });
      toast.success('Producto restaurado correctamente');
    } catch (e) {
      toast.error(mensajeError(e, 'Error al restaurar el producto'));
    }
  };

  const lista = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="update" size="sm" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Restaurar archivados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Productos archivados</DialogTitle>
          <DialogDescription>Selecciona los productos que deseas restaurar en esta sede.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-center py-4 text-gray-500">Cargando…</p>
        ) : lista.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No hay productos archivados</p>
        ) : (
          <div className="space-y-2">
            {lista.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-medium">{e.producto?.nombre}</p>
                  <p className="text-sm text-gray-500">Código: {e.producto?.codigo}</p>
                  {e.unidadMedida && (
                    <p className="text-sm text-gray-500">Unidad de medida: {e.unidadMedida.nombre} ({e.unidadMedida.abreviatura})</p>
                  )}
                </div>
                <Button variant="update" size="sm" onClick={() => restaurar(e.id, e.producto?.nombre ?? '')}>
                  <RefreshCw className="h-4 w-4" /> Restaurar
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
