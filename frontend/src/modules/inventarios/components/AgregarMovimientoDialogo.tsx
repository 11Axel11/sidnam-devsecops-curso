import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useInventarioQuery } from '../hooks/existenciaHooks';
import { toast } from 'sonner';
import { nombreCategoria } from '../permissions';
import type { Sede } from '@/store/sedeStore';
import { nombreSede } from '@/lib/sede';

export type MovimientoTipo = 'entrada' | 'salida';

interface MovimientoFormData {
  id: string;
  inventarioId: string;
  cantidad: string;
}

interface AgregarMovimientoDialogoProps {
  categoryId: number;
  sede: Sede;
  tipo: MovimientoTipo;
  /** Throw to keep the dialog open (e.g. when the request fails). */
  onSuccess?: (movimientos: { inventarioId: number; cantidad: number }[]) => void | Promise<void>;
  defaultInventarioId?: number;
  children: React.ReactNode;
}

const AgregarMovimientoDialogo = ({ categoryId, sede, tipo, onSuccess, defaultInventarioId, children }: AgregarMovimientoDialogoProps) => {
  const [isOpen, setIsOpen] = useState(defaultInventarioId !== undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries] = useState<MovimientoFormData[]>([
    { id: crypto.randomUUID(), inventarioId: defaultInventarioId ? String(defaultInventarioId) : '', cantidad: '' }
  ]);

  const { data: existencias, isLoading: loadingInventario } = useInventarioQuery({ sede, categoria: categoryId, archivado: false });
  const inventario = useMemo(
    () => (existencias?.data ?? []).map((e) => ({
      id: e.id,
      nombre: e.producto?.nombre ?? '—',
      abreviatura: e.unidadMedida?.abreviatura ?? '',
      stock: e.stock,
    })),
    [existencias],
  );

  const createEmptyEntry = (): MovimientoFormData => ({
    id: crypto.randomUUID(),
    inventarioId: '',
    cantidad: ''
  });

  const handleAddEntry = () => {
    setEntries([...entries, createEmptyEntry()]);
  };
  
  const handleRemoveEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const handleCancel = () => {
    setEntries([createEmptyEntry()]);
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validEntries = entries
      .filter(entry => entry.inventarioId && entry.cantidad && Number(entry.cantidad) > 0)
      .map(entry => ({
        inventarioId: Number(entry.inventarioId),
        cantidad: Number(entry.cantidad)
      }));

    if (validEntries.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSuccess?.(validEntries);
      setEntries([createEmptyEntry()]);
      setIsOpen(false);
    } catch {
      // The caller already reported the error; keep the entries so the user can fix them.
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvailableInventario = (currentId: string) => {
    const selectedIds = entries
      .map(e => e.inventarioId)
      .filter((id): id is string => Boolean(id) && id !== currentId);
      
    return inventario.filter(item => !selectedIds.includes(item.id.toString()));
  };

  const isFormValid = useMemo(() => {
    return entries.some(entry => entry.inventarioId && entry.cantidad && Number(entry.cantidad) > 0);
  }, [entries]);

  const movimientoText = tipo === 'entrada' ? 'entrada' : 'salida';
  const movimientoTextPlural = tipo === 'entrada' ? 'entradas' : 'salidas';
  const categoriaName = (nombreCategoria[String(categoryId)] ?? 'inventario').toLowerCase();

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div onClick={handleTriggerClick}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] flex flex-col max-w-4xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Registrar {movimientoTextPlural} de {categoriaName} — {nombreSede[sede]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-1 py-2">
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-12 gap-4 p-2 bg-muted/20 rounded-lg items-start auto-rows-max">
                  <div className="col-span-5 flex flex-col">
                    <label className="text-sm font-medium mb-1 block">Producto</label>
                    <Select
                      value={entry.inventarioId}
                      onValueChange={(value) => 
                        setEntries(entries.map(e => 
                          e.id === entry.id ? { ...e, inventarioId: value } : e
                        ))
                      }
                      disabled={loadingInventario}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableInventario(entry.inventarioId).length > 0 ? (
                          getAvailableInventario(entry.inventarioId).map((item) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              <div className="flex justify-between w-full">
                                <span className="truncate max-w-[300px]">{item.nombre} ({item.abreviatura})</span>
                                <span className="text-muted-foreground ml-2">
                                  Stock: {item.stock}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-products" disabled>
                            No hay más productos disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-4 flex flex-col">
                    <label className="text-sm font-medium mb-1 block">Cantidad</label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={entry.cantidad}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setEntries(entries.map(ent => 
                            ent.id === entry.id ? { ...ent, cantidad: value } : ent
                          ));
                        }
                      }}
                      onBlur={(e) => {
                        const selectedItem = inventario.find(i => i.id.toString() === entry.inventarioId);
                        const quantity = Number(e.target.value);
                        if (tipo === 'salida' && selectedItem && quantity > selectedItem.stock) {
                          toast.error('La cantidad no puede ser mayor al stock disponible');
                        }
                      }}
                      placeholder="0"
                      className="w-full"
                      max={tipo === 'salida' ? (() => {
                        const selectedItem = inventario.find(i => i.id.toString() === entry.inventarioId);
                        return selectedItem ? selectedItem.stock : undefined;
                      })() : undefined}
                    />
                    {tipo === 'salida' && entry.inventarioId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Máximo: {inventario.find(i => i.id.toString() === entry.inventarioId)?.stock || 0}
                      </p>
                    )}
                  </div>
                  
                  <div className="col-span-3 flex items-start justify-end mt-6">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveEntry(entry.id)}
                      className="text-white hover:text-white/80"
                      disabled={entries.length <= 1}
                    >
                      <Trash2/>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              variant="create"
            >
              {isSubmitting ? 'Guardando…' : `Registrar ${movimientoTextPlural}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddEntry}
              className="w-full sm:w-auto"
            >
              <Plus />
              Añadir otra {movimientoText}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgregarMovimientoDialogo;