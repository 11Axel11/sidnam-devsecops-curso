import sidnamAPI from "@/api/apiConfig";
import type { MePermissions, UserRoles } from "@/models/user";

export async function login(data: { cedula: string; password: string }) {
  const response = await sidnamAPI.post('/autenticacion/login', data);
  return response.data;
}

export async function logout(): Promise<{ message: string }> {
  const response = await sidnamAPI.post('/autenticacion/logout');
  return response.data;
}

export async function forgotPassword(email: string) {
  const response = await sidnamAPI.post('/autenticacion/forgot-password', { email });
  return response.data;
}

export async function resetPassword(data: { token: string; password: string }) {
  const response = await sidnamAPI.post('/autenticacion/reset-password', data);
  return response.data;
}

export const getRoles = async (): Promise<UserRoles[]> => {
  const response = await sidnamAPI.get<UserRoles[]>("/gestion-usuario/getRoles");
  return response.data;
};

export async function getMePermissions() {
  return sidnamAPI.get<MePermissions>("/autenticacion/me");
}
