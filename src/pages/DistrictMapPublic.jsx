import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Layers3, MapPinned, Search, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { getPublicDistrictMap } from "@/api";
import DistrictMap from "@/components/maps/DistrictMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fieldLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function mapSelection(layer, feature) {
  return {
    layer_key: layer.layer_key,
    layer_name: layer.display_name,
    source_key: feature.properties?.source_key || String(feature.id || ""),
    label: feature.properties?.label || feature.properties?.display_name || feature.properties?.name || layer.display_name,
    properties: feature.properties || {},
    geometry: feature.geometry,
  };
}

function legendItems(layer) {
  const config = layer.style_config || {};
  if (config.kind === "categorical") return Object.entries(config.colors || {});
  if (config.kind === "boolean") return [["Has upper-floor housing", config.trueColor], ["No upper-floor housing", config.falseColor]];
  return [[layer.display_name, config.color || config.fallbackColor || "#835879"]];
}

export default function DistrictMapPublic() {
  const { slug } = useParams();
  const [visibleLayersOverride, setVisibleLayersOverride] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [controlsOpen, setControlsOpen] = useState(true);

  const mapQuery = useQuery({
    queryKey: ["public-district-map", slug],
    queryFn: () => getPublicDistrictMap(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
  const mapData = mapQuery.data;

  const defaultVisibleLayers = useMemo(
    () => (mapData?.layers || []).filter((layer) => layer.default_visible).map((layer) => layer.layer_key),
    [mapData]
  );
  const visibleLayers = visibleLayersOverride || defaultVisibleLayers;

  const selectedLayer = useMemo(
    () => mapData?.layers?.find((layer) => layer.layer_key === selected?.layer_key) || null,
    [mapData, selected?.layer_key]
  );

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !mapData?.layers) return [];
    const results = [];
    for (const layer of mapData.layers) {
      for (const feature of layer.data?.features || []) {
        const text = Object.values(feature.properties || {}).filter((value) => value !== null).join(" ").toLowerCase();
        if (text.includes(term)) results.push(mapSelection(layer, feature));
        if (results.length >= 30) return results;
      }
    }
    return results;
  }, [mapData, search]);

  const toggleLayer = (layerKey) => {
    setVisibleLayersOverride((currentOverride) => {
      const current = currentOverride || defaultVisibleLayers;
      return current.includes(layerKey) ? current.filter((key) => key !== layerKey) : [...current, layerKey];
    });
  };

  if (mapQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading district map…</div>;
  }

  if (mapQuery.isError || !mapData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <MapPinned className="mx-auto mb-4 h-10 w-10 text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Map unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">This map may not be published yet, or the link may be incorrect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#835879]">
              <MapPinned className="h-4 w-4" /> Main Street Ottumwa
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{mapData.name}</h1>
            {mapData.description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{mapData.description}</p>}
          </div>
          <Badge variant="secondary">{Number(mapData.feature_count || 0).toLocaleString()} mapped features</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <Button variant="outline" onClick={() => setControlsOpen((value) => !value)}>
            <Layers3 className="h-4 w-4" /> {controlsOpen ? "Hide map controls" : "Show map controls"}
          </Button>
          {selected && <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><X className="h-4 w-4" /> Clear selection</Button>}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`${controlsOpen ? "block" : "hidden"} space-y-4 lg:block`}>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label htmlFor="district-map-search" className="mb-2 block text-sm font-semibold">Search the district</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="district-map-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Address, parcel, category…"
                  className="pl-9"
                />
              </div>
              {search.trim() && (
                <div className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                  {matches.length ? matches.map((match) => (
                    <button
                      key={`${match.layer_key}:${match.source_key}`}
                      type="button"
                      onClick={() => {
                        if (!visibleLayers.includes(match.layer_key)) {
                          setVisibleLayersOverride((currentOverride) => [...(currentOverride || defaultVisibleLayers), match.layer_key]);
                        }
                        setSelected(match);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                    >
                      <span className="min-w-0"><span className="block truncate text-sm font-medium">{match.label}</span><span className="block truncate text-xs text-slate-500">{match.layer_name}</span></span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  )) : <p className="p-3 text-sm text-slate-500">No matching map features.</p>}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><Layers3 className="h-4 w-4 text-[#835879]" /> Map layers</h2>
              <div className="space-y-3">
                {mapData.layers.map((layer) => (
                  <div key={layer.id} className="rounded-xl border border-slate-100 p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={visibleLayers.includes(layer.layer_key)}
                        onChange={() => toggleLayer(layer.layer_key)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#835879]"
                      />
                      <span><span className="block text-sm font-semibold">{layer.display_name}</span>{layer.description && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{layer.description}</span>}</span>
                    </label>
                    {visibleLayers.includes(layer.layer_key) && (
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2">
                        {legendItems(layer).map(([label, color]) => (
                          <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                            <span className="h-2.5 w-2.5 rounded-sm border border-black/10" style={{ backgroundColor: color }} /> {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {selected && selectedLayer && (
              <section className="rounded-2xl border border-[#835879]/25 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-[#835879]">{selectedLayer.display_name}</p><h2 className="mt-1 text-lg font-bold">{selected.label || "Map feature"}</h2></div>
                  <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Clear selected feature"><X className="h-4 w-4" /></Button>
                </div>
                <dl className="mt-4 space-y-2">
                  {(selectedLayer.popup_fields || []).map((field) => (
                    selected.properties?.[field] !== null && selected.properties?.[field] !== undefined ? (
                      <div key={field} className="grid grid-cols-[110px_1fr] gap-3 text-sm">
                        <dt className="text-slate-500">{fieldLabel(field)}</dt>
                        <dd className="break-words font-medium text-slate-800">{displayValue(selected.properties[field])}</dd>
                      </div>
                    ) : null
                  ))}
                </dl>
              </section>
            )}
          </aside>

          <section aria-label="Interactive district map" className="min-w-0">
            <DistrictMap
              mapData={mapData}
              visibleLayerKeys={visibleLayers}
              selectedFeature={selected}
              onSelectFeature={(feature) => {
                const layer = mapData.layers.find((item) => item.layer_key === feature.layer_key);
                setSelected({ ...feature, layer_name: layer?.display_name || feature.layer_key });
              }}
              heightClass="h-[68vh] min-h-[520px] max-h-[860px]"
            />
            <p className="mt-2 px-1 text-xs text-slate-500">Select a building, parcel, zone or street to see its public details. Labels appear progressively as you zoom in.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
