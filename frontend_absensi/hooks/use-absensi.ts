"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllAbsensi,
  getAbsensiById,
  createAbsensi,
  updateAbsensi,
  deleteAbsensi,
  type CreateAbsensiRequest,
  type UpdateAbsensiRequest,
} from "@/lib/absensi";

const ABSENSI_QUERY_KEY = ["absensi"];

export function useAbsensi() {
  return useQuery({
    queryKey: ABSENSI_QUERY_KEY,
    queryFn: getAllAbsensi,
  });
}

export function useAbsensiById(id: number) {
  return useQuery({
    queryKey: [...ABSENSI_QUERY_KEY, id],
    queryFn: () => getAbsensiById(id),
    enabled: typeof id === "number" && !isNaN(id) && id > 0,
  });
}

export function useCreateAbsensi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAbsensiRequest) => createAbsensi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ABSENSI_QUERY_KEY });
    },
  });
}

export function useUpdateAbsensi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAbsensiRequest }) =>
      updateAbsensi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ABSENSI_QUERY_KEY });
    },
  });
}

export function useDeleteAbsensi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAbsensi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ABSENSI_QUERY_KEY });
    },
  });
}
