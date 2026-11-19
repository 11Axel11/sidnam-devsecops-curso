import { PillBottle, Trash2 } from "lucide-react";
import { capitalize } from "@/lib/pathNameMap";
import type { CardTratamientoEspecialProps } from "../../types/enfermeriaProps";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDeleteAdministracionEspecialResidente } from "../../hooks/enfermeria/enfermeriaHooks"
import { toast } from "sonner"
import IfPerm from "@/components/auth/IfPerm";

const CardTratamientoEspecial = ({ tratamiento, idAdministracionEspecial }: CardTratamientoEspecialProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const mutation = useDeleteAdministracionEspecialResidente();

  const handleDelete = async () => {
    const deletePromise = mutation.mutateAsync({
      idAdministracionEspecial: idAdministracionEspecial
    });

    toast.promise(deletePromise, {
      loading: `Eliminando ${capitalize(tratamiento.medicamento.nombre)}...`,
      success: () => {
        setIsOpen(false);
        return `La administración de tratamiento especial se ha eliminado exitosamente.`;
      },
      error: (err) => {
        console.error('Error al eliminar el tratamiento especial:', err);
        return 'Error al eliminar el tratamiento especial. Inténtalo de nuevo.';
      },
    });
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <div className="text-justify flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 hover:cursor-pointer transition-colors">
                <PillBottle size={20} />
                <p>
                  <strong className="font-semibold">{capitalize(tratamiento.medicamento.nombre)}</strong> {tratamiento.hora} {tratamiento.cantidad} ({tratamiento.unidad.abreviatura})
                </p>
              </div>
            </DialogTrigger>
          </TooltipTrigger>

          <TooltipContent>
            <p>Haz click para ver detalles</p>
          </TooltipContent>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tratamiento especial</DialogTitle>
              <IfPerm perm="Residencia.Enfermería:Eliminar">
                <DialogDescription>
                  Puedes eliminar esta administración de tratamiento especial, pero esta acción no se puede deshacer. Tendrás que crear una nueva administración de tratamiento especial si fue un error.
                </DialogDescription>
              </IfPerm>
            </DialogHeader>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <PillBottle size={24} />
                  Detalles del Tratamiento Especial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-justify space-y-1">
                  <div className="flex gap-1">
                    <strong className="font-semibold text-sm">Medicamento:</strong>
                    <p className="text-sm">{capitalize(tratamiento.medicamento.nombre)}</p>
                  </div>
                  <div className="flex gap-1">
                    <strong className="font-semibold text-sm">Hora de administración:</strong>
                    <p className="text-sm">{tratamiento.hora}</p>
                  </div>
                  <div className="flex gap-1">
                    <strong className="font-semibold text-sm">Cantidad:</strong>
                    <p className="text-sm">{tratamiento.cantidad}</p>
                  </div>
                  <div className="flex gap-1">
                    <strong className="font-semibold text-sm">Unidad:</strong>
                    <p className="text-sm">{tratamiento.unidad.nombre} ({tratamiento.unidad.abreviatura})</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="flex gap-2">
              <IfPerm perm="Residencia.Enfermería:Eliminar">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className="mr-2" />
                      Eliminar
                    </>
                  )}
                </Button>
              </IfPerm>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CardTratamientoEspecial
