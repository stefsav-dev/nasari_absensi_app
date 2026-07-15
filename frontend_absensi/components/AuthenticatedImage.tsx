"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import { Loader2 } from "lucide-react";

interface AuthenticatedImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export function AuthenticatedImage({ src, alt, className }: AuthenticatedImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await api.get(src, {
          responseType: "blob",
        });
        objectUrl = URL.createObjectURL(response.data);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error("Failed to fetch image", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (src) {
      fetchImage();
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted animate-pulse ${className}`}>
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground text-xs text-center p-4 ${className}`}>
        Gagal memuat gambar
      </div>
    );
  }

  return <img src={imageUrl} alt={alt || "Image"} className={className} />;
}
