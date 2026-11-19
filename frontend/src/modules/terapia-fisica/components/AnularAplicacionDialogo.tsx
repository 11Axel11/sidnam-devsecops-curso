import AnularRegistroDialogo from "@/components/app/clinico/AnularRegistroDialogo";
import { testMovimientoKeys, useAnularAplicacion } from "../hooks/testMovimientoHooks";

type Props = {
  aplicacionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AnularAplicacionDialogo({ aplicacionId, open, onOpenChange }: Props) {
  const anular = useAnularAplicacion();

  return (
    <AnularRegistroDialogo
      open={open}
      onOpenChange={onOpenChange}
      titulo="Anular aplicación del test"
      descripcion={
        "La aplicación no se elimina: queda anulada completa, con sus ejercicios, el motivo, la persona y la fecha. " +
        "Después puedes registrar la aplicación correcta con «Nueva aplicación»."
      }
      textoBoton="Anular aplicación"
      placeholder="Ej. Se registró en el expediente equivocado"
      mensajeObligatorio="El motivo es obligatorio para anular la aplicación."
      mensajeFallo="No se pudo anular la aplicación."
      mensajeExito="Aplicación anulada"
      informativos={{
        409: "La aplicación ya está anulada.",
        404: "La aplicación ya no existe.",
      }}
      enCurso={anular.isPending}
      onAnular={(motivo) => anular.mutateAsync({ id: aplicacionId, motivo })}
      claveRaiz={testMovimientoKeys.raiz}
    />
  );
}
