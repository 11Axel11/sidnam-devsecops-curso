import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGetMedicamentos, usePostEntradaMedicamento } from '../hooks/inventarioHooks';
import { useGetUnidadesMedida } from '@/hooks/use-unidadesMedida';

interface MedicamentoEntry {
  id: string;
  id_medicamento: string;
  id_unidad: string;
  cantidad: string;
}

interface AgregarEntradaMedicamentoProps {
  onSuccess?: () => void;
  children: React.ReactNode;
}

const AgregarEntradaMedicamento = ({ onSuccess, children }: AgregarEntradaMedicamentoProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<MedicamentoEntry[]>([
    { id: crypto.randomUUID(), id_medicamento: '', id_unidad: '', cantidad: '' }
  ]);

  const { medicamentos = [], loadingMedicamentos } = useGetMedicamentos();
  const { data: unidadesMedida = [] } = useGetUnidadesMedida(2);
  const { mutate: postEntrada, isPending: isSubmitting } = usePostEntradaMedicamento();

  const handleAddEntry = () => {
    setEntries([...entries, { id: crypto.randomUUID(), id_medicamento: '', id_unidad: '', cantidad: '' }]);
  };
  
  const handleRemoveEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validEntries = entries
      .filter(entry => 
        entry.id_medicamento && 
        entry.id_unidad && 
        entry.cantidad && 
        Number(entry.cantidad) > 0
      )
      .map(entry => ({
        medicamentoId: Number(entry.id_medicamento),
        unidadMedidaId: Number(entry.id_unidad),
        cantidad: Number(entry.cantidad)
      }));
      
    if (validEntries.length > 0) {
      postEntrada(
        { items: validEntries },
        {
          onSuccess: () => {
            toast.success('Entrada de medicamentos registrada exitosamente');
            setEntries([{ id: crypto.randomUUID(), id_medicamento: '', id_unidad: '', cantidad: '' }]);
            setIsOpen(false);
            onSuccess?.();
          },
          onError: (error) => {
            console.error('Error al registrar la entrada:', error);
            toast.error('Error al registrar la entrada de medicamentos');
          }
        }
      );
    } else {
      toast.error('Por favor complete todos los campos requeridos');
    }
  };

  const getAvailableMedicamentos = (currentId: string) => {
    const selectedIds = entries
      .map(e => e.id_medicamento)
      .filter((id): id is string => Boolean(id) && id !== currentId);

    const medicamentosArray = Array.isArray(medicamentos) 
      ? medicamentos 
      : medicamentos?.data || [];
      
    return medicamentosArray.filter((item: { id_medicamento: number }) => 
      !selectedIds.includes(item.id_medicamento.toString())
    );
  };

  const isFormValid = useMemo(() => {
    return entries.some(entry => 
      entry.id_medicamento && 
      entry.id_unidad && 
      entry.cantidad && 
      Number(entry.cantidad) > 0
    );
  }, [entries]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] flex flex-col w-6xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Agregar entrada de medicamentos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-1 py-2">
            <div className="space-y-4">
              {entries.map((entry) => {
                const availableMedicamentos = getAvailableMedicamentos(entry.id_medicamento);
                
                return (
                  <div key={entry.id} className="grid grid-cols-12 gap-6 items-end p-1 bg-muted/20 rounded-lg w-full">
                    <div className="col-span-4">
                      <label className="text-sm font-medium text-left mb-1 block">Medicamento</label>
                      <Select
                        value={entry.id_medicamento}
                        onValueChange={(value) =>
                          setEntries(
                            entries.map((e) =>
                              e.id === entry.id ? { ...e, id_medicamento: value } : e
                            )
                          )
                        }
                        disabled={loadingMedicamentos}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccione un medicamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMedicamentos.length > 0 ? (
                            availableMedicamentos.map((med: { id_medicamento: number; nombre: string }) => (
                              <SelectItem key={med.id_medicamento} value={med.id_medicamento.toString()}>
                                {med.nombre.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-products" disabled>
                              No hay medicamentos disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-4">
                      <label className="text-sm font-medium text-left mb-1 block">Unidad de medida</label>
                      <Select
                        value={entry.id_unidad}
                        onValueChange={(value) =>
                          setEntries(
                            entries.map((e) =>
                              e.id === entry.id ? { ...e, id_unidad: value } : e
                            )
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccione unidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {unidadesMedida && unidadesMedida.length > 0 ? (
                            unidadesMedida.map((unidad) => (
                              <SelectItem 
                                key={unidad.id_unidad} 
                                value={unidad.id_unidad.toString()}
                              >
                                {unidad.nombre} ({unidad.abreviatura})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-units" disabled>
                              No hay unidades de medida disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-3">
                      <label className="text-sm font-medium text-left mb-1 block">Cantidad</label>
                      <Input
                        type="number"
                        min="1"
                        value={entry.cantidad}
                        onChange={(e) =>
                          setEntries(
                            entries.map((item) =>
                              item.id === entry.id
                                ? { ...item, cantidad: e.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="Cantidad"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveEntry(entry.id)}
                        disabled={entries.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={handleAddEntry}
                disabled={isSubmitting}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar otro medicamento
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 pt-4">
            <Button variant={'create'} type="submit" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Guardar entradas'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgregarEntradaMedicamento;
