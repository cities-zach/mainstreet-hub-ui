import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";

const DEFAULT_CENTER = [-93.2011, 41.5868];
const DEFAULT_ZOOM = 14;

function isMappable(stop) {
  return Number.isFinite(Number(stop?.lat)) && Number.isFinite(Number(stop?.lng));
}

export default function InteractiveTourMap({
  stops = [],
  mapConfig = {},
  mode = "public",
  selectedStopId,
  pinsLocked = false,
  onAddStop,
  onMoveStop,
  onSelectStop,
  showControls = true,
  heightClass = "h-[420px]",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const [locationError, setLocationError] = useState(null);
  const [mapError, setMapError] = useState(false);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const mappableStops = useMemo(() => stops.filter(isMappable), [stops]);
  const fallbackStop = mappableStops[0];
  const mapCenter = useMemo(
    () => mapConfig?.center || (fallbackStop ? [Number(fallbackStop.lng), Number(fallbackStop.lat)] : DEFAULT_CENTER),
    [fallbackStop, mapConfig?.center]
  );
  const mapZoom = Number.isFinite(mapConfig?.zoom) ? mapConfig.zoom : fallbackStop ? 15 : DEFAULT_ZOOM;
  const mapStyle = mapConfig?.style || "mapbox://styles/mapbox/streets-v12";

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;
    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: mapCenter,
        zoom: mapZoom,
      });
      map.on("error", () => {});
      mapRef.current = map;
    } catch (error) {
      // Some browsers/bots have no WebGL support; degrade gracefully instead
      // of crashing the whole page.
      console.warn("Map could not be initialized:", error);
      setMapError(true);
    }
  }, [mapCenter, mapStyle, mapZoom, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || pinsLocked || mode !== "builder" || !onAddStop) return undefined;
    const handleClick = (event) => {
      onAddStop({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      });
    };
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [mode, onAddStop, pinsLocked]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    mappableStops.forEach((stop, index) => {
      const isSelected = selectedStopId === stop.id;
      const marker = new mapboxgl.Marker({
        color: isSelected ? "#2d4650" : "#835879",
        draggable: mode === "builder" && !pinsLocked,
      })
        .setLngLat([Number(stop.lng), Number(stop.lat)])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setText(
            `${index + 1}. ${stop.label || stop.name || "Tour stop"}`
          )
        )
        .addTo(map);

      marker.getElement().addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectStop?.(stop);
      });

      if (mode === "builder" && !pinsLocked && onMoveStop) {
        marker.on("dragend", () => {
          const next = marker.getLngLat();
          onMoveStop(stop, { lat: next.lat, lng: next.lng });
        });
      }

      markersRef.current.push(marker);
      bounds.extend([Number(stop.lng), Number(stop.lat)]);
      hasBounds = true;
    });

    if (hasBounds) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 16 });
    }
  }, [mappableStops, mode, onMoveStop, onSelectStop, pinsLocked, selectedStopId]);

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
        map.easeTo({ center: [longitude, latitude], zoom: 16 });
      },
      () => setLocationError("Unable to access your location.")
    );
  };

  if (!mapboxToken) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        Mapbox token not configured. Add `VITE_MAPBOX_TOKEN` to enable the map.
      </div>
    );
  }

  if (mapError) {
    return (
      <div className={`${heightClass} flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400`}>
        <p>
          The interactive map can&apos;t be displayed on this device or browser.
          {mode === "public" ? " You can still browse the stops in the list below." : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {mode === "builder"
              ? pinsLocked
                ? "Pins are locked. Select pins to edit details, or unlock to add and move pins."
                : "Click the map to drop a pin. Drag pins to adjust them."
              : "Walking tour map"}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleLocate}>
            Use my location
          </Button>
        </div>
      )}
      {showControls && locationError && <div className="text-xs text-red-500">{locationError}</div>}
      <div
        ref={mapContainerRef}
        className={`${heightClass} w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800`}
      />
    </div>
  );
}
