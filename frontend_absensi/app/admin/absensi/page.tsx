"use client";

import { useState } from "react";
import { Search, Download, CalendarDays, Filter, Plus, Trash2, Edit, AlertCircle, RefreshCw, MoreHorizontal, Eye } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { useAbsensi, useCreateAbsensi, useUpdateAbsensi, useDeleteAbsensi } from "@/hooks/use-absensi";
import { usePegawai } from "@/hooks/use-pegawai";
import { exportAbsensiExcel } from "@/lib/absensi";

function getStatusBadgeVariant(status: string) {
  switch (status?.toLowerCase()) {
    case "hadir":
      return "default" as const;
    case "terlambat":
      return "secondary" as const;
    case "alpha":
      return "destructive" as const;
    case "izin":
    case "ijin":
    case "cuti":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function formatDateDisplay(dateString: string) {
  if (!dateString || dateString === "0001-01-01T00:00:00Z") return "—";
  return format(new Date(dateString), "dd MMM yyyy", { locale: id });
}

function formatTimeDisplay(dateString: string) {
  if (!dateString || dateString === "0001-01-01T00:00:00Z") return "—";
  return format(new Date(dateString), "HH:mm");
}

function formatDuration(startStr: string, endStr: string) {
  if (!startStr || !endStr || startStr === "0001-01-01T00:00:00Z" || endStr === "0001-01-01T00:00:00Z") return "—";

  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "—";

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return "—";

  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${diffHrs}j ${diffMins}m`;
}

export default function AbsensiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    user_id: "",
    status: "Hadir",
    absensi_masuk: "",
    absensi_pulang: "",
    keterangan: "",
  });

  const { data: absensiData, isLoading, isError, refetch } = useAbsensi();
  const { data: pegawaiData } = usePegawai();
  const { mutate: createAbsensi, isPending: isCreating } = useCreateAbsensi();
  const { mutate: updateAbsensi, isPending: isUpdating } = useUpdateAbsensi();
  const { mutate: deleteAbsensi, isPending: isDeleting } = useDeleteAbsensi();

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAbsensi(
      {
        user_id: Number(formData.user_id),
        status: formData.status,
        absensi_masuk: formData.absensi_masuk ? new Date(formData.absensi_masuk).toISOString() : new Date().toISOString(),
        absensi_pulang: formData.absensi_pulang ? new Date(formData.absensi_pulang).toISOString() : undefined,
        keterangan: formData.status === "Ijin" ? formData.keterangan : undefined,
      },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setFormData({ user_id: "", status: "Hadir", absensi_masuk: "", absensi_pulang: "", keterangan: "" });
        },
      }
    );
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    updateAbsensi(
      {
        id: editTarget.id,
        data: {
          status: formData.status,
          absensi_masuk: formData.absensi_masuk ? new Date(formData.absensi_masuk).toISOString() : undefined,
          absensi_pulang: formData.absensi_pulang ? new Date(formData.absensi_pulang).toISOString() : undefined,
          keterangan: formData.status === "Ijin" ? formData.keterangan : undefined,
        },
      },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setEditTarget(null);
        },
      }
    );
  };

  const openEdit = (item: any) => {
    setEditTarget(item);

    // Format dates to datetime-local format (YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (dateString: string) => {
      if (!dateString || dateString === "0001-01-01T00:00:00Z") return "";
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "";
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    let capitalizedStatus = item.status 
      ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() 
      : "Hadir";
    if (capitalizedStatus === "Izin" || capitalizedStatus === "Ijin") {
      capitalizedStatus = "Ijin";
    }

    setFormData({
      user_id: item.user_id.toString(),
      status: capitalizedStatus,
      absensi_masuk: formatDateTimeLocal(item.absensi_masuk),
      absensi_pulang: formatDateTimeLocal(item.absensi_pulang),
      keterangan: item.keterangan || "",
    });
    setIsEditOpen(true);
  };

  const openDetail = (item: any) => {
    setDetailTarget(item);
    setIsDetailOpen(true);
  };

  const openAdd = () => {
    setFormData({ user_id: "", status: "Hadir", absensi_masuk: "", absensi_pulang: "", keterangan: "" });
    setIsAddOpen(true);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAbsensiExcel(exportStartDate, exportEndDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `export absensi ${format(new Date(), "dd MMMM yyyy", { locale: id })}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export absensi", error);
      alert("Gagal export data absensi. Pastikan backend berjalan dan Anda sudah login.");
    } finally {
      setIsExporting(false);
    }
  };

  const absensiList = absensiData?.absensi || [];

  const filteredData = absensiList.filter((item) =>
    item.user?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalHadir = absensiList.filter((a) => a.status?.toLowerCase() === "hadir").length;
  const totalTerlambat = absensiList.filter((a) => a.status?.toLowerCase() === "terlambat").length;
  const totalAlpha = absensiList.filter((a) => a.status?.toLowerCase() === "alpha").length;
  const totalIzinCuti = absensiList.filter((a) => {
    const s = a.status?.toLowerCase();
    return s === "izin" || s === "ijin" || s === "cuti";
  }).length;
  const totalSakit = absensiList.filter((a) => a.status?.toLowerCase() === "sakit").length;

  return (
    <div className="space-y-6 pt-4">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Absensi</h1>
          <p className="text-muted-foreground">
            Pantau dan kelola rekap absensi seluruh pegawai.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              className="w-[130px]" 
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              title="Tanggal Awal (Opsional)"
            />
            <span className="text-muted-foreground">-</span>
            <Input 
              type="date" 
              className="w-[130px]" 
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              title="Tanggal Akhir (Opsional)"
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleExport} disabled={isExporting}>
            <Download className={`mr-2 size-4 ${isExporting ? "animate-pulse" : ""}`} />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-emerald-500/10 p-2">
                <CalendarDays className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalHadir}</p>
                <p className="text-xs text-muted-foreground">Hadir</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-amber-500/10 p-2">
                <CalendarDays className="size-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalTerlambat}</p>
                <p className="text-xs text-muted-foreground">Terlambat</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-destructive/10 p-2">
                <CalendarDays className="size-4 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalAlpha}</p>
                <p className="text-xs text-muted-foreground">Alpha</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-blue-500/10 p-2">
                <CalendarDays className="size-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalIzinCuti}</p>
                <p className="text-xs text-muted-foreground">Ijin / Cuti</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-purple-500/10 p-2">
                <CalendarDays className="size-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalSakit}</p>
                <p className="text-xs text-muted-foreground">Sakit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Rekap Absensi</CardTitle>
              <CardDescription>
                {isLoading ? "Memuat data..." : `Menampilkan ${filteredData.length} data absensi`}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari nama pegawai..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="shrink-0" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-10 text-center">
              <AlertCircle className="size-8 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Gagal memuat data</p>
                <p className="text-sm text-muted-foreground">Pastikan backend berjalan dan Anda sudah login.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 size-3.5" />
                Coba Lagi
              </Button>
            </div>
          )}

          {!isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                  <TableHead>Masuk</TableHead>
                  <TableHead className="hidden md:table-cell">Pulang</TableHead>
                  <TableHead className="hidden lg:table-cell">Durasi</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto rounded-full" /></TableCell>
                        <TableCell><Skeleton className="size-8 rounded" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {!isLoading && filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarDays className="size-8 opacity-40" />
                        <p className="text-sm">Belum ada data absensi yang ditemukan.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && (
                  <>
                    {filteredData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.user?.name || "Unknown User"}</TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {formatDateDisplay(item.absensi_masuk)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatTimeDisplay(item.absensi_masuk)}
                        </TableCell>
                        <TableCell className="hidden font-mono text-sm md:table-cell">
                          {formatTimeDisplay(item.absensi_pulang)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDuration(item.absensi_masuk, item.absensi_pulang)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getStatusBadgeVariant(item.status)} className="capitalize">
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" disabled={isDeleting}>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetail(item)}>
                                <Eye className="mr-2 size-4" />
                                Detail
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(item)}>
                                <Edit className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget({ id: item.id, name: item.user?.name || "Data" })}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ADD DIALOG */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Absensi</DialogTitle>
            <DialogDescription>
              Buat data absensi secara manual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="user">Pegawai</Label>
              <Select value={formData.user_id} onValueChange={(val) => setFormData({ ...formData, user_id: val })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Pegawai" />
                </SelectTrigger>
                <SelectContent>
                  {pegawaiData?.data?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status Kehadiran</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hadir">Hadir</SelectItem>
                  <SelectItem value="Terlambat">Terlambat</SelectItem>
                  <SelectItem value="Ijin">Ijin</SelectItem>
                  <SelectItem value="Cuti">Cuti</SelectItem>
                  <SelectItem value="Alpha">Alpha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="masuk">Waktu Masuk</Label>
              <Input
                id="masuk"
                type="datetime-local"
                value={formData.absensi_masuk}
                onChange={(e) => setFormData({ ...formData, absensi_masuk: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pulang">Waktu Pulang (Opsional)</Label>
              <Input
                id="pulang"
                type="datetime-local"
                value={formData.absensi_pulang}
                onChange={(e) => setFormData({ ...formData, absensi_pulang: e.target.value })}
              />
            </div>
            {formData.status === "Ijin" && (
              <div className="space-y-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <textarea
                  id="keterangan"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Masukkan keterangan ijin..."
                  required
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Absensi</DialogTitle>
            <DialogDescription>
              Ubah data absensi untuk {editTarget?.user?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status Kehadiran</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hadir">Hadir</SelectItem>
                  <SelectItem value="Terlambat">Terlambat</SelectItem>
                  <SelectItem value="Ijin">Ijin</SelectItem>
                  <SelectItem value="Cuti">Cuti</SelectItem>
                  <SelectItem value="Alpha">Alpha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-masuk">Waktu Masuk</Label>
              <Input
                id="edit-masuk"
                type="datetime-local"
                value={formData.absensi_masuk}
                onChange={(e) => setFormData({ ...formData, absensi_masuk: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pulang">Waktu Pulang (Opsional)</Label>
              <Input
                id="edit-pulang"
                type="datetime-local"
                value={formData.absensi_pulang}
                onChange={(e) => setFormData({ ...formData, absensi_pulang: e.target.value })}
              />
            </div>
            {formData.status === "Ijin" && (
              <div className="space-y-2">
                <Label htmlFor="edit-keterangan">Keterangan</Label>
                <textarea
                  id="edit-keterangan"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Masukkan keterangan ijin..."
                  required
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Absensi?</AlertDialogTitle>
            <AlertDialogDescription>
              Data absensi untuk pegawai <strong>{deleteTarget?.name}</strong> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) {
                  deleteAbsensi(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DETAIL DIALOG */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detail Absensi</DialogTitle>
            <DialogDescription>
              Detail informasi absensi pegawai.
            </DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Nama Pegawai</p>
                  <p className="font-medium">{detailTarget.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(detailTarget.status)} className="capitalize mt-1">
                    {detailTarget.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Waktu Masuk</p>
                  <p className="font-medium">{formatDateDisplay(detailTarget.absensi_masuk)} {formatTimeDisplay(detailTarget.absensi_masuk)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Waktu Pulang</p>
                  <p className="font-medium">{formatDateDisplay(detailTarget.absensi_pulang)} {formatTimeDisplay(detailTarget.absensi_pulang)}</p>
                </div>
              </div>
              
              {detailTarget.keterangan && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Keterangan / Alasan</p>
                  <div className="p-3 bg-muted rounded-md text-sm border whitespace-pre-wrap">
                    {detailTarget.keterangan}
                  </div>
                </div>
              )}

              {/* Display Lampiran (foto_masuk) */}
              {detailTarget.foto_masuk && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Lampiran Bukti (Foto/Dokumen)</p>
                  <div className="overflow-hidden rounded-md border flex items-center justify-center bg-black/5 p-2">
                    <img 
                      src={detailTarget.foto_masuk} 
                      alt="Lampiran" 
                      className="max-h-80 object-contain rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
