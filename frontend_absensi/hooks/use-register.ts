"use client"

import { ApiErrorResponse, RegisterRequest, registerUser } from "@/lib/auth";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation"

export function useRegister() {
   const router = useRouter();
   
   return useMutation({
    mutationFn: (data: RegisterRequest) => registerUser(data),
    onSuccess: (data) => {
        // Tokens are still saved if backend returns them, but we don't automatically redirect
        // so the user can see the success message.
        if (data?.access_token) localStorage.setItem("access_token", data.access_token);
        if (data?.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
        console.error(
            "Register Failed:",
            error.response?.data?.error || error.message,
        );
    },
   })
}