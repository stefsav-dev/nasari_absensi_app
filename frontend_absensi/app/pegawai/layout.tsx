"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PegawaiSidebar } from "@/components/pegawai-sidebar";
import { PegawaiHeader } from "@/components/pegawai-header";

export default function PegawaiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/");
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== "pegawai") {
        // Redirect to admin if not pegawai (e.g. they typed /pegawai manually)
        router.push("/admin/dashboard");
      }
    } catch {
      router.push("/");
    }
  }, [router]);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <PegawaiSidebar />
        <SidebarInset>
          <PegawaiHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
