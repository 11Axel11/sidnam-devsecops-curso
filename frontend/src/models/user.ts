export interface User {
    cedula : string,
    password: string
}
export interface UserRoles {
    id: number,
    rol: string
}

export interface AuthResponse {
  id: number;
}

export interface MePermissions {
  user: { id: string; name: string; roles: string[] };
  permissions: string[];   
  version: number;
};