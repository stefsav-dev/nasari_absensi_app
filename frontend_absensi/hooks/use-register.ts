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
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        
        router.push("/");
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
        console.error(
            "Register Failed:",
            error.response?.data?.error || error.message,
        );
    },
   })
}