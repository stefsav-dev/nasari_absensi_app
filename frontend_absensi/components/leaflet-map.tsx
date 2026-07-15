"use client";

import { useEffect, useRef } from "react";
import type { Map, Marker, Circle } from "leaflet";

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  onMapClick: (lat: number, lng: number) => void;
}

export default function LeafletMap({
  latitude,
  longitude,
  radius,
  onMapClick,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  // Initialize map — runs once after mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Cancellation flag: prevents the async import() callback from running
    // after React StrictMode unmounts+remounts the component between its two
    // effect invocations. Without this, both in-flight promises resolve and
    // both try to call L.map() on the same DOM element → "already initialized".
    let cancelled = false;

    import("leaflet").then((L) => {
      // Bail out if:
      //  • the component was cleaned up before this promise resolved, OR
      //  • the DOM node is gone, OR
      //  • mapRef was already set by a previous run
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      // Fix default marker icons (broken in webpack/Next.js)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapContainerRef.current!).setView(
        [latitude || -6.2088, longitude || 106.8456],
        13
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom teardrop pin icon
      const customIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      // Add initial marker + circle if coordinates are already set
      if (latitude && longitude) {
        const marker = L.marker([latitude, longitude], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);

        const circle = L.circle([latitude, longitude], {
          radius: radius || 100,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          circle.setLatLng([pos.lat, pos.lng]);
          onMapClick(pos.lat, pos.lng);
        });

        markerRef.current = marker;
        circleRef.current = circle;
      }

      // Map click → place / move pin
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], {
            icon: customIcon,
            draggable: true,
          }).addTo(map);

          markerRef.current.on("dragend", () => {
            const pos = markerRef.current!.getLatLng();
            circleRef.current?.setLatLng([pos.lat, pos.lng]);
            onMapClick(pos.lat, pos.lng);
          });
        }

        if (circleRef.current) {
          circleRef.current.setLatLng([lat, lng]);
        } else {
          circleRef.current = L.circle([lat, lng], {
            radius: radius || 100,
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            weight: 2,
          }).addTo(map);
        }

        onMapClick(lat, lng);
      });

      mapRef.current = map;
      leafletRef.current = L;
    });

    return () => {
      // Stop the in-flight import from doing anything
      cancelled = true;
      // Destroy the map instance if it was already created
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep circle radius in sync when the prop changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius || 100);
    }
  }, [radius]);

  // Sync marker + circle + view when coordinates change externally (e.g. geolocation)
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !latitude || !longitude) return;
    
    const L = leafletRef.current;
    
    const customIcon = L.divIcon({
      className: "",
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = L.marker([latitude, longitude], {
        icon: customIcon,
        draggable: true,
      }).addTo(mapRef.current);

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        circleRef.current?.setLatLng([pos.lat, pos.lng]);
        onMapClick(pos.lat, pos.lng);
      });
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setRadius(radius || 100);
    } else {
      circleRef.current = L.circle([latitude, longitude], {
        radius: radius || 100,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(mapRef.current);
    }

    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
  }, [latitude, longitude, radius, onMapClick]);

  return (
    <>
      {/* Leaflet CSS — loaded inline to avoid import ordering issues with Next.js */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={mapContainerRef}
        className="h-full w-full rounded-lg"
        style={{ minHeight: "400px", zIndex: 0 }}
      />
    </>
  );
}
