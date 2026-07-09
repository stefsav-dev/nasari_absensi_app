"use client";

import { useState, useRef, useEffect } from "react";
import { Search, UserPlus, MoreHorizontal, Mail, Shield, FileUp, CheckCircle2, UploadCloud, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Removing mock data
function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "superadmin":
      return "destructive" as const;
    case "admin":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// function getStatusDisplay(status: string) {
//   const s = status?.toLowerCase();
//   if (s === "k" || s === "aktif") return "Aktif";
//   if (s === "t" || s === "tidak aktif" || s === "nonaktif") return "Tidak Aktif";
//   return status || "-";
// }

// function getStatusBadgeVariant(status: string) {
//   const s = status?.toLowerCase();
//   if (s === "k" || s === "aktif") return "outline" as const;
//   return "secondary" as const;
// }

export default function PegawaiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalAktif, setTotalAktif] = useState(0);
  const [totalNonAktif, setTotalNonAktif] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [selectedPegawai, setSelectedPegawai] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    nama_lengkap: "",
    email: "",
    departemen: "",
    status: "",
    karyawan_id: null as number | null,
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [userRole, setUserRole] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (error) {
        console.error("Failed to decode token", error);
      }
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/protected/admin/pegawai?page=${page}&limit=10&search=${debouncedSearchQuery}`);
        if (response.data && response.data.data) {
          setData(response.data.data.pegawai || []);
          setTotalPages(response.data.data.total_pages || 1);
          setTotalEmployees(response.data.data.total || 0);
          setTotalAktif(response.data.data.total_aktif || 0);
          setTotalNonAktif(response.data.data.total_non_aktif || 0);
        }
      } catch (error) {
        console.error("Failed to fetch employees", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, debouncedSearchQuery, refreshTrigger]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus("idle");
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus("uploading");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("import_file", selectedFile);

    try {
      await api.post("/protected/admin/pegawai/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      setUploadStatus("success");
      setUploadProgress(100);
      // Optionally refetch data here if using react-query
    } catch (error) {
      console.error("Upload failed", error);
      setUploadStatus("error");
      setUploadProgress(0);
    }
  };

  const handleCloseModal = () => {
    setIsImportModalOpen(false);
    if (uploadStatus === "success") {
      setRefreshTrigger(prev => prev + 1);
    }
    setTimeout(() => {
      setSelectedFile(null);
      setUploadStatus("idle");
      setUploadProgress(0);
    }, 200);
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await api.get(`/protected/admin/pegawai/${id}`);
      if (res.data && res.data.data) {
        setSelectedPegawai(res.data.data);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch detail", err);
    }
  };

  const handleEditClick = async (id: number) => {
    try {
      const res = await api.get(`/protected/admin/pegawai/${id}`);
      if (res.data && res.data.data) {
        const p = res.data.data;
        setSelectedPegawai(p);
        setEditForm({
          nama_lengkap: p.nama_lengkap || "",
          email: p.email || "",
          departemen: p.departemen || "",
          status: p.status || "",
          karyawan_id: p.karyawan_id || null,
        });
        setIsEditModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch for edit", err);
    }
  };

  const handleDeleteClick = (emp: any) => {
    setSelectedPegawai(emp);
    setIsDeleteAlertOpen(true);
  };

  const submitEdit = async () => {
    if (!selectedPegawai) return;
    setActionLoading(true);
    try {
      await api.put(`/protected/admin/pegawai/${selectedPegawai.id}`, editForm);
      setIsEditModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to update", err);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedPegawai) return;
    setActionLoading(true);
    try {
      await api.delete(`/protected/admin/pegawai/${selectedPegawai.id}`);
      setIsDeleteAlertOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to delete", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSync = async () => {
    setActionLoading(true);
    try {
      const res = await api.post("/protected/admin/pegawai/sync");
      alert(res.data.data.message + `\nBerhasil Sinkronisasi: ${res.data.data.imported_count} pegawai\nDilewati (Duplikat): ${res.data.data.skipped_count} pegawai`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to sync", err);
      alert("Gagal melakukan sinkronisasi data.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Manajemen Pegawai
          </h1>
          <p className="text-muted-foreground">
            Kelola data pegawai dan hak akses pengguna.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {(userRole === "admin" || userRole === "superadmin") && (
            <>
              <Button variant="outline" onClick={handleSync} disabled={actionLoading}>
                <RefreshCw className={`mr-2 size-4 ${actionLoading ? "animate-spin" : ""}`} />
                Sync Data
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <FileUp className="mr-2 size-4" />
                Import Excel
              </Button>
            </>
          )}
          <Button>
            <UserPlus className="mr-2 size-4" />
            Tambah Pegawai
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {/* fixing card */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {totalEmployees}
              </p>
              <p className="text-xs text-muted-foreground">Total Pegawai</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Daftar Pegawai</CardTitle>
              <CardDescription>
                Total {totalEmployees} pegawai ditemukan
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, departemen..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pegawai</TableHead>
                <TableHead className="hidden md:table-cell">Lokasi Bekerja</TableHead>
                <TableHead className="hidden md:table-cell">
                  Departemen
                </TableHead>
                {/* <TableHead className="hidden sm:table-cell">Role</TableHead> */}
                {/* <TableHead>Status</TableHead> */}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Tidak ada data pegawai.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(emp.nama_lengkap || "User")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{emp.nama_lengkap}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {emp.kantor || "-"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {emp.departemen || "-"}
                    </TableCell>
                    <TableCell>
                      {/* <Badge variant={getStatusBadgeVariant(emp.status)}>
                        {getStatusDisplay(emp.status)}
                      </Badge> */}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetail(emp.id)}>Lihat Detail</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(emp.id)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(emp)}>
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={isImportModalOpen ? handleCloseModal : setIsImportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Data Pegawai</DialogTitle>
            <DialogDescription>
              Upload file Excel (.xlsx) yang berisi data pegawai.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center gap-4 py-4">
            {uploadStatus === "success" ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="rounded-full bg-green-100 p-3 text-green-600">
                  <CheckCircle2 className="size-8" />
                </div>
                <p className="font-medium text-lg">Upload Success</p>
                <p className="text-center text-sm text-muted-foreground">
                  Data pegawai berhasil diimport ke dalam sistem.
                </p>
              </div>
            ) : (
              <>
                <div 
                  className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6 hover:bg-muted/80 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="mb-2 size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : "Klik untuk memilih file Excel"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format yang didukung: .xlsx, .xls
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    disabled={uploadStatus === "uploading"}
                  />
                </div>

                {uploadStatus === "uploading" && (
                  <div className="w-full space-y-2 mt-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Mengupload...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                {uploadStatus === "error" && (
                  <p className="text-sm text-destructive mt-2">Gagal mengupload file. Silakan coba lagi.</p>
                )}
              </>
            )}
          </div>

          <DialogFooter className="sm:justify-end">
            {uploadStatus === "success" ? (
              <Button type="button" onClick={handleCloseModal} className="w-full sm:w-auto">
                Finish
              </Button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={handleCloseModal} disabled={uploadStatus === "uploading"} className="flex-1 sm:flex-none">
                  Batal
                </Button>
                <Button type="button" onClick={handleUpload} disabled={!selectedFile || uploadStatus === "uploading"} className="flex-1 sm:flex-none">
                  Upload
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Pegawai</DialogTitle>
          </DialogHeader>
          {selectedPegawai ? (
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Nama:</span>
                <span className="col-span-2">{selectedPegawai.nama_lengkap}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Email:</span>
                <span className="col-span-2">{selectedPegawai.email}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">NIK:</span>
                <span className="col-span-2">{selectedPegawai.nik || "-"}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Departemen:</span>
                <span className="col-span-2">{selectedPegawai.departemen || "-"}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Karyawan ID:</span>
                <span className="col-span-2">{selectedPegawai.karyawan_id || "-"}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Jabatan:</span>
                <span className="col-span-2">{selectedPegawai.jabatan || "-"}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Jenis Kelamin:</span>
                <span className="col-span-2">{selectedPegawai.jenis_kelamin || "-"}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Agama:</span>
                <span className="col-span-2">{selectedPegawai.agama || "-"}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Tempat, Tanggal Lahir:</span>
                <span className="col-span-2">
                  {selectedPegawai.tempat_lahir || "-"}, {selectedPegawai.tanggal_lahir || "-"}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">No Telepon:</span>
                <span className="col-span-2">{selectedPegawai.no_telp || "-"}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Alamat:</span>
                <span className="col-span-2">{selectedPegawai.alamat || "-"}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Status:</span>
                <span className="col-span-2">
                  {/* <Badge variant={getStatusBadgeVariant(selectedPegawai.status)}>
                    {getStatusDisplay(selectedPegawai.status)}
                  </Badge> */}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">Memuat...</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Pegawai</DialogTitle>
            <DialogDescription>Ubah data profil dan status pegawai.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
              <Input
                id="nama_lengkap"
                value={editForm.nama_lengkap}
                onChange={(e) => setEditForm({ ...editForm, nama_lengkap: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="departemen">Departemen</Label>
              <Input
                id="departemen"
                value={editForm.departemen}
                onChange={(e) => setEditForm({ ...editForm, departemen: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="karyawan_id">Karyawan ID (API Eksternal)</Label>
              <Input
                id="karyawan_id"
                type="number"
                value={editForm.karyawan_id || ""}
                onChange={(e) => setEditForm({ ...editForm, karyawan_id: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Misal: 1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(val) => setEditForm({ ...editForm, status: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="k">Aktif</SelectItem>
                  <SelectItem value="t">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitEdit} disabled={actionLoading}>
              {actionLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Pegawai</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data pegawai <strong>{selectedPegawai?.nama_lengkap}</strong>? Aksi ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={actionLoading}>
              {actionLoading ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
