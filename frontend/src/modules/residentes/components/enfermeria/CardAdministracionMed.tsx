import { PillBottle, Trash2 } from 'lucide-react'
import { capitalize } from '@/lib/pathNameMap'
import type { CardAdministracionMedProps } from '../../types/enfermeriaProps'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDeleteAdministracionResidente } from '../../hooks/enfermeria/enfermeriaHooks'
import { toast } from 'sonner'
import IfPerm from '@/components/auth/IfPerm'

const CardAdministracionMed = ({ med, idAdministracion }: CardAdministracionMedProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const mutation = useDeleteAdministracionResidente();

  const handleDelete = async () => {
    const deletePromise = mutation.mutateAsync({
      idAdministracion: idAdministracion,
      idMedicamento: String(med.id_medicamento)
    });

    toast.promise(deletePromise, {
      loading: `Eliminando ${capitalize(med.nombre)}...`,
      success: () => {
        setIsOpen(false);
        return `La administración se ha eliminado exitosamente.`;
      },
      error: (err) => {
        console.error('Error al eliminar la administración:', err);
        return 'Error al eliminar el medicamento. Inténtalo de nuevo.';
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
                <div>
                  <p>
                    <strong className="font-semibold">Medicamento:</strong> {capitalize(med.nombre)}
                  </p>
                  <p>
                    <strong className="font-semibold">Cantidad:</strong> {med.cantidad}
                  </p>
                  <p>
                    <strong className="font-semibold">Unidad:</strong> {med.unidad.nombre} ({med.unidad.abreviatura})
                  </p>
                </div>
              </div>
            </DialogTrigger>
          </TooltipTrigger>
          
          <TooltipContent>
            <p>Haz click para ver detalles</p>
          </TooltipContent>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Administración de medicamento</DialogTitle>
                <IfPerm perm="Residencia.Enfermería:Eliminar">
                  <DialogDescription>
                    Puedes eliminar esta administración, pero esta acción no se puede deshacer. Tendrás que crear una nueva administración si fue un error.
                  </DialogDescription>
                </IfPerm>
            </DialogHeader>
            
            <Card className="">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <PillBottle size={24} />
                  Detalles de la Administración
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-justify">
                  <div className='flex gap-1'>
                    <strong className="font-semibold text-sm">Medicamento:</strong>
                    <p className="text-sm">{capitalize(med.nombre)}</p>
                  </div>
                  <div className='flex gap-1'>
                    <strong className="font-semibold text-sm">Cantidad:</strong>
                    <p className="text-sm">{med.cantidad}</p>
                  </div>
                  <div className='flex gap-1'>
                    <strong className="font-semibold text-sm">Unidad:</strong>
                    <p className="text-sm">{med.unidad.nombre} ({med.unidad.abreviatura})</p>
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

export default CardAdministracionMed