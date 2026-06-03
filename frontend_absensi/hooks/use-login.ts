"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { loginUser, type LoginRequest, type ApiErrorResponse } from "@/lib/auth";
import type { AxiosError } from "axios";

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginRequest) => loginUser(data),
    onSuccess: (data) => {
      // Store tokens in localStorage
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      // Redirect to dashboard
      router.push("/admin/dashboard");
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      // Error is handled by the component consuming this hook
      console.error(
        "Login failed:",
        error.response?.data?.error || error.message,
      );
    },
  });
}
