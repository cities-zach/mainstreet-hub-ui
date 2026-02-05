import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";

const DEFAULT_CENTER = [-93.2011, 41.5868];
const DEFAULT_ZOOM = 13;

export default function PassportMap({
  stops = [],
  stamps = [],
  mapConfig = {},
  onSelectStop,
  showControls = true,
  heightClass = "h-[420px]"
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const [locationError, setLocationError] = useState(null);

  const visitedStopIds = useMemo(
    () => new Set(stamps.map((stamp) => stamp.stop_id)),
    [stamps]
  );

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const mapStyle = mapConfig?.style || "mapbox://styles/mapbox/streets-v12";
  const fallbackStop = stops.find(
    (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)
  );
  const mapCenter = mapConfig?.center || (fallbackStop ? [fallbackStop.lng, fallbackStop.lat] : DEFAULT_CENTER);
  const mapZoom = Number.isFinite(mapConfig?.zoom)
    ? mapConfig.zoom
    : fallbackStop
      ? 14
      : DEFAULT_ZOOM;

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: mapCenter,
      zoom: mapZoom
    });
  }, [mapboxToken, mapStyle, mapCenter, mapZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    stops.forEach((stop) => {
      if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) return;
      const visited = visitedStopIds.has(stop.id);
      const marker = new mapboxgl.Marker({
        color: visited ? "#2d4650" : "#835879"
      })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<strong>${stop.name}</strong><br/>${stop.address_text || ""}`
          )
        )
        .addTo(map);
      if (onSelectStop) {
        marker.getElement().addEventListener("click", () => onSelectStop(stop));
      }
      markersRef.current.push(marker);
      bounds.extend([stop.lng, stop.lat]);
      hasBounds = true;
    });

    if (hasBounds) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [stops, visitedStopIds]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationError(null);
        const { latitude, longitude } = position.coords;
        const map = mapRef.current;
        if (!map) return;
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }
        userMarkerRef.current = new mapboxgl.Marker({ color: "#1d4ed8" })
          .setLngLat([longitude, latitude])
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setText("You are here"))
          .addTo(map);
        map.easeTo({ center: [longitude, latitude], zoom: 14 });
      },
      () => setLocationError("Unable to access your location.")
    );
  };

  if (!mapboxToken) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Mapbox token not configured. Add `VITE_MAPBOX_TOKEN` to enable the map.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showControls && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Passport stops map</div>
          <Button variant="outline" size="sm" onClick={handleLocate}>
            Use my location
          </Button>
        </div>
      )}
      {showControls && locationError && (
        <div className="text-xs text-red-500">{locationError}</div>
      )}
      <div
        ref={mapContainerRef}
        className={`${heightClass} w-full overflow-hidden rounded-2xl border border-slate-200`}
      />
    </div>
  );
}
