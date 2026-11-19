import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

const clampCantidad = (cantidad: number, stock: number) => {
  const safeStock = Math.max(0, stock);
  if (safeStock === 0) return 0;
  return Math.min(safeStock, Math.max(1, cantidad));
};

export type ProductoSalida = {
  inventarioId: number;
  stock: number;
  nombreProducto: string;
  nombreUnidadMedida: string;
  abreviaturaUnidadMedida: string;
  imagen: string;
  cantidad: number;
};

type SalidasState = {
  productos: ProductoSalida[];
  addProducto: (producto: ProductoSalida) => void;
  updateCantidad: (id: number, cantidad: number) => void;
  removeProducto: (id: number) => void;
  clearProductos: () => void;
};

const storage: StateStorage = {
    getItem: (name: string): string | null => {
      return localStorage.getItem(name);
    },
    setItem: (name: string, value: string): void => {
      localStorage.setItem(name, value);
    },
    removeItem: (name: string): void => {
      localStorage.removeItem(name);
    },
  };

export const useSalidasStore = create<SalidasState>()(
  persist(
    (set) => ({
      productos: [],
      addProducto: (producto) => 
        set((state) => {
            const exists = state.productos.some(p => p.inventarioId === producto.inventarioId);
            if (exists) {
              return {
                productos: state.productos.map(p => 
                  p.inventarioId === producto.inventarioId
                    ? { ...p, cantidad: clampCantidad(p.cantidad + producto.cantidad, p.stock) }
                    : p
                )
              };
            }
            return { productos: [...state.productos, { ...producto, cantidad: clampCantidad(producto.cantidad, producto.stock) }] };
        }),

      updateCantidad: (id, cantidad) =>
        set((state) => ({
          productos: state.productos.map((p) =>
            p.inventarioId === id ? { ...p, cantidad: clampCantidad(cantidad, p.stock) } : p
          ),
        })),

      removeProducto: (id) =>
        set((state) => ({
          productos: state.productos.filter((p) => p.inventarioId !== id),
        })),

      clearProductos: () => set({ productos: [] }),
    }),
    {
      name: 'salidas-storage',
      storage: createJSONStorage(() => storage),
    }
  )
);