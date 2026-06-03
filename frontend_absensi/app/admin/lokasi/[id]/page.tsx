"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  Ruler,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLokasiById, useDeleteLokasi } from "@/hooks/use-lokasi";

// Dynamically import Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[380px] w-full items-center justify-center rounded-lg border bg-muted/30">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Memuat peta...</span>
      </div>
    </div>
  ),
});

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DetailLokasiPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data: lokasi, isLoading, isError, refetch } = useLokasiById(id);
  const { mutate: deleteLokasi, isPending: isDeleting } = useDeleteLokasi();

  function handleDelete() {
    deleteLokasi(id, {
      onSuccess: () => router.push("/admin/lokasi"),
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/lokasi">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-[380px] w-full rounded-lg" />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !lokasi) {
    return (
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/lokasi">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Detail Lokasi</h1>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-16 text-center">
          <AlertCircle className="size-10 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Lokasi tidak ditemukan</p>
            <p className="text-sm text-muted-foreground">
              Data lokasi dengan ID {id} tidak tersedia atau sudah dihapus.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 size-3.5" />
              Coba Lagi
            </Button>
            <Button size="sm" asChild>
              <Link href="/admin/lokasi">Kembali ke Daftar</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Page Title */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/lokasi">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {lokasi.nama_lokasi}
            </h1>
            <p className="text-sm text-muted-foreground">
              Detail & koordinat lokasi absensi
            </p>
          </div>
        </div>

        {/* Delete Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="shrink-0">
              <Trash2 className="mr-2 size-4" />
              <span className="hidden sm:inline">Hapus Lokasi</span>
              <span className="sm:hidden">Hapus</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Lokasi?</AlertDialogTitle>
              <AlertDialogDescription>
                Lokasi{" "}
                <span className="font-semibold text-foreground">
                  &quot;{lokasi.nama_lokasi}&quot;
                </span>{" "}
                akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-primary" />
                Titik Lokasi di Peta
              </CardTitle>
              <CardDescription>
                Tampilan peta untuk koordinat lokasi absensi ini
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div
                className="overflow-hidden rounded-lg border"
                style={{ height: "380px" }}
              >
                {/* Read-only map — click handler is no-op */}
                <LeafletMap
                  latitude={lokasi.latitude}
                  longitude={lokasi.longitude}
                  radius={lokasi.radius}
                  onMapClick={() => {}}
                />
              </div>

              {/* Coordinate pill */}
              <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                <Navigation className="size-3.5 text-primary shrink-0" />
                <span className="font-mono text-xs text-primary">
                  {lokasi.latitude.toFixed(6)}, {lokasi.longitude.toFixed(6)}
                </span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {lokasi.radius} m radius
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Informasi Lokasi</CardTitle>
              <CardDescription>Data detail dari lokasi absensi ini</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Nama Lokasi */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Nama Lokasi
                </p>
                <p className="flex items-center gap-2 font-medium">
                  <MapPin className="size-4 text-primary" />
                  {lokasi.nama_lokasi}
                </p>
              </div>

              <Separator />

              {/* Koordinat */}
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Koordinat
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Latitude</p>
                    <p className="mt-0.5 font-mono text-sm font-medium">
                      {lokasi.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Longitude</p>
                    <p className="mt-0.5 font-mono text-sm font-medium">
                      {lokasi.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Radius */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Radius Absensi
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    <Ruler className="size-4 text-primary" />
                    <span className="font-mono text-sm font-semibold">
                      {lokasi.radius} meter
                    </span>
                  </div>
                </div>
                {/* Visual radius scale */}
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min((lokasi.radius / 1000) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Pegawai harus berada dalam {lokasi.radius}m dari titik ini untuk bisa absen.
                </p>
              </div>

              <Separator />

              {/* Timestamps */}
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Waktu
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dibuat</p>
                      <p className="font-medium">{formatDate(lokasi.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Diperbarui</p>
                      <p className="font-medium">{formatDate(lokasi.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
