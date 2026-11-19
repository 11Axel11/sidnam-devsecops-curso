import { useState } from "react";
import { useParams } from "@tanstack/react-router";
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
import { Clock, Loader2 } from "lucide-react";
import { useGetMedicamentos } from "../../hooks/enfermeria/enfermeriaHooks";
import FormAdministracionEspecial from "./FormAdministracionEspecial";
import BadgeForm from "@/components/BadgeForm";

const AsociarTratamientosEspeciales = () => {
  const [open, setOpen] = useState(false);
  const [medicamentoSeleccionado, setMedicamentoSeleccionado] = useState<{ id: number; nombre: string } | null>(null);
  const { id } = useParams({ from: "/residentes/$id/enfermeria/" });
  const queryClient = useQueryClient();
  const { Medicamentos, errorMedicamentos, loadingMedicamentos } = useGetMedicamentos(1);

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setMedicamentoSeleccionado(null);
      queryClient.invalidateQueries({
        queryKey: ["expedienteResidenteId", Number(id)]
      });
    }
  };

  const handleMedicamentoClick = (idMedicamento: number, nombre: string) => {
    setMedicamentoSeleccionado({ id: idMedicamento, nombre });
  };

  const handleFormCancel = () => {
    setMedicamentoSeleccionado(null);
  };

  if (errorMedicamentos) {
    return (
      <Button disabled variant="destructive" className="hover:cursor-not-allowed">
        <Clock className="mr-2 h-4 w-4" />
        Error al cargar
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant={"create"} className="hover:cursor-pointer" disabled={loadingMedicamentos}>
          {loadingMedicamentos ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando...
            </>
          ) : (
            <>
              <Clock className="mr-2 h-4 w-4" />
              Gestionar
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto text-justify
            scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">
        {!medicamentoSeleccionado ? (
          <>
            <DialogHeader>
              <DialogTitle>Gestionar administraciones especiales</DialogTitle>
              <DialogDescription>
                Selecciona un medicamento para agregar una nueva administración especial con horario específico.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-60 overflow-y-auto text-justify
            scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent py-4 pr-2">
              <div className="flex flex-wrap gap-2">
                {loadingMedicamentos ? (
                  <div className="flex items-center justify-center w-full py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Cargando medicamentos...</span>
                  </div>
                ) : Medicamentos && Medicamentos.length > 0 ? (
                  Medicamentos.map((medicamento: any) => {
                    const id = medicamento.id_medicamento;
                    const nombre = medicamento.nombre;
                    if (!id) return null;
                    return (
                      <BadgeForm
                        key={id}
                        id={Number(id)}
                        nombre={String(nombre)}
                        onClick={handleMedicamentoClick}
                      />
                    );
                  })
                ) : (
                  <div className="w-full text-center py-8 text-muted-foreground">
                    No hay medicamentos disponibles
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
          <FormAdministracionEspecial medicamentoSeleccionado={medicamentoSeleccionado} onCancel={handleFormCancel} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AsociarTratamientosEspeciales;