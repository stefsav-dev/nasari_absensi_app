"use client";

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

const statsCards = [
  {
    title: "Total Pegawai",
    value: "124",
    change: "+4 bulan ini",
    icon: Users,
    trend: "up" as const,
  },
  {
    title: "Hadir Hari Ini",
    value: "98",
    change: "79% kehadiran",
    icon: UserCheck,
    trend: "up" as const,
  },
  {
    title: "Terlambat",
    value: "12",
    change: "9.7% dari total",
    icon: Clock,
    trend: "neutral" as const,
  },
  {
    title: "Tidak Hadir",
    value: "14",
    change: "11.3% dari total",
    icon: UserX,
    trend: "down" as const,
  },
];

const recentAttendance = [
  {
    id: 1,
    name: "Budi Santoso",
    time: "07:45",
    status: "Hadir",
    department: "IT",
  },
  {
    id: 2,
    name: "Siti Rahayu",
    time: "07:52",
    status: "Hadir",
    department: "HR",
  },
  {
    id: 3,
    name: "Ahmad Fauzi",
    time: "08:15",
    status: "Terlambat",
    department: "Finance",
  },
  {
    id: 4,
    name: "Dewi Lestari",
    time: "07:30",
    status: "Hadir",
    department: "Marketing",
  },
  {
    id: 5,
    name: "Rudi Hermawan",
    time: "—",
    status: "Alpha",
    department: "IT",
  },
  {
    id: 6,
    name: "Maya Putri",
    time: "08:05",
    status: "Terlambat",
    department: "Finance",
  },
];

const quickStats = [
  { label: "Rata-rata Jam Masuk", value: "07:48" },
  { label: "Tepat Waktu Minggu Ini", value: "89%" },
  { label: "Total Izin Bulan Ini", value: "7" },
  { label: "Total Cuti Bulan Ini", value: "3" },
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

export default function DashboardPage() {
  return (
    <div className="space-y-6 pt-4">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Ringkasan data absensi dan statistik pegawai hari ini.
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
                  Aktivitas absensi pegawai hari ini
                </CardDescription>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex">
                Hari Ini
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
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAttendance.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {item.department}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.time}
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
              Ringkasan Minggu Ini
            </CardTitle>
            <CardDescription>Statistik kehadiran minggu berjalan</CardDescription>
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
                        style={{ width: "79%" }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium">
                    79%
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
                        style={{ width: "10%" }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium">
                    10%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">
                    Alpha
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-destructive transition-all"
                        style={{ width: "11%" }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium">
                    11%
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
