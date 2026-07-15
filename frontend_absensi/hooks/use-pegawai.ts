"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllPegawai } from "@/lib/pegawai";

const PEGAWAI_QUERY_KEY = ["pegawai"];

export function usePegawai() {
  return useQuery({
    queryKey: PEGAWAI_QUERY_KEY,
    queryFn: getAllPegawai,
  });
}
