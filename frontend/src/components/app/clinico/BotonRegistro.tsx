import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { MENSAJE_EXPEDIENTE_INACTIVO } from "./expedienteInactivo";
import { useExpedienteActivo } from "./useExpedienteActivo";

type Props = ComponentProps<typeof Button> & {
  expedienteId: number;
  /** Muestra el motivo junto al botón cuando está deshabilitado (botones principales de pantalla). */
  motivoVisible?: boolean;
};

// Botón de REGISTRO o EDICIÓN (nuevo, guardar borrador, confirmar, editar): con el expediente inactivo queda
// deshabilitado con el motivo (`title` y, en los principales, texto visible). Ver, filtrar, anular, vistas
// previas, «Volver» y «Cancelar» usan `Button` normal y siguen habilitados.
export default function BotonRegistro({ expedienteId, motivoVisible, disabled, title, children, ...props }: Props) {
  const { activo } = useExpedienteActivo(expedienteId);
  const boton = (
    <Button
      {...props}
      disabled={disabled || !activo}
      title={activo ? title : MENSAJE_EXPEDIENTE_INACTIVO}
      aria-describedby={activo ? props["aria-describedby"] : "motivo-expediente-inactivo"}
    >
      {children}
    </Button>
  );
  if (activo || !motivoVisible) return boton;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      {boton}
      <span id="motivo-expediente-inactivo" className="text-xs text-muted-foreground">Expediente inactivo: solo consulta.</span>
    </span>
  );
}
