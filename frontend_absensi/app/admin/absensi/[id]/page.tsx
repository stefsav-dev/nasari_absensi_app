"use client";

import { useParams } from "next/navigation";

export default function AbsensiDetailPage() {
  const params = useParams();
  
  return (
    <div className="space-y-6 pt-4">
      <h1 className="text-2xl font-bold tracking-tight">Detail Absensi</h1>
      <p className="text-muted-foreground">Detail untuk ID: {params.id}</p>
    </div>
  );
}
