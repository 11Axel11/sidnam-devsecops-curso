import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { useState } from "react"
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { usePatchHandleArchivadoProductoInventario, useGetProductosInventarioArchivados } from "@/modules/inventarios/hooks/inventarioHooks"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

export default function ArchivadosDialogo({ categoryId }: { categoryId: number }) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4
  
  const { 
    producto: archivedProducts = [], 
    totalProducto: totalArchived = 0,
    loadingProducto: loadingArchived
  } = useGetProductosInventarioArchivados(categoryId, currentPage, itemsPerPage)

  const { mutate: restaurarProducto } = usePatchHandleArchivadoProductoInventario()
  const totalPages = Math.ceil(totalArchived / itemsPerPage)

  const handleRestore = (inventarioId: number) => {
    restaurarProducto(
      { idInventario: inventarioId },
      {
        onSuccess: () => {
          toast.success('Producto restaurado correctamente')
          queryClient.invalidateQueries({ 
            queryKey: ["archivedProducts", categoryId, currentPage, itemsPerPage] 
          })
          queryClient.invalidateQueries({ 
            queryKey: ["inventario", categoryId] 
          })
        },
        onError: (error) => {
          console.error('Error restoring product:', error)
          toast.error('Error al restaurar el producto')
        }
      }
    )
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="update" size="sm" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Restaurar archivados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Productos archivados</DialogTitle>
          <DialogDescription>
            Selecciona los productos que deseas restaurar
          </DialogDescription>
        </DialogHeader>
        <div>
          {loadingArchived ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : archivedProducts.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No hay productos archivados</p>
          ) : (
            <div className="space-y-2">
              {archivedProducts.map((item) => (
                <div key={item.inventarioId} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{item.nombre}</p>
                    <p className="text-sm text-gray-500">Código: {item.codigo}</p>
                    <p className="text-sm text-gray-500">Unidad de medida: {item.unidadMedida.nombre + ' (' + item.unidadMedida.abreviatura +')'}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="update" 
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Restaurar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmar restauración</DialogTitle>
                      </DialogHeader>
                      <DialogDescription className="py-4">
                        <p>¿Estás seguro de que deseas restaurar el producto {item.nombre}?</p>
                        <div className="pt-6">
                        <span className="font-medium">Esto devolverá el producto al inventario con un stock en 0</span>
                        </div>
                      </DialogDescription>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="update"
                          className="flex-1"
                          onClick={() => handleRestore(item.inventarioId)}
                        >
                          Confirmar
                        </Button>
                        <DialogClose asChild>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loadingArchived}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loadingArchived}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}