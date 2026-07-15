import api from "./api";

export interface Pegawai {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface PegawaiListResponse {
  total: number;
  data: Pegawai[];
}

export async function getAllPegawai(): Promise<PegawaiListResponse> {
  const response = await api.get<{ success: boolean; data: PegawaiListResponse }>(
    "/protected/admin/pegawai"
  );
  return response.data.data;
}
