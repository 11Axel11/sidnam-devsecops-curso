/** `request.user` lo deja AuthGuard con el payload del JWT (nunca viene del body). */
export interface ReqConUsuario {
  user: { id: number; roleId?: number | null };
}
