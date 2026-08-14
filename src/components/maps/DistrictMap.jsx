import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const OTTUMWA_CENTER = [-92.413, 41.0176];

function colorExpression(config = {}) {
  if (config.kind === "categorical" && config.property) {
    const expression = ["match", ["coalesce", ["get", config.property], "Unclassified"]];
    Object.entries(config.colors || {}).forEach(([value, color]) => expression.push(value, color));
    expression.push(config.fallbackColor || "#94a3b8");
    return expression;
  }
  if (config.kind === "boolean" && config.property) {
    return [
      "case",
      ["==", ["get", config.property], true],
      config.trueColor || "#0f766e",
      config.falseColor || "#cbd5e1",
    ];
  }
  return config.color || "#835879";
}

function labelMinZoom(layer) {
  const minimum = Number(layer.min_zoom) || 0;
  if (layer.layer_key === "district_boundary") return Math.max(minimum, 12);
  if (layer.layer_key === "tax_zones" || layer.layer_key === "main_street") return Math.max(minimum, 14);
  if (layer.layer_key === "parcels") return Math.max(minimum, 18);
  return Math.max(minimum, 16);
}

function geometryBounds(geometry) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (value) => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      bounds[0] = Math.min(bounds[0], value[0]);
      bounds[1] = Math.min(bounds[1], value[1]);
      bounds[2] = Math.max(bounds[2], value[0]);
      bounds[3] = Math.max(bounds[3], value[1]);
      return;
    }
    value.forEach(visit);
  };
  visit(geometry?.coordinates);
  return bounds.every(Number.isFinite) ? bounds : null;
}

function datasetBounds(mapData) {
  if (Array.isArray(mapData?.bounds) && mapData.bounds.length === 4) return mapData.bounds;
  let result = null;
  for (const layer of mapData?.layers || []) {
    for (const feature of layer.data?.features || []) {
      const next = geometryBounds(feature.geometry);
      if (!next) continue;
      result = result
        ? [Math.min(result[0], next[0]), Math.min(result[1], next[1]), Math.max(result[2], next[2]), Math.max(result[3], next[3])]
        : next;
    }
  }
  return result;
}

function selectedFromMapFeature(feature, layerKey) {
  const properties = { ...(feature.properties || {}) };
  return {
    layer_key: layerKey,
    source_key: properties.source_key || String(feature.id || ""),
    label: properties.label || properties.display_name || properties.name || null,
    properties,
    geometry: feature.geometry,
  };
}

export default function DistrictMap({
  mapData,
  visibleLayerKeys = [],
  selectedFeature = null,
  onSelectFeature,
  heightClass = "h-[620px]",
  fitPadding = 48,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const renderedRef = useRef([]);
  const handlersRef = useRef([]);
  const onSelectRef = useRef(onSelectFeature);
  const fittedImportRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const visibleSet = useMemo(() => new Set(visibleLayerKeys), [visibleLayerKeys]);

  useEffect(() => {
    onSelectRef.current = onSelectFeature;
  }, [onSelectFeature]);

  useEffect(() => {
    if (!token || !containerRef.current) return undefined;
    mapboxgl.accessToken = token;
    let map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: mapData?.map_style || "mapbox://styles/mapbox/streets-v12",
        center: mapData?.default_center || OTTUMWA_CENTER,
        zoom: Number(mapData?.default_zoom) || 14,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), "top-right");
      map.on("load", () => setLoaded(true));
      map.on("error", (event) => {
        if (/token|style|unauthorized/i.test(event?.error?.message || "")) setMapError(true);
      });
      mapRef.current = map;
    } catch {
      queueMicrotask(() => setMapError(true));
    }
    return () => {
      handlersRef.current = [];
      renderedRef.current = [];
      fittedImportRef.current = null;
      setLoaded(false);
      map?.remove();
      mapRef.current = null;
    };
  }, [mapData?.default_center, mapData?.default_zoom, mapData?.id, mapData?.map_style, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !mapData?.layers) return undefined;

    for (const handler of handlersRef.current) {
      map.off(handler.event, handler.layerId, handler.callback);
    }
    handlersRef.current = [];
    for (const rendered of [...renderedRef.current].reverse()) {
      rendered.layerIds.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      rendered.sourceIds.forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
    }
    renderedRef.current = [];

    for (const layer of mapData.layers) {
      if (!layer.data?.features?.length) continue;
      const sourceId = `district-map-${layer.layer_key}`;
      const labelSourceId = `${sourceId}-labels`;
      const fillId = `${sourceId}-fill`;
      const lineId = `${sourceId}-line`;
      const selectionId = `${sourceId}-selection`;
      const labelId = `${sourceId}-label`;
      const isLine = String(layer.geometry_type || "").toLowerCase().includes("line");
      const config = layer.style_config || {};
      const visibility = visibleSet.has(layer.layer_key) ? "visible" : "none";
      const layerIds = [];
      const sourceIds = [sourceId];

      map.addSource(sourceId, { type: "geojson", data: layer.data, promoteId: "source_key" });
      if (isLine) {
        map.addLayer({
          id: lineId,
          type: "line",
          source: sourceId,
          minzoom: Number(layer.min_zoom) || 0,
          maxzoom: Number(layer.max_zoom) || 22,
          layout: { visibility, "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": colorExpression(config),
            "line-width": Number(config.lineWidth) || 3,
            "line-opacity": 0.9,
          },
        });
        layerIds.push(lineId);
        map.addLayer({
          id: selectionId,
          type: "line",
          source: sourceId,
          layout: { visibility, "line-cap": "round", "line-join": "round" },
          filter: ["==", ["get", "source_key"], ""],
          paint: { "line-color": "#111827", "line-width": (Number(config.lineWidth) || 3) + 4 },
        });
      } else {
        map.addLayer({
          id: fillId,
          type: "fill",
          source: sourceId,
          minzoom: Number(layer.min_zoom) || 0,
          maxzoom: Number(layer.max_zoom) || 22,
          layout: { visibility },
          paint: {
            "fill-color": colorExpression(config),
            "fill-opacity": Number(config.fillOpacity ?? 0.22),
          },
        });
        map.addLayer({
          id: lineId,
          type: "line",
          source: sourceId,
          minzoom: Number(layer.min_zoom) || 0,
          maxzoom: Number(layer.max_zoom) || 22,
          layout: { visibility },
          paint: {
            "line-color": config.color || "#475569",
            "line-width": Number(config.lineWidth) || (layer.layer_key === "district_boundary" ? 3 : 1.25),
            "line-opacity": 0.9,
          },
        });
        layerIds.push(fillId, lineId);
        map.addLayer({
          id: selectionId,
          type: "line",
          source: sourceId,
          layout: { visibility },
          filter: ["==", ["get", "source_key"], ""],
          paint: { "line-color": "#111827", "line-width": 4 },
        });
      }
      layerIds.push(selectionId);

      if (layer.labels?.features?.length) {
        map.addSource(labelSourceId, { type: "geojson", data: layer.labels, promoteId: "source_key" });
        sourceIds.push(labelSourceId);
        map.addLayer({
          id: labelId,
          type: "symbol",
          source: labelSourceId,
          minzoom: labelMinZoom(layer),
          maxzoom: Number(layer.max_zoom) || 22,
          layout: {
            visibility,
            "text-field": ["get", "label"],
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 17, 13],
            "text-variable-anchor": ["center", "top", "bottom", "left", "right"],
            "text-radial-offset": 0.35,
            "text-justify": "auto",
            "text-optional": true,
          },
          paint: {
            "text-color": "#172033",
            "text-halo-color": "rgba(255,255,255,0.96)",
            "text-halo-width": 1.5,
          },
        });
        layerIds.push(labelId);
      }

      const interactiveLayerId = isLine ? lineId : fillId;
      const click = (event) => {
        const feature = event.features?.[0];
        if (feature) onSelectRef.current?.(selectedFromMapFeature(feature, layer.layer_key));
      };
      const enter = () => { map.getCanvas().style.cursor = "pointer"; };
      const leave = () => { map.getCanvas().style.cursor = ""; };
      map.on("click", interactiveLayerId, click);
      map.on("mouseenter", interactiveLayerId, enter);
      map.on("mouseleave", interactiveLayerId, leave);
      handlersRef.current.push(
        { event: "click", layerId: interactiveLayerId, callback: click },
        { event: "mouseenter", layerId: interactiveLayerId, callback: enter },
        { event: "mouseleave", layerId: interactiveLayerId, callback: leave }
      );
      renderedRef.current.push({ layerKey: layer.layer_key, layerIds, sourceIds, selectionId });
    }

    const importKey = mapData.import_id || mapData.published_import_id || mapData.id;
    if (fittedImportRef.current !== importKey) {
      const bounds = datasetBounds(mapData);
      if (bounds) map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: fitPadding, duration: 0, maxZoom: 17 });
      fittedImportRef.current = importKey;
    }

    return () => {
      for (const handler of handlersRef.current) {
        if (map.getLayer(handler.layerId)) map.off(handler.event, handler.layerId, handler.callback);
      }
      handlersRef.current = [];
    };
  }, [fitPadding, loaded, mapData, visibleSet]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    for (const rendered of renderedRef.current) {
      const visibility = visibleSet.has(rendered.layerKey) ? "visible" : "none";
      rendered.layerIds.forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
      });
    }
  }, [loaded, visibleSet]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    for (const rendered of renderedRef.current) {
      if (!map.getLayer(rendered.selectionId)) continue;
      const sourceKey = selectedFeature?.layer_key === rendered.layerKey ? selectedFeature.source_key : "";
      map.setFilter(rendered.selectionId, ["==", ["get", "source_key"], sourceKey || ""]);
    }
    if (selectedFeature?.geometry) {
      const bounds = geometryBounds(selectedFeature.geometry);
      if (bounds) {
        const isPoint = bounds[0] === bounds[2] && bounds[1] === bounds[3];
        if (isPoint) map.easeTo({ center: [bounds[0], bounds[1]], zoom: Math.max(map.getZoom(), 17), duration: 500 });
        else map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 100, maxZoom: 18, duration: 500 });
      }
    }
  }, [loaded, selectedFeature]);

  if (!token) {
    return (
      <div className={`${heightClass} flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900`}>
        Mapbox is not configured. Add VITE_MAPBOX_TOKEN to display the interactive map.
      </div>
    );
  }

  if (mapError) {
    return (
      <div className={`${heightClass} flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600`}>
        The interactive map could not be loaded. The searchable layer information is still available.
      </div>
    );
  }

  return <div ref={containerRef} className={`${heightClass} w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100`} />;
}
