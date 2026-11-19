import type { AuthResponse } from "@/models/user";
import {
  forgotPassword,
  getRoles,
  login,
  resetPassword,
} from "@/services/login";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useLogin(onSuccessCallback?: (data: AuthResponse) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: async (data: AuthResponse) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
      await queryClient.resetQueries({ queryKey: ['me'] });
      onSuccessCallback?.(data);
    },
  });
}

export function useForgotPassword() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfil"] });
    },
  });

  return mutation;
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfil"] });
    },
  });

  return mutation;
}

export function useGetRoles() {
  const {
    data: Roles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  return {
    Roles,
    loadingRoles: isLoading,
    errorRoles: error,
  };
}
