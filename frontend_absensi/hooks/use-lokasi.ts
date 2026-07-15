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

export function useLokasi(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery({
    queryKey: [...LOKASI_QUERY_KEY, page, limit, search],
    queryFn: () => getAllLokasi(page, limit, search),
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
