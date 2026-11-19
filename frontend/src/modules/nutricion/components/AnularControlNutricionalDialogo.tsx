import AnularRegistroDialogo from "@/components/app/clinico/AnularRegistroDialogo";
import { controlNutricionalKeys, useAnularControlNutricional } from "../hooks/controlNutricionalHooks";

type Props = {
  controlId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AnularControlNutricionalDialogo({ controlId, open, onOpenChange }: Props) {
  const anular = useAnularControlNutricional();

  return (
    <AnularRegistroDialogo
      open={open}
      onOpenChange={onOpenChange}
      titulo="Anular control nutricional"
      descripcion={
        "El control no se elimina: queda anulado con el motivo, la persona y la fecha, y deja de usarse como " +
        "referencia de las variaciones. Después puedes registrar el control correcto con «Nuevo control»."
      }
      textoBoton="Anular control"
      placeholder="Ej. Se digitó 90 kg en lugar de 59 kg"
      mensajeObligatorio="El motivo es obligatorio para anular el control."
      mensajeFallo="No se pudo anular el control."
      mensajeExito="Control anulado"
      informativos={{
        409: "El control ya está anulado.",
        404: "El control ya no existe.",
      }}
      enCurso={anular.isPending}
      onAnular={(motivo) => anular.mutateAsync({ id: controlId, motivo })}
      claveRaiz={controlNutricionalKeys.raiz}
    />
  );
}
