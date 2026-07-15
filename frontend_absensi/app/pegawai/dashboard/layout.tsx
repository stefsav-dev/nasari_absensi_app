import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Pegawai",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
