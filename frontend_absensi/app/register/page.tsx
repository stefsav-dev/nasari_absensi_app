"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-register";
import { Link } from "lucide-react";
import { useState } from "react";

export default function RegisterPage() {
    const [namaLengkap, setNamaLengkap] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const { mutate, isPending, isError, error } = useRegister()

    const errorMessage = error?.response?.data?.error ?? error?.message ?? "Terjadi kesalahan";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutate({ nama_lengkap: namaLengkap, email: email, password: password })
    }

    return (
        <div className="flex min-h-svh items-center justify-center p-6">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Register</CardTitle>
                    <CardDescription>Masukkan email dan password Anda</CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {isError && (
                            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {errorMessage}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="namaLengkap">Nama Lengkap</Label>
                            <Input
                                id="namaLengkap"
                                type="text"
                                placeholder="Masukkan Nama Lengkap"
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
                                placeholder="contoh@email.com"
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
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isPending}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="mt-4 flex flex-col gap-2">
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? "Memproses..." : "Register"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}