"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-register";
import { useState } from "react"

export default function RegisterPage() {
    const [namaLengkap, setNamaLengkap] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    
    const { mutate, isPending, isError, error } = useRegister();

    const errorMessage = 
        error?.response?.data?.error ?? error?.message ?? "Terjadi kesalahan";

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        mutate({ nama_lengkap: namaLengkap, email, password, role: "pegawai" });
    }

    return (
        <div className="flex min-h-svh items-center justify-center p-6">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Daftar</CardTitle>
                    <CardDescription>Daftarkan akun baru Anda</CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {isError && (
                            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {errorMessage}  
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
                            <Input 
                                id="nama_lengkap"
                                type="text"
                                placeholder="Masukkan Nama Lengkap Anda"
                                value={namaLengkap}
                                onChange={(e) => setNamaLengkap(e.target.value)}
                                required
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email"
                                type="email"
                                placeholder="Masukkan Email Anda"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                                id="password"
                                type="password"
                                placeholder="Masukkan Password Anda"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isPending}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? "Daftar..." : "Daftar"}
                        </Button>
                    </CardContent>
                </form>
            </Card>
        </div>
    )
}
