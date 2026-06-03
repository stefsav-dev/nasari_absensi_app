"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllLokasi,
  getLokasiById,
  createLokasi,
  updateLokasi,
  deleteLokasi,
  type CreateLokasiRequest,
} from "@/lib/lokasi";

const LOKASI_QUERY_KEY = ["lokasi"];

export function useLokasi() {
  return useQuery({
    queryKey: LOKASI_QUERY_KEY,
    queryFn: getAllLokasi,
  });
}

export function useLokasiById(id: number) {
  return useQuery({
    queryKey: [...LOKASI_QUERY_KEY, id],
    queryFn: () => getLokasiById(id),
    enabled: typeof id === "number" && !isNaN(id) && id > 0,
  });
}

export function useCreateLokasi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLokasiRequest) => createLokasi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOKASI_QUERY_KEY });
    },
  });
}

export function useUpdateLokasi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateLokasiRequest> }) =>
      updateLokasi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOKASI_QUERY_KEY });
    },
  });
}

export function useDeleteLokasi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteLokasi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOKASI_QUERY_KEY });
    },
  });
}
