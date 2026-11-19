import AnularRegistroDialogo from "@/components/app/clinico/AnularRegistroDialogo";
import { eventoKeys, useAnularEvento } from "../hooks/eventosHooks";

type Props = {
  eventoId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AnularEventoDialogo({ eventoId, open, onOpenChange }: Props) {
  const anular = useAnularEvento();

  return (
    <AnularRegistroDialogo
      open={open}
      onOpenChange={onOpenChange}
      titulo="Anular evento importante"
      descripcion={
        "El evento no se elimina: queda anulado con el motivo, la persona y la fecha. " +
        "Después puedes registrar el evento correcto con «Nuevo evento»."
      }
      textoBoton="Anular evento"
      placeholder="Ej. Se registró en el expediente equivocado"
      mensajeObligatorio="El motivo es obligatorio para anular el evento."
      mensajeFallo="No se pudo anular el evento."
      mensajeExito="Evento anulado"
      informativos={{
        409: "El evento ya está anulado.",
        404: "El evento ya no existe.",
      }}
      enCurso={anular.isPending}
      onAnular={(motivo) => anular.mutateAsync({ id: eventoId, motivo })}
      claveRaiz={eventoKeys.raiz}
    />
  );
}
