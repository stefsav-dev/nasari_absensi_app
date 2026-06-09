"use client";

import { useState } from "react";
import { useLogin } from "@/hooks/use-login";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate, isPending, isError, error } = useLogin();

  const errorMessage =
    error?.response?.data?.error ?? error?.message ?? "Terjadi kesalahan";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ email, password });
  }

  return (
  <div className="min-h-svh grid lg:grid-cols-2">
    {/* Left Side - Image */}
    <div className="hidden lg:block relative">
      <Image
        src="/images/login-banner.jpg"
        alt="Login Banner"
        fill
        className="object-cover"
        priority
      />

      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
        <div className="text-center text-white px-8">
          <h1 className="text-4xl font-bold mb-4">
            Welcome Back
          </h1>
          <p className="text-lg">
            Kelola aplikasi Anda dengan mudah dan cepat.
          </p>
        </div>
      </div>
    </div>

    {/* Right Side - Login Form */}
    <div className="flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Masukkan email dan password Anda
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3">
            {isError && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

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

          <CardFooter className="flex flex-col gap-4">
            <br />
            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Memproses..." : "Sign In"}
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  atau
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              asChild
              disabled={isPending}
            >
              <Link href="/register">Register</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  </div>
);
}