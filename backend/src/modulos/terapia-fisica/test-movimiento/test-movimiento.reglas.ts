/**
 * Reglas puras del Test de Movimiento y Coordinación (RF-TF-10, Anexo C), sin base de datos.
 */

export interface EjercicioCatalogo {
  id: number;
  nombre: string;
  /** Estado ACTUAL del ejercicio en el catálogo. */
  activo: boolean;
}

/**
 * Errores del arreglo de ejercicios de una aplicación contra el catálogo COMPLETO (activos e inactivos).
 * La aplicación debe traer **exactamente un elemento por cada ejercicio ACTIVO** del catálogo (Anexo C.2:
 * modalidad y resultado son obligatorios en todos); por eso:
 *  - un `ejercicioId` que no existe o está desactivado se rechaza;
 *  - un `ejercicioId` repetido se rechaza (defensa; el DTO ya lo impide);
 *  - un ejercicio activo que no se envió se reclama.
 * Se devuelven TODOS los problemas juntos (primero los de lo enviado, en el orden recibido; luego los
 * faltantes, en el orden del catálogo) para el `400 { errores }`: todo o nada.
 */
export function erroresDeEjercicios(idsEnviados: number[], catalogo: EjercicioCatalogo[]): string[] {
  const errores: string[] = [];
  const porId = new Map(catalogo.map((c) => [c.id, c]));
  const vistos = new Set<number>();

  for (const id of idsEnviados) {
    if (vistos.has(id)) {
      errores.push(`ejercicioId ${id} está repetido`);
      continue;
    }
    vistos.add(id);
    const c = porId.get(id);
    if (!c) errores.push(`ejercicioId ${id} no existe en el catálogo`);
    else if (!c.activo) errores.push(`ejercicioId ${id} ("${c.nombre}") está desactivado`);
  }

  for (const c of catalogo) {
    if (c.activo && !vistos.has(c.id)) {
      errores.push(`falta el ejercicioId ${c.id} ("${c.nombre}"): la aplicación debe incluir todos los ejercicios activos`);
    }
  }
  return errores;
}
