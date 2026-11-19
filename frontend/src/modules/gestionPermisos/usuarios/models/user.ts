import type { PermisoRol, Rol } from "../../roles/models/roles";

export interface Usuario {
    id: string,
    cedula: string,
    name: string,
    apellido1: string,
    apellido2: string,
    email: string,
    estado: string,
    rol: Rol
}
export interface CrearUsuario {
    cedula: string;
    email: string;
    name: string;
    apellido1: string;
    apellido2?: string;
    password: string;
    idRol: number
}

export interface RolConPermisos {
    id_rol: number;
    nombre: string;
    descripcion: string;
    permisos: PermisoRol[];
};

export interface UsuarioDetalle {
    id: number;
    cedula: string;
    name: string;
    apellido1: string;
    apellido2?: string | null;
    email: string;
    estado?: boolean | string;
    rol?: RolConPermisos | null;
    createdAt: string
};

export interface RolPerfil {
    nombre: string,
};
export interface UsuarioPerfil {
    id: number;
    cedula: string;
    name: string;
    apellido1: string;
    apellido2?: string | null;
    email: string;
    rol: RolPerfil,
    createdAt: string
    imagenUrl: string;
};
export interface EditarPerfil {
    id?: number;
    cedula?: string;
    name?: string;
    apellido1?: string;
    apellido2?: string | null;
    email?: string;
};