"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  TrendingUp,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Removed static mock data

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "Hadir":
      return "default" as const;
    case "Terlambat":
      return "secondary" as const;
    case "Alpha":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/protected/admin/dashboard");
        if (response.data && response.data.data) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const statsCards = data ? [
    {
      title: "Total Pegawai",
      value: data.total_pegawai || "0",
      change: "Total di sistem",
      icon: Users,
      trend: "neutral" as const,
    },
    {
      title: "Hadir Hari Ini",
      value: data.hadir_hari_ini?.total || "0",
      change: `${data.hadir_hari_ini?.percentage || "0%"} kehadiran`,
      icon: UserCheck,
      trend: "up" as const,
    },
    {
      title: "Terlambat",
      value: data.terlambat?.total || "0",
      change: `${data.terlambat?.percentage || "0%"} dari total`,
      icon: Clock,
      trend: "down" as const, // Down is bad, so maybe neutral or down visually?
    },
    {
      title: "Tidak Hadir",
      value: data.tidak_hadir?.total || "0",
      change: `${data.tidak_hadir?.percentage || "0%"} dari total`,
      icon: UserX,
      trend: "down" as const,
    },
  ] : [];

  const quickStats = data ? [
    { label: "Rata-rata Jam Masuk", value: data.quick_stats?.rata_rata_jam_masuk || "00:00" },
    { label: "Tepat Waktu Hari Ini", value: data.quick_stats?.tepat_waktu_minggu_ini || "0%" },
    { label: "Total Izin Bulan Ini", value: data.quick_stats?.total_izin_bulan_ini || "0" },
    { label: "Total Cuti Bulan Ini", value: data.quick_stats?.total_cuti_bulan_ini || "0" },
  ] : [];

  const attendanceList = data?.recent_attendance || [];

  return (
    <div className="space-y-6 pt-4">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Ringkasan data absensi dan statistik pegawai hari ini.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Memuat data dashboard...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat) => (
              <Card key={stat.title} className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className="rounded-md bg-primary/10 p-2">
                    <stat.icon className="size-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {stat.trend === "up" && (
                      <TrendingUp className="size-3 text-emerald-500" />
                    )}
                    {stat.change}
                  </div>
                </CardContent>
                {/* Decorative gradient */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
              </Card>
            ))}
          </div>

      {/* Content Grid */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Recent Attendance Table */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5" />
                  Absensi Terbaru
                </CardTitle>
                <CardDescription>
                  Aktivitas absensi pegawai terbaru
                </CardDescription>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex">
                Terbaru
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Departemen
                  </TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Jam Pulang</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Belum ada absensi.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceList.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {item.department}
                      </TableCell>
                      <TableCell>{item.locationName}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.time}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.timeOut}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Stats & Info */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="size-5" />
              Ringkasan Hari Ini
            </CardTitle>
            <CardDescription>Statistik kehadiran hari ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {quickStats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
                <span className="text-sm font-semibold">{stat.value}</span>
              </div>
            ))}

            {/* Mini progress visualization */}
            <div className="space-y-3 pt-2">
              <div className="text-sm font-medium">Distribusi Kehadiran</div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">
                    Hadir
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: data?.hadir_hari_ini?.percentage || "0%" }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs font-medium">
                    {data?.hadir_hari_ini?.percentage || "0%"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">
                    Terlambat
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: data?.terlambat?.percentage || "0%" }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs font-medium">
                    {data?.terlambat?.percentage || "0%"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">
                    Absen/Alpha
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-destructive transition-all"
                        style={{ width: data?.tidak_hadir?.percentage || "0%" }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs font-medium">
                    {data?.tidak_hadir?.percentage || "0%"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}
