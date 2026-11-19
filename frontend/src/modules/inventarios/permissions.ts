export const catPrefix: Record<string, string> = {
    '1': 'Inventariado.Alimentos',
    '2': 'Inventariado.Limpieza',
    '3': 'Inventariado.Medicamentos',
};

export const requireFor = (id: string, action: 'Ver' | 'Crear' | 'Actualizar' | 'Eliminar') => {
    const prefix = catPrefix[id];
    return prefix ? `${prefix}:${action}` : null;
};

/** Medicamentos (id 3) conserva su flujo legacy y sus permisos por categoría. */
export const esCategoriaLegacy = (categoryId: string | number) => String(categoryId) === '3';

export const nombreCategoria: Record<string, string> = {
    '1': 'Alimentos',
    '2': 'Limpieza',
    '3': 'Medicamentos',
};

export const categoriasPorSede: Record<'hogar' | 'cecuidam', number[]> = {
    hogar: [1, 2, 3],
    cecuidam: [1, 2],
};

// Los permisos NO dependen de la sede: son los mismos de siempre por categoría
// (Inventariado.<Categoría>:<Acción>) y aplican igual en Hogar y en CECUIDAM.
const solo = (id: string, action: 'Ver' | 'Crear' | 'Actualizar' | 'Eliminar') => {
    const perm = requireFor(id, action);
    return perm ? [perm] : [];
};

export const permsInventarioCategoria = (categoryId: string) => solo(categoryId, 'Ver');

export const permsVerCategoria = (categoryId: string | number) => solo(String(categoryId), 'Ver');

// Historial de entradas: Ver en la categoría (Medicamentos conserva su flujo legacy: Crear).
export const permsEntradasCategoria = (categoryId: string) =>
    esCategoriaLegacy(categoryId) ? solo(categoryId, 'Crear') : solo(categoryId, 'Ver');

// Registrar salida: Actualizar en la sección Salidas. Historial: Ver en Salidas o en la categoría.
export const PERM_SALIDAS_ACTUALIZAR = 'Inventariado.Salidas:Actualizar';

export const permsSalidasCategoria = (categoryId: string) => [
    PERM_SALIDAS_ACTUALIZAR,
    'Inventariado.Salidas:Ver',
    ...solo(categoryId, 'Ver'),
];

export const PERM_FACTURAS_VER = 'Proveduría.Facturas Proveduría:Ver';
export const PERM_FACTURAS_CREAR = 'Proveduría.Facturas Proveduría:Crear';
