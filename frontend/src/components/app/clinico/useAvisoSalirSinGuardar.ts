import { useEffect, useRef } from "react";
import { useBlocker } from "@tanstack/react-router";

// Aviso al salir de un formulario clínico con cambios sin guardar. Solo se bloquean las salidas a
// OTRA ruta; cambiar el `?search` de la misma pantalla (guardar, volver al historial) no pregunta.
// Recargar o cerrar la pestaña usa el aviso del propio navegador.
export function useAvisoSalirSinGuardar(sinGuardar: boolean) {
  // Se lee desde una ref: al guardar, la navegación a `?valoracion=<id>` ocurre antes de que React
  // vuelva a renderizar con el estado ya limpio. Se sincroniza en cada render (no solo al cambiar el
  // valor) para que un guardado que deja el formulario igual de «sucio» no deje la ref desfasada.
  const sinGuardarRef = useRef(false);
  useEffect(() => { sinGuardarRef.current = sinGuardar; });

  const bloqueo = useBlocker({
    shouldBlockFn: ({ current, next }) => sinGuardarRef.current && current.pathname !== next.pathname,
    enableBeforeUnload: () => sinGuardarRef.current,
    withResolver: true,
  });

  return {
    bloqueo,
    /** Llamar justo después de un guardado correcto, antes de navegar. */
    marcarGuardado: () => { sinGuardarRef.current = false; },
  };
}

export type BloqueoSalida = ReturnType<typeof useAvisoSalirSinGuardar>["bloqueo"];
