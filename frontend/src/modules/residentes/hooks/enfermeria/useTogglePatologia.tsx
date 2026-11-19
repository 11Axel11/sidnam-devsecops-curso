import { useParams } from "@tanstack/react-router";
import { usePatologiasStore } from "../../store/enfermeriaStore";
import { useCreatePatologiaResidente, useDeletePatologiaResidente } from "./enfermeriaHooks";

export function useTogglePatologia() {
  const { id } = useParams({ from: "/residentes/$id/enfermeria/" });
  const { patologias, agregarPatologia, quitarPatologia } = usePatologiasStore();

  const crear = useCreatePatologiaResidente();
  const eliminar = useDeletePatologiaResidente();

  const togglePatologia = (idPatologia: number) => {
    const isSelected = patologias.includes(idPatologia);

    if (isSelected) {
      eliminar.mutate(
        { idExpediente: Number(id), idPatologia },
        { onSuccess: () => quitarPatologia(idPatologia) }
      );
    } else {
      crear.mutate(
        { idExpediente: Number(id), idPatologia },
        { onSuccess: () => agregarPatologia(idPatologia) }
      );
    }
  };

  return { togglePatologia, patologias };
}
