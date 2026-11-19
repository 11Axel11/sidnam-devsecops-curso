/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import CalendarField from "@/components/CalendarField";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateFactura } from "../hooks/proveedoresHooks";
import { crearFacturaSchema } from "../schemas/proveedor";
import SedeToggle from "@/components/SedeToggle";
import { mensajeError } from "@/utils/apiError";
import type { Sede } from "@/store/sedeStore";

type Props = {
  sede?: Sede;
  proveedorId: number;
  proveedorNombre?: string;
  onSuccess?: (proveedorId: number) => void;
  onCancel?: () => void;
};

const FormCrearFacturaEmbed = ({
  sede,
  proveedorId,
  proveedorNombre,
  onSuccess,
  onCancel,
}: Props) => {
  const queryClient = useQueryClient();
  const crearFactura = useCreateFactura();

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      sede: sede ?? ("hogar" as Sede),
      proveedor_id: proveedorId,
      numero_factura: "",
      fecha_emision: "",
      fecha_pago: "",
      monto: "" as unknown as any,
    },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      setServerError(null);

      const valueWithRoute = { ...value, proveedor_id: String(proveedorId) };

      const result = crearFacturaSchema.safeParse(valueWithRoute);
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
        await crearFactura.mutateAsync({ factura: { ...result.data, proveedor_id: result.data.proveedor_id } });
        toast.success("Factura creada", {
          description: "La factura ha sido registrada correctamente.",
          duration: 4000,
        });

        form.reset();
        queryClient.invalidateQueries({ queryKey: ["facturasProveedor"] });

        onSuccess?.(proveedorId);
      } catch (err: any) {
        if (err?.response?.status === 400) {
          setServerError(mensajeError(err, "Revisa los datos ingresados."));
        } else if (err?.response?.status === 403) {
          toast.warning("Acceso denegado", {
            description:
              err.response?.data?.message ||
              "No tienes permisos para este recurso",
            duration: 4000,
          });
        } else {
          setServerError("Error en el servidor, por favor intenta más tarde");
        }
      }
    },
  });

  return (
    <div className="sm:max-w-[520px] mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">
          Agregar factura {proveedorNombre ? `— ${proveedorNombre}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground">
          Completa los datos para registrar una nueva factura del proveedor.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="sede"
          children={(field) => (
            <div className="space-y-2">
              <Label>Sede *</Label>
              <SedeToggle
                opciones={["hogar", "cecuidam"] as Sede[]}
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
              />
              {formErrors["sede"] && <p className="text-red-700 text-sm">{formErrors["sede"]}</p>}
            </div>
          )}
        />

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
                <p className="text-red-700 text-sm">
                  {formErrors["numero_factura"]}
                </p>
              )}
            </div>
          )}
        />

        <form.Field
          name="fecha_emision"
          children={(field) => (
            <div className="space-y-2">
              <Label>Fecha de emisión</Label>
              <CalendarField
                disableFuture
                className="w-full"
                value={field.state.value}
                onChange={(iso) => field.handleChange(iso)}
              />
              {formErrors["fecha_emision"] && (
                <p className="text-red-700 text-sm">
                  {formErrors["fecha_emision"]}
                </p>
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
                onChange={(iso) => field.handleChange(iso)}
              />
              {formErrors["fecha_pago"] && (
                <p className="text-red-700 text-sm">
                  {formErrors["fecha_pago"]}
                </p>
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
                placeholder="Ej. 10.900,20"
              />
              {formErrors["monto"] && (
                <p className="text-red-700 text-sm">{formErrors["monto"]}</p>
              )}
            </div>
          )}
        />

        {serverError && (
          <p className="text-red-700 text-sm text-center -mt-2">
            {serverError}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button type="submit" disabled={crearFactura.isPending}
            variant={"create"}>
            {crearFactura.isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FormCrearFacturaEmbed;
