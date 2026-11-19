// Un catálogo = una ruta del backend (src/modulos/catalogos/controllers) + su etiqueta.
// Los cinco comparten GET / POST / PATCH :id/desactivar / PATCH :id/reactivar.
export const CATALOGOS = {
  'antecedente-personal': { etiqueta: 'Antecedentes personales', ruta: '/catalogos/antecedente-personal' },
  'tipo-antecedente-traumatico': { etiqueta: 'Tipos de antecedente traumático', ruta: '/catalogos/tipo-antecedente-traumatico' },
  'tipo-evento-importante': { etiqueta: 'Tipos de evento importante', ruta: '/catalogos/tipo-evento-importante' },
  'ejercicio-test-movimiento': { etiqueta: 'Ejercicios del test de movimiento', ruta: '/catalogos/ejercicio-test-movimiento' },
  'dato-funcional-nutricion': { etiqueta: 'Datos funcionales de Nutrición', ruta: '/catalogos/dato-funcional-nutricion' },
} as const;

export type CatalogoKey = keyof typeof CATALOGOS;

export const CATALOGO_KEYS = Object.keys(CATALOGOS) as CatalogoKey[];

// Longitud de `nombre` en la entidad del backend (catalogo-base.entity.ts: varchar(150)).
export const NOMBRE_MAX = 150;
