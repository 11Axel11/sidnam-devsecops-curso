import { useForm } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePatchFactura } from "../hooks/proveedoresHooks";
import type { defaultValuesFactura, EditarFactura } from "../models/proveedores";
import type { FormEditarFacturaProps } from "../types/proveedoresTypes";
import { toDateInput } from "@/utils/dateInputs";
import { useState } from "react";
import { editarFacturaSchema } from "../schemas/proveedor";
import CalendarField from "@/components/CalendarField";


export default function FormEditarFactura({
  idFactura,
  initial,
  onSuccess,
}: FormEditarFacturaProps) {

  const facturaMutation = usePatchFactura();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const defaults: defaultValuesFactura = {
    numero_factura: initial.numero_factura != null ? String(initial.numero_factura) : "",
    fecha_emitida: toDateInput(initial.fecha_emitida ?? ""),
    fecha_pago: toDateInput(initial.fecha_pago ?? ""),
    monto: initial.monto != null ? String(initial.monto) : "",
  };

  const form = useForm({
    defaultValues: defaults,
    onSubmit: async ({ value }) => {
      setFormErrors({});
      setServerError(null);
      const changed: Partial<EditarFactura> = {};

      if (value.numero_factura !== defaults.numero_factura) {
        changed.numero_factura = value.numero_factura;
      }
      if (value.fecha_emitida !== defaults.fecha_emitida) {
        changed.fecha_emitida = value.fecha_emitida;
      }
      if (value.fecha_pago !== defaults.fecha_pago) {
        changed.fecha_pago = value.fecha_pago;
      }
      if (value.monto !== defaults.monto) {
        changed.monto = value.monto;
      }
      if (Object.keys(changed).length === 0) {
        toast.info("No hay cambios por guardar");
        return;
      }
      
      const result = editarFacturaSchema.safeParse(value);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const path = err.path.join(".");
          fieldErrors[path] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      try {
        await facturaMutation.mutateAsync({ factura: changed, idFactura });
        toast.success("Factura actualizada", {
          description: "La factura ha sido actualizada correctamente.",
          duration: 4000,
        });
        onSuccess?.();
        form.reset();
      } catch (err: any) {
        if (err?.response?.status === 400) {
          toast.warning("No puedes hacer eso", {
            description: err.response?.data?.message || "Revisa los datos ingresados.",
            duration: 4000,
          });
        } else if (err?.response?.status === 403) {
          toast.warning("Acceso denegado", {
            description: err.response?.data?.message || "No tienes permisos para este recurso",
            duration: 4000,
          });
        } else {
          setServerError("Error en el servidor, por favor intenta más tarde");
        }
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form.Field
            name="numero_factura"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor="numero_factura">Número de factura</Label>
                <Input
                  id="numero_factura"
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej. 100245"
                />
                {formErrors["numero_factura"] && (
                  <p className="text-red-700 text-sm">{formErrors["numero_factura"]}</p>
                )}
              </div>
            )}
          />

        <form.Field
            name="monto"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor="monto">Monto</Label>
                <Input
                  id="monto"
                  type="decimal"
                  inputMode="decimal"
                  step="1000"
                  min="0"
                  max={10000000000000}
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej. 250000"
                />
                {formErrors["monto"] && (
                  <p className="text-red-700 text-sm">{formErrors["monto"]}</p>
                )}
              </div>
            )}
          />

        <form.Field
            name="fecha_emitida"
            children={(field) => (
              <div className="space-y-2">
                <Label>Fecha de emisión</Label>
                <CalendarField
                  disableFuture
                  className="w-full"
                  value={field.state.value}
                  onChange={(iso) => field.handleChange(iso ?? "")}
                />
                {formErrors["fecha_emitida"] && (
                  <p className="text-red-700 text-sm">{formErrors["fecha_emitida"]}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="fecha_pago"
            children={(field) => (
              <div className="space-y-2">
                <Label>Fecha límite de pago</Label>
                <CalendarField
                  className="w-full"
                  value={field.state.value}
                  onChange={(iso) => field.handleChange(iso ?? "")}
                />
                {formErrors["fecha_pago"] && (
                  <p className="text-red-700 text-sm">{formErrors["fecha_pago"]}</p>
                )}
              </div>
            )}
          />
      </div>

      {serverError && (
            <p className="text-red-700 text-sm text-center -mt-2">{serverError}</p>
            )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" variant={"create"}>
            Guardar
        </Button>
      </div>
    </form>
  );
}