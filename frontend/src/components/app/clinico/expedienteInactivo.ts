import { dataDe, statusDe } from "@/utils/apiError";

// Mensaje fijo de la interfaz para un expediente inactivo (decisión de la Jefatura, octubre 2026): se
// bloquean los registros nuevos y los cambios de contenido clínico; ver, filtrar, anular y las vistas
// previas siguen disponibles.
export const MENSAJE_EXPEDIENTE_INACTIVO =
  "Expediente inactivo: solo consulta. Para registrar información, reactiva el expediente.";

// El backend responde 409 con `codigo: "EXPEDIENTE_INACTIVO"` al registrar o modificar contenido clínico en
// un expediente inactivo. Se reconoce SOLO por el código estable (nunca por el texto) para distinguirlo de
// los demás 409 (ya anulado, control ya vinculado, fuera de borrador…).
export const esExpedienteInactivo = (err: unknown): boolean =>
  statusDe(err) === 409 && dataDe<{ codigo?: string }>(err)?.codigo === "EXPEDIENTE_INACTIVO";
