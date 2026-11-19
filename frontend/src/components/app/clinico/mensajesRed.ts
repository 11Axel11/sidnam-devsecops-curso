import { toast } from "sonner";

// Sin respuesta del servidor (corte de red, servidor caído): el formulario conserva lo escrito.
export const MENSAJE_RED =
  "No hay conexión con el servidor. Tus cambios siguen en el formulario: revisa tu conexión e intenta guardar de nuevo.";

export const toastRedCaida = () =>
  toast.error("No hay conexión con el servidor", {
    description: "Tus cambios siguen en el formulario.",
    duration: 6000,
  });
