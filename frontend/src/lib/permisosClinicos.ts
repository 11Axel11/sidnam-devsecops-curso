// Permisos del Bloque B (Nutrición y Terapia Física). Formato del backend: `Modulo.Seccion:Accion`,
// secciones gruesas y sin tildes, con la misma grafía que /autenticacion/me.
//
// El backend solo conoce Ver, Crear y Actualizar. Confirmar, anular, desactivar y reactivar
// se autorizan con `:Actualizar`, por eso aquí son alias y no cadenas propias.
// Eliminar no se usa en este bloque.

const seccion = (modulo: string, nombre: string) => {
  const base = `${modulo}.${nombre}`;
  return {
    ver: `${base}:Ver`,
    crear: `${base}:Crear`,
    actualizar: `${base}:Actualizar`,
  } as const;
};

const nutricion = seccion('Nutricion', 'Nutricion');
const terapiaFisica = seccion('TerapiaFisica', 'TerapiaFisica');
const catalogos = seccion('Catalogos', 'Catalogos');

export const PERM = {
  nutricion: {
    ...nutricion,
    confirmar: nutricion.actualizar,
    anular: nutricion.actualizar,
  },
  terapiaFisica: {
    ...terapiaFisica,
    confirmar: terapiaFisica.actualizar,
    anular: terapiaFisica.actualizar,
  },
  fichaResumen: {
    ver: 'FichaResumen.FichaResumen:Ver',
  },
  catalogos: {
    ...catalogos,
    desactivar: catalogos.actualizar,
    reactivar: catalogos.actualizar,
  },
} as const;
