export interface Rol {
    id_rol: number,
    nombre: string,
    descripcion: string,
    estado: string
}
export interface CrearRol {
    id_rol?: number,
    nombre: string,
    descripcion: string
}
export interface RolResponse {
  id_rol: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
  deletedAt: string | null;
}
export interface Permiso {
    id_permiso: number;
    modulo: string;
    seccion: string;
};

export interface Accion {
    id: number;
    accion: "Ver" | "Crear" | "Actualizar" | "Eliminar" | string;
};
export interface AccionRol {
    id_accion: number;
    accion: "Ver" | "Crear" | "Actualizar" | "Eliminar" | string;
    activo: boolean;
};
export interface PermisoRol {
    id_permiso: number;
    modulo: string;
    seccion: string;
    acciones: AccionRol[];
};

export interface RolPermisos {
    id_rol: number,
    nombre: string,
    descripcion: string,
    estado: string,
    permisos: PermisoRol[]
}

export type PatchRolPayload = {
    nombre: string;
    descripcion?: string;
};