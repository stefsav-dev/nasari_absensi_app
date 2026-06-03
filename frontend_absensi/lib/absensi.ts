import api from "./api";

// ─── Types ───────────────────────────────────────────────

export interface UserInfo {
  id: number;
  name: string;
  email: string;
}

export interface Absensi {
  id: number;
  user_id: number;
  absensi_id: string;
  status: string;
  absensi_masuk: string;
  absensi_pulang: string;
  created_at: string;
  updated_at: string;
  user: UserInfo;
}

export interface CreateAbsensiRequest {
  user_id: number;
  status: string;
  absensi_masuk: string; // RFC3339 string
  absensi_pulang?: string; // Optional RFC3339 string
}

export interface UpdateAbsensiRequest {
  status?: string;
  absensi_masuk?: string; // RFC3339 string
  absensi_pulang?: string; // RFC3339 string
}

export interface AbsensiListResponse {
  total: number;
  absensi: Absensi[];
}

// ─── API Functions ───────────────────────────────────────

export async function getAllAbsensi(): Promise<AbsensiListResponse> {
  const response = await api.get<{ success: boolean; data: AbsensiListResponse }>(
    "/protected/admin/absensi"
  );
  return response.data.data;
}

export async function getAbsensiById(id: number): Promise<Absensi> {
  const response = await api.get<{ success: boolean; data: Absensi }>(
    `/protected/admin/absensi/${id}`
  );
  return response.data.data;
}

export async function createAbsensi(data: CreateAbsensiRequest): Promise<Absensi> {
  const response = await api.post<{ success: boolean; message: string; data: Absensi }>(
    "/protected/admin/absensi",
    data
  );
  return response.data.data;
}

export async function updateAbsensi(
  id: number,
  data: UpdateAbsensiRequest
): Promise<Absensi> {
  const response = await api.put<{ success: boolean; data: { absensi: Absensi } }>(
    `/protected/admin/absensi/${id}`,
    data
  );
  return response.data.data.absensi;
}

export async function deleteAbsensi(id: number): Promise<void> {
  await api.delete(`/protected/admin/absensi/${id}`);
}
