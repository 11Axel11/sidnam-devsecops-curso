import { useSalidasStore } from "@/store/salidasStore";
import { postSalida } from "../services/inventarioService";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Trash2, Plus } from "lucide-react";

const QtyControl = ({
  value, min = 1, max, onChange,
}: { value: number; min?: number; max: number; onChange: (v: number) => void }) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-10 sm:w-12 xl:w-12 h-9 sm:h-12 xl:h-12 sm:rounded-full border grid place-items-center"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="w-4 h-4" />
      </Button>

      <input
        className="w-10 sm:w-20 xl:w-12 h-9 sm:h-12 xl:h-12 text-center  text-md sm:text-xl xl:text-base border rounded-md"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value || "0");
          if (Number.isFinite(n)) onChange(Math.min(Math.max(min, n), max));
        }}
      />

      <Button
        type="button"
        variant="outline"
        className="w-10 sm:w-12 xl:w-12 h-9 sm:h-12 xl:h-12 sm:rounded-full border grid place-items-center"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
};

const FormSalidas = () => {
  const { productos, updateCantidad, removeProducto, clearProductos } = useSalidasStore();
  const navigate = useNavigate();

  const totalItems = useMemo(
    () => productos.reduce((acc, p) => acc + p.cantidad, 0),
    [productos]
  );

  const clear = () => {
    clearProductos();
    navigate({ to: "/salidas" });
  };

  const submit = async () => {
    if (productos.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    const payload = {
      productos: productos.map(p => ({
        inventarioId: p.inventarioId,
        cantidad: p.cantidad,
      })),
    };

    try {
      await postSalida(payload);
      toast.success("Salida registrada");
      clear();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Error registrando la salida");
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-4 xl:gap-4 justify-between xl:mt-1 max-h-96 sm:pb-1 xl:pb-4 overflow-y-auto">
      <div className="space-y-3 max-h-96 xl:max-h-45 overflow-auto">
        {productos.length === 0 && (
          <div className="text-sm sm:text-xl xl:text-lg text-center opacity-60">
            No hay productos seleccionados.
          </div>
        )}

        {productos.map((p) => (
          <div
            key={p.inventarioId}
            className="flex flex-col sm:flex-row items-center gap-3 border-1 border-gray-300 sm:border rounded-xl p-3 xl:p-4"
          >
            <div className="flex-1">
              <p className="font-medium text-sm sm:text-xl xl:text-lg leading-tight">{p.nombreProducto}</p>
              <p className="text-sm sm:text-lg xl:text-base opacity-70">{p.nombreUnidadMedida} ({p.abreviaturaUnidadMedida})   •   Stock: {p.stock}</p>
            </div>

            <div className="flex items-center gap-2">
              <QtyControl
                value={p.cantidad}
                max={p.stock}
                onChange={(v) => updateCantidad(p.inventarioId, v)}
              />

              <Button
                type="button"
                variant="destructive"
                className="ml-2 w-9 sm:w-12 xl:w-12 h-9 sm:h-12 xl:h-12 xl:ml-2 text-red-600 text-sm"
                onClick={() => removeProducto(p.inventarioId)}
              >
                <Trash2 className="h-3 sm:h-6 w-3 sm:w-6  text-white"/>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="xl:mt-0">
        <div className="ml-auto flex items-center justify-end gap-1 sm:gap-3 xl:gap-2 text-sm sm:text-lg xl:text-base opacity-70 mb-1 xl:mb-2">
          <span>Total items:</span>
          <span className="font-semibold">{totalItems}</span>
        </div>

        <div className="flex items-center justify-center">
          <Button
            type="button"
            variant="create"
            onClick={() => navigate({ to: "/agregarproducto" })}
            className="flex items-center py-5 sm:px-8 sm:py-7 xl:px-10 xl:py-6 w-full sm:w-64 xl:w-80 rounded-lg border shadow-sm hover:shadow text-sm sm:text-lg xl:text-base justify-center"
          >
            <Plus className="w-3 sm:w-4 h-3 sm:h-4 mr-2 xl:w-4 xl:h-4" />
            Agregar producto
          </Button>
        </div>
      </div>

        {productos.length > 0 && (
        <div className="flex sm:gap-16 xl:gap-8 items-center justify-between sm:justify-center mt-2 sm:mt-6 xl:mt-1 xl:max-w-2xl xl:mx-auto">
            <Button
            type="button"
            variant="approve"
            onClick={submit}
            className="py-5 sm:px-8 sm:py-7 xl:px-10 xl:py-6 w-36 sm:w-46 xl:w-64 rounded-lg text-sm sm:text-lg hover:brightness-95 xl:text-base justify-center"
            >
            Enviar
            </Button>

            <Button
            type="button"
            variant="outline"
            onClick={() => clear()}
            className="py-5 sm:px-8 sm:py-7 xl:px-10 xl:py-6 w-36 sm:w-46 xl:w-64 rounded-lg text-sm sm:text-lg bg-gray-200 hover:bg-gray-300 xl:text-base justify-center"
            >
            Cancelar
            </Button>
        </div>
        )}
    </div>
  );
};

export default FormSalidas;