"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  MapPin,
  Plus,
  MoreHorizontal,
  Navigation,
  Trash2,
  Eye,
  Edit,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useLokasi, useDeleteLokasi } from "@/hooks/use-lokasi";

export default function LokasiPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, isError, refetch } = useLokasi(page, limit, debouncedSearch);
  const { mutate: deleteLokasi, isPending: isDeleting } = useDeleteLokasi();

  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const lokasi = data?.lokasi ?? [];
  const total = data?.total ?? 0;

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteLokasi(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Lokasi</h1>
          <p className="text-muted-foreground">
            Kelola titik lokasi absensi yang diizinkan.
          </p>
        </div>
        <Button className="w-full sm:w-auto" asChild>
          <Link href="/admin/lokasi/tambah">
            <Plus className="mr-2 size-4" />
            Tambah Lokasi
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <MapPin className="size-5 text-primary" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold">{total}</p>
              )}
              <p className="text-xs text-muted-foreground">Total Lokasi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <Navigation className="size-5 text-emerald-500" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold">{total}</p>
              )}
              <p className="text-xs text-muted-foreground">Lokasi Aktif</p>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <MapPin className="size-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Lokasi Nonaktif</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Daftar Lokasi Kantor Pusat & Cabang Absensi</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Memuat data..."
                  : `${total} lokasi ditemukan`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari lokasi..."
                  className="pl-8 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
                className="h-9 w-9 shrink-0"
              >
                <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Error state */}
          {isError && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-10 text-center">
              <AlertCircle className="size-8 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Gagal memuat data</p>
                <p className="text-sm text-muted-foreground">
                  Pastikan backend berjalan dan Anda sudah login.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 size-3.5" />
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Table */}
          {!isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Lokasi</TableHead>
                  <TableHead className="hidden sm:table-cell">Latitude</TableHead>
                  <TableHead className="hidden sm:table-cell">Longitude</TableHead>
                  <TableHead className="hidden md:table-cell">Radius</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Loading skeleton rows */}
                {isLoading && (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="size-4 rounded" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="size-8 rounded" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {/* Empty state */}
                {!isLoading && lokasi.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <MapPin className="size-8 opacity-40" />
                        <p className="text-sm">Belum ada lokasi tersimpan.</p>
                        <Button variant="outline" size="sm" asChild className="mt-1">
                          <Link href="/admin/lokasi/tambah">
                            <Plus className="mr-2 size-3.5" />
                            Tambah Lokasi Pertama
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Data rows */}
                {!isLoading && (
                  <>
                    {lokasi.map((loc, index) => (
                      <TableRow key={loc.id != null ? `loc-${loc.id}` : `loc-idx-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{loc.nama_lokasi}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-sm text-muted-foreground sm:table-cell">
                        {loc.latitude.toFixed(6)}
                      </TableCell>
                      <TableCell className="hidden font-mono text-sm text-muted-foreground sm:table-cell">
                        {loc.longitude.toFixed(6)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {loc.radius} m
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
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/lokasi/${loc.id}`}>
                                  <Eye className="mr-2 size-4" />
                                  Lihat Detail
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/lokasi/edit/${loc.id}`}>
                                  <Edit className="mr-2 size-4" />
                                  Edit Lokasi
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setDeleteTarget({ id: loc.id, name: loc.nama_lokasi })
                                }
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

          {/* Pagination Controls */}
          {!isLoading && !isError && total > 0 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                Menampilkan {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} dari {total} lokasi
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="text-sm font-medium">Halaman {page}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= total}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Lokasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Lokasi{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.name}&quot;
              </span>{" "}
              akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Ya, Hapus
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
