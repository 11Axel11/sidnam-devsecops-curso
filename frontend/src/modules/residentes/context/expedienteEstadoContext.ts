import { createContext, useContext } from "react";

export const ExpedienteEstadoContext = createContext<string | null>(null);

export function useExpedienteEstado() {
  return useContext(ExpedienteEstadoContext);
}
