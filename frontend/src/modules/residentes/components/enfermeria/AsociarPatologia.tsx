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
import { Activity, Loader2 } from "lucide-react";
import { useGetPatologias } from "../../hooks/enfermeria/enfermeriaHooks";
import BadgePatologia from "./BadgePatologia";

const AsociarPatologia = () => {
  const [open, setOpen] = useState(false);
  const { id } = useParams({ from: "/residentes/$id/enfermeria/" });
  const queryClient = useQueryClient();
  const { Patologias, loadingPatologias, errorPatologias } = useGetPatologias();

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      queryClient.invalidateQueries({
        queryKey: ["expedienteResidenteId", Number(id)]
      });
    }
  };

  if (errorPatologias) {
    return (
      <Button disabled variant="destructive" className="hover:cursor-not-allowed">
        <Activity className="mr-2 h-4 w-4" />
        Error al cargar
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant={"create"} className="hover:cursor-pointer" disabled={loadingPatologias}>
          {loadingPatologias ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando...
            </>
          ) : (
            <>
              <Activity className="mr-2 h-4 w-4" />
              Gestionar
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto text-justify
            scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">
        <DialogHeader>
          <DialogTitle>Gestionar Patologías</DialogTitle>
          <DialogDescription>
            Selecciona o deselecciona las patologías del residente.
            Las patologías activas aparecen marcadas en azul.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto text-justify
            scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent py-4 pr-2">
          <div className="flex flex-wrap gap-2">
            {loadingPatologias ? (
              <div className="flex items-center justify-center w-full py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Cargando patologías...</span>
              </div>
            ) : Patologias && Patologias.length > 0 ? (
              Patologias.map((p: any) => {
                const id = p.id_patologia;
                const nombre = p.nombre;
                if (!id) return null;
                return <BadgePatologia key={id} idPatologia={Number(id)} nombre={String(nombre)} />;
              })
            ) : (
              <div className="w-full text-center py-8 text-muted-foreground">
                No hay patologías disponibles
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AsociarPatologia;