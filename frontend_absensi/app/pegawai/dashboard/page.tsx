"use client";

import {
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

const statsCards = [
  {
    title: "Total Hadir Bulan Ini",
    value: "18",
    change: "Target: 22 Hari",
    icon: UserCheck,
    trend: "up" as const,
  },
  {
    title: "Tepat Waktu",
    value: "15",
    change: "83% dari kehadiran",
    icon: Clock,
    trend: "up" as const,
  },
  {
    title: "Terlambat",
    value: "3",
    change: "17% dari kehadiran",
    icon: Clock,
    trend: "down" as const,
  },
  {
    title: "Tidak Hadir (Alpha)",
    value: "0",
    change: "0% dari total",
    icon: UserX,
    trend: "neutral" as const,
  },
];

const recentAttendance = [
  {
    id: 1,
    date: "08 Jun 2026",
    time: "07:45",
    status: "Hadir",
    notes: "-",
  },
  {
    id: 2,
    date: "07 Jun 2026",
    time: "07:52",
    status: "Hadir",
    notes: "-",
  },
  {
    id: 3,
    date: "06 Jun 2026",
    time: "08:15",
    status: "Terlambat",
    notes: "Macet",
  },
  {
    id: 4,
    date: "05 Jun 2026",
    time: "07:30",
    status: "Hadir",
    notes: "-",
  },
  {
    id: 5,
    date: "04 Jun 2026",
    time: "07:50",
    status: "Hadir",
    notes: "-",
  },
];

const quickStats = [
  { label: "Rata-rata Jam Masuk", value: "07:50" },
  { label: "Tepat Waktu Minggu Ini", value: "80%" },
  { label: "Total Izin Tahun Ini", value: "2" },
  { label: "Sisa Cuti Tahunan", value: "10 Hari" },
];

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

export default function PegawaiDashboardPage() {
  return (
    <div className="space-y-6 pt-4">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Pegawai</h1>
        <p className="text-muted-foreground">
          Ringkasan kehadiran pribadi dan statistik Anda.
        </p>
      </div>

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
                {stat.trend === "down" && (
                  <TrendingUp className="size-3 text-red-500 rotate-180" />
                )}
                {stat.change}
              </div>
            </CardContent>
            {/* Decorative gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-primary/40 via-primary/20 to-transparent" />
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
                  Riwayat Absensi Terakhir
                </CardTitle>
                <CardDescription>
                  Catatan kehadiran 5 hari terakhir
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAttendance.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.date}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.time}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.notes}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Stats & Info */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="size-5" />
              Statistik Pribadi
            </CardTitle>
            <CardDescription>Performa kehadiran Anda</CardDescription>
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
              <div className="text-sm font-medium">Kualitas Kehadiran Bulan Ini</div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">
                    Tepat Waktu
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: "83%" }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium">
                    83%
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
                        style={{ width: "17%" }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium">
                    17%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
