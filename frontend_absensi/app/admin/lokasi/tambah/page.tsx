"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Save,
  ArrowLeft,
  Navigation,
  AlertCircle,
  CheckCircle2,
  Crosshair,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCreateLokasi } from "@/hooks/use-lokasi";
import Link from "next/link";

// Dynamically import the map to prevent SSR issues with Leaflet
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center rounded-lg border bg-muted/30">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Memuat peta...</span>
      </div>
    </div>
  ),
});

export default function TambahLokasiPage() {
  const router = useRouter();
  const { mutate: createLokasi, isPending, isError, isSuccess, error } = useCreateLokasi();

  const [form, setForm] = useState({
    nama_lokasi: "",
    latitude: 0,
    longitude: 0,
    radius: 100,
  });

  const [hasPin, setHasPin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(Number(data[0].lat).toFixed(6));
        const lon = parseFloat(Number(data[0].lon).toFixed(6));
        setForm((prev) => ({ ...prev, latitude: lat, longitude: lon }));
        setHasPin(true);
      } else {
        alert("Lokasi tidak ditemukan");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mencari lokasi");
    } finally {
      setIsSearching(false);
    }
  }

  function handleMapClick(lat: number, lng: number) {
    setForm((prev) => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
    }));
    setHasPin(true);
  }

  function handleGeolocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        setHasPin(true);
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true }
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nama_lokasi.trim()) return;
    if (!hasPin || form.latitude === 0 || form.longitude === 0) return;

    createLokasi(
      {
        nama_lokasi: form.nama_lokasi,
        latitude: form.latitude,
        longitude: form.longitude,
        radius: form.radius,
      },
      {
        onSuccess: () => {
          setTimeout(() => router.push("/admin/lokasi"), 1500);
        },
      }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorMessage = (error as any)?.response?.data?.error ?? (error as any)?.message ?? "Gagal menyimpan lokasi";

  return (
    <div className="space-y-6 pt-4">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/lokasi">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tambah Lokasi</h1>
          <p className="text-muted-foreground text-sm">
            Klik pada peta untuk memilih titik koordinat lokasi absensi.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Map — takes 3/5 width on large screens */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="size-4 text-primary" />
                      Pilih Lokasi di Peta
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Klik pada peta atau seret marker untuk menentukan titik absensi
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeolocate}
                    className="shrink-0"
                  >
                    <Crosshair className="mr-2 size-3.5" />
                    Lokasi Saya
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-4 px-4">
                <div className="overflow-hidden rounded-lg border" style={{ height: "460px" }}>
                  <LeafletMap
                    latitude={form.latitude}
                    longitude={form.longitude}
                    radius={form.radius}
                    onMapClick={handleMapClick}
                  />
                </div>

                {/* Coordinate Display */}
                {hasPin ? (
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                    <Navigation className="size-3.5 text-primary shrink-0" />
                    <span className="text-xs font-mono text-primary">
                      {form.latitude}, {form.longitude}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Pin aktif
                    </Badge>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 border border-dashed px-3 py-2">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      Klik pada peta untuk menentukan titik lokasi
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Form — takes 2/5 width on large screens */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Detail Lokasi</CardTitle>
                <CardDescription>
                  Isi informasi nama lokasi dan atur radius absensi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Nama Lokasi */}
                <div className="space-y-2">
                  <Label htmlFor="nama_lokasi">
                    Nama Lokasi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nama_lokasi"
                    placeholder="cth: Kantor Pusat Nasari"
                    value={form.nama_lokasi}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, nama_lokasi: e.target.value }))
                    }
                    required
                  />
                </div>

                <Separator />

                {/* Cari Lokasi */}
                <div className="space-y-2">
                  <Label htmlFor="search">Cari Alamat (Opsional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      placeholder="Cth: Monas, Jakarta..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? (
                        <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      ) : (
                        <Search className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cari alamat untuk memprediksi titik koordinat.
                  </p>
                </div>

                {/* Koordinat (read-only, set by map click) */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Koordinat</Label>

                  <div className="space-y-2">
                    <Label
                      htmlFor="latitude"
                      className="text-xs text-muted-foreground"
                    >
                      Latitude
                    </Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="0.000001"
                      placeholder="Klik peta untuk mengisi"
                      value={form.latitude || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          latitude: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="longitude"
                      className="text-xs text-muted-foreground"
                    >
                      Longitude
                    </Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="0.000001"
                      placeholder="Klik peta untuk mengisi"
                      value={form.longitude || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          longitude: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <Separator />

                {/* Radius */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="radius">
                      Radius Absensi <span className="text-destructive">*</span>
                    </Label>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {form.radius} m
                    </Badge>
                  </div>
                  <Input
                    id="radius"
                    type="number"
                    min={10}
                    max={5000}
                    step={10}
                    value={form.radius}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        radius: parseInt(e.target.value) || 100,
                      }))
                    }
                    className="font-mono"
                  />
                  {/* Quick preset buttons */}
                  <div className="flex gap-2">
                    {[50, 100, 200, 500].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, radius: r }))
                        }
                        className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-accent ${
                          form.radius === r
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {r}m
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pegawai harus berada dalam radius ini untuk bisa absen.
                  </p>
                </div>

                {/* Status messages */}
                {isError && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                {isSuccess && (
                  <div className="flex items-start gap-2 rounded-md bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <span>Lokasi berhasil disimpan! Mengalihkan...</span>
                  </div>
                )}

                {/* Submit */}
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      isPending ||
                      isSuccess ||
                      !form.nama_lokasi.trim() ||
                      !hasPin
                    }
                  >
                    {isPending ? (
                      <>
                        <div className="mr-2 size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 size-4" />
                        Simpan Lokasi
                      </>
                    )}
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/admin/lokasi">Batal</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
