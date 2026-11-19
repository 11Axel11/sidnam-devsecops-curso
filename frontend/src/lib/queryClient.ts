import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 401 here already went through the refresh interceptor; retrying only repeats it.
      retry: (failureCount, error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status === 401 || status === 403) return false;
        return failureCount < 3;
      },
    },
  },
});
