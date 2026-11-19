import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useGetCategoriasInactivas } from "../hooks/galeriaHooks"
import { usePatchHandleInactiva } from "../hooks/galeriaHooks"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import IfPerm from "@/components/auth/IfPerm"

const ArchivadasDialog = () => {
    const queryClient = useQueryClient()
    const { CategoriasInactivas, loadingCategoriasInactivas } = useGetCategoriasInactivas()
    const { mutate: restaurarCategoria } = usePatchHandleInactiva()
    const [isOpen, setIsOpen] = useState(false)

    const handleRestore = (id: number) => {
        restaurarCategoria(
            { id },
            {
                onSuccess: () => {
                    toast.success('Categoría restaurada correctamente')
                    queryClient.invalidateQueries({ 
                        queryKey: ["categoriasInactivas"] 
                    })
                    queryClient.invalidateQueries({ 
                        queryKey: ["categorias"] 
                    })
                    queryClient.invalidateQueries({ 
                        queryKey: ["imagenes"] 
                    })
                    setIsOpen(false)
                },
                onError: (error) => {
                    console.error('Error restoring category:', error)
                    toast.error('Error al restaurar la categoría')
                }
            }
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <IfPerm perm="Informativa.Galeria:Actualizar">
                <DialogTrigger>
                    <Button variant="update">
                        <RefreshCw/>
                        Restaurar archivadas
                    </Button>
                </DialogTrigger>
            </IfPerm>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Restaurar categorías archivadas</DialogTitle>
                    <DialogDescription>
                        Selecciona la categoría que deseas restaurar
                    </DialogDescription>
                </DialogHeader>
                <div>
                    {loadingCategoriasInactivas ? (
                        <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
                    ) : CategoriasInactivas?.length === 0 ? (
                        <p className="text-center py-4 text-gray-500">No hay categorías archivadas</p>
                    ) : (
                        <div className="space-y-2">
                            {CategoriasInactivas?.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                                    <div>
                                        <p className="font-medium">{item.nombre}</p>
                                    </div>
                                    <Button 
                                        variant="update" 
                                        size="sm"
                                        onClick={() => handleRestore(item.id)}
                                    >
                                        <RefreshCw/>
                                        Restaurar
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default ArchivadasDialog
