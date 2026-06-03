"use client";

import { useState } from "react";
import { Search, UserPlus, MoreHorizontal, Mail, Shield } from "lucide-react";
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

const employees = [
  {
    id: 1,
    name: "Budi Santoso",
    email: "budi@nasari.com",
    role: "pegawai",
    department: "IT",
    status: "Aktif",
  },
  {
    id: 2,
    name: "Siti Rahayu",
    email: "siti@nasari.com",
    role: "pegawai",
    department: "HR",
    status: "Aktif",
  },
  {
    id: 3,
    name: "Ahmad Fauzi",
    email: "ahmad@nasari.com",
    role: "admin",
    department: "Finance",
    status: "Aktif",
  },
  {
    id: 4,
    name: "Dewi Lestari",
    email: "dewi@nasari.com",
    role: "pegawai",
    department: "Marketing",
    status: "Aktif",
  },
  {
    id: 5,
    name: "Rudi Hermawan",
    email: "rudi@nasari.com",
    role: "pegawai",
    department: "IT",
    status: "Nonaktif",
  },
  {
    id: 6,
    name: "Maya Putri",
    email: "maya@nasari.com",
    role: "pegawai",
    department: "Finance",
    status: "Aktif",
  },
  {
    id: 7,
    name: "Hendro Wibowo",
    email: "hendro@nasari.com",
    role: "superadmin",
    department: "Manajemen",
    status: "Aktif",
  },
  {
    id: 8,
    name: "Lisa Permata",
    email: "lisa@nasari.com",
    role: "pegawai",
    department: "Marketing",
    status: "Aktif",
  },
];

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

export default function PegawaiPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
        <Button className="w-full sm:w-auto">
          <UserPlus className="mr-2 size-4" />
          Tambah Pegawai
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {employees.filter((e) => e.status === "Aktif").length}
              </p>
              <p className="text-xs text-muted-foreground">Pegawai Aktif</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Mail className="size-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {employees.filter((e) => e.role === "admin").length}
              </p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-destructive/10 p-3">
              <Shield className="size-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {employees.filter((e) => e.status === "Nonaktif").length}
              </p>
              <p className="text-xs text-muted-foreground">Nonaktif</p>
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
                Total {filteredEmployees.length} pegawai ditemukan
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
                <TableHead className="hidden md:table-cell">
                  Departemen
                </TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {emp.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {emp.department}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={getRoleBadgeVariant(emp.role)}>
                      {emp.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        emp.status === "Aktif" ? "outline" : "destructive"
                      }
                    >
                      {emp.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Lihat Detail</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
