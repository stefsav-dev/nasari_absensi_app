import api from "./api";

// ─── Types ───────────────────────────────────────────────

export interface Lokasi {
  id: number;          // json:"id"
  nama_lokasi: string; // json:"nama_lokasi"
  latitude: number;    // json:"latitude"
  longitude: number;   // json:"longitude"
  radius: number;      // json:"radius"
  created_at: string;  // json:"created_at"
  updated_at: string;  // json:"updated_at"
}

export interface CreateLokasiRequest {
  nama_lokasi: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface LokasiListResponse {
  total: number;
  lokasi: Lokasi[];
}

// ─── API Functions ───────────────────────────────────────

export async function getAllLokasi(): Promise<LokasiListResponse> {
  const response = await api.get<{ success: boolean; data: LokasiListResponse }>(
    "/protected/admin/lokasi"
  );
  return response.data.data;
}

export async function getLokasiById(id: number): Promise<Lokasi> {
  const response = await api.get<{ success: boolean; data: Lokasi }>(
    `/protected/admin/lokasi/${id}`
  );
  return response.data.data;
}

export async function createLokasi(data: CreateLokasiRequest): Promise<Lokasi> {
  const response = await api.post<{ success: boolean; message: string; data: Lokasi }>(
    "/protected/admin/lokasi",
    data
  );
  return response.data.data;
}

export async function updateLokasi(
  id: number,
  data: Partial<CreateLokasiRequest>
): Promise<Lokasi> {
  const response = await api.put<{ success: boolean; data: { lokasi: Lokasi } }>(
    `/protected/admin/lokasi/${id}`,
    data
  );
  return response.data.data.lokasi;
}

export async function deleteLokasi(id: number): Promise<void> {
  await api.delete(`/protected/admin/lokasi/${id}`);
}
