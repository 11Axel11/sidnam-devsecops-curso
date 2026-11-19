import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nombreSede } from "@/lib/sede";
import type { Sede } from "@/store/sedeStore";
import type { Existencia } from "../models/existencia";
import { usePostMovimiento } from "../hooks/existenciaHooks";
import { dataDe, mensajeError, statusDe } from "@/utils/apiError";

const movimientoSchema = z.object({
  inventarioId: z.number().min(1, "Seleccione un producto"),
  cantidad: z
    .number({ message: "Ingrese una cantidad" })
    .int("La cantidad debe ser un número entero")
    .positive("La cantidad debe ser mayor a 0"),
});

type Props = {
  tipo: 'entradas' | 'salidas';
  sede: Sede;
  existencias: Existencia[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultInventarioId?: number;
};

type Rechazo = { stockDisponible: number; abreviatura: string };

export default function MovimientoExistenciaDialogo({
  tipo, sede, existencias, open, onOpenChange, defaultInventarioId,
}: Props) {
  const esSalida = tipo === 'salidas';
  const mutation = usePostMovimiento(tipo);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rechazo, setRechazo] = useState<Rechazo | null>(null);

  const cerrar = (v: boolean) => {
    onOpenChange(v);
    if (!v) { setErrors({}); setRechazo(null); form.reset(); }
  };

  const form = useForm({
    defaultValues: { inventarioId: defaultInventarioId ?? 0, cantidad: "" },
    onSubmit: async ({ value }) => {
      setErrors({});
      setRechazo(null);

      const parsed = movimientoSchema.safeParse({
        inventarioId: value.inventarioId,
        cantidad: value.cantidad.trim() === "" ? undefined : Number(value.cantidad),
      });
      if (!parsed.success) {
        const fe: Record<string, string> = {};
        parsed.error.issues.forEach((i) => { fe[String(i.path[0])] = i.message; });
        setErrors(fe);
        return;
      }

      try {
        await mutation.mutateAsync({ ...parsed.data, fecha: new Date().toISOString() });
        toast.success(esSalida ? 'Salida registrada exitosamente' : 'Entrada registrada exitosamente');
        cerrar(false);
      } catch (err) {
        const status = statusDe(err);
        if (status === 422) {
          const d = dataDe<{ stockDisponible?: number }>(err);
          const e = existencias.find((x) => x.id === parsed.data.inventarioId);
          setRechazo({ stockDisponible: d?.stockDisponible ?? e?.stock ?? 0, abreviatura: e?.unidadMedida?.abreviatura ?? '' });
        } else if (status === 403) {
          toast.warning('Acceso denegado', { description: mensajeError(err, 'No tienes permisos para esta acción.') });
        } else {
          setErrors({ server: mensajeError(err, 'Error al registrar el movimiento. Intenta de nuevo.') });
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esSalida ? 'Agregar salida' : 'Agregar entrada'}</DialogTitle>
          <DialogDescription>Registro en {nombreSede[sede]}.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
          className="space-y-4 text-left text-black"
        >
          <form.Field name="inventarioId" children={(field) => (
            <div>
              <Label className="font-semibold">Producto:</Label>
              <Select
                value={field.state.value ? String(field.state.value) : ''}
                onValueChange={(v) => { setRechazo(null); field.handleChange(Number(v)); }}
              >
                <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccione un producto" /></SelectTrigger>
                <SelectContent>
                  {existencias.filter((e) => !e.archivado).map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.producto?.codigo} — {e.producto?.nombre} (stock: {e.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.inventarioId && <p className="text-red-700 text-sm">{errors.inventarioId}</p>}
            </div>
          )} />

          <form.Field name="cantidad" children={(field) => (
            <div>
              <Label className="font-semibold" htmlFor="cantidad">Cantidad:</Label>
              <Input
                id="cantidad" className={`mt-1 ${rechazo ? 'border-red-500' : ''}`} inputMode="numeric"
                value={field.state.value}
                onChange={(e) => { setRechazo(null); field.handleChange(e.target.value.replace(/[^\d]/g, '')); }}
              />
              {errors.cantidad && <p className="text-red-700 text-sm">{errors.cantidad}</p>}
            </div>
          )} />

          {rechazo && (
            <div className="rounded-md bg-red-50 p-3 text-red-700" role="alert">
              <p className="font-semibold text-sm">No es posible registrar esta salida</p>
              <p className="text-xs mt-1">
                La existencia disponible en {nombreSede[sede]} es de {rechazo.stockDisponible} {rechazo.abreviatura}.
                No se puede registrar una salida mayor (RN-11).
              </p>
            </div>
          )}

          {errors.server && <p className="text-red-700 text-sm text-center">{errors.server}</p>}

          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
            <Button type="submit" variant="create" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
