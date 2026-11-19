import { useState } from "react"
import { useGetProveedoresArchivados } from "../hooks/proveedoresHooks"
import { Button } from "@/components/ui/button"
import { usePatchEstadoProveedor } from "../hooks/proveedoresHooks"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { DialogHeader, Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { RefreshCw } from "lucide-react"
import WebLoader from "@/components/Loader"
import IfPerm from "@/components/auth/IfPerm"

interface RestaurarProveedorProps {
  onRestoreSuccess?: () => void;
  onCloseParent?: () => void;
  idArea: number
}

export default function RestaurarProveedor({ onRestoreSuccess, onCloseParent, idArea }: RestaurarProveedorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { ProveedoresArchivados, loadingProveedoresArchivados, errorProveedoresArchivados } = useGetProveedoresArchivados(idArea)
    const { mutate: restaurarProveedor } = usePatchEstadoProveedor()
    const queryClient = useQueryClient()
    const [showConfirmDialogg, setShowConfirmDialogg] = useState(false);

    const handleRestore = (proveedorId : number) => {
        restaurarProveedor(
            { idProveedor: proveedorId },
            {
                onSuccess: () => {
                    toast.success('Proveedor restaurado correctamente')
                    queryClient.invalidateQueries({ queryKey: ['Proveedores'] })
                    setIsOpen(false)
                    onRestoreSuccess?.()
                    onCloseParent?.()
                },
                onError: (error) => {
                    console.error('Error restoring product:', error)
                    toast.error('Error al restaurar el producto')
                }
            }
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger>
                <IfPerm perm="Proveduría.General Proveduría:Actualizar">
                    <Button variant="update">
                        <RefreshCw className="h-4 w-4" />
                        Restaurar
                    </Button>
                </IfPerm>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Restaurar proveedor</DialogTitle>
                    <DialogDescription>
                        Aquí puede restaurar proveedores archivados
                    </DialogDescription>
                </DialogHeader>
                <div>
                    {loadingProveedoresArchivados ? (
                        <WebLoader />
                    ) : errorProveedoresArchivados ? (
                        <p className="text-red-700 text-sm">Error al cargar proveedores archivados</p>
                    ) : ProveedoresArchivados.length === 0 ? (
                        <p className="text-red-700 text-sm">No hay proveedores archivados</p>
                    ) : (
                        <div className="space-y-2">
                            {ProveedoresArchivados.map((proveedor) => (
                                <div key={proveedor.id_proveedor} className="flex items-center justify-between p-2 border rounded max-w-md mx-auto">
                                    <p className="text-wrap break-words line-clamp-2">{proveedor.nombre}</p>
                                    <Dialog open={showConfirmDialogg} onOpenChange={setShowConfirmDialogg}>
                                            <DialogTrigger asChild>
                                              <IfPerm perm="Proveduría.General Proveduría:Actualizar">
                                                <Button 
                                                  variant="update" 
                                                  size="sm" 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowConfirmDialogg(true);
                                                  }}
                                                >
                                                  <RefreshCw className="h-4 w-4" />
                                                  Restaurar
                                                </Button>
                                              </IfPerm>
                                            </DialogTrigger>
                                            <DialogContent>
                                              <DialogHeader>
                                                <DialogTitle>Confirmar restaurado</DialogTitle>
                                              </DialogHeader>
                                              <DialogDescription className="flex justify-center text-black mt-3">
                                                ¿Estás seguro de que deseas restaurar este proveedor? 
                                              </DialogDescription>
                                              <div className="flex justify-end gap-4 mt-4">
                                                <Button 
                                                  variant="update"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRestore(Number(proveedor.id_proveedor))
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
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}