import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Image, MapPin } from "lucide-react";
import { apiFetch } from "@/api";
import InteractiveTourMap from "@/components/maps/InteractiveTourMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function directionsUrl(stop) {
  if (!stop?.lat || !stop?.lng) return "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.lat},${stop.lng}`)}`;
}

export default function WalkingTourPublic() {
  const { slug } = useParams();
  const [selectedStopId, setSelectedStopId] = useState(null);
  const tourQuery = useQuery({
    queryKey: ["public-walking-tour", slug],
    queryFn: () => apiFetch(`/tours/${slug}`),
    enabled: Boolean(slug),
    retry: false,
  });

  const tour = tourQuery.data?.tour;
  const stops = useMemo(() => tourQuery.data?.stops || [], [tourQuery.data?.stops]);
  const selectedStop = stops.find((stop) => stop.id === selectedStopId) || stops[0] || null;

  if (tourQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white">
        Loading walking tour...
      </div>
    );
  }

  if (tourQuery.error || !tour) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white">
        <Card className="mx-auto mt-12 max-w-xl">
          <CardContent className="p-6">
            <h1 className="text-xl font-semibold">Tour not available</h1>
            <p className="mt-2 text-sm text-slate-500">
              This walking tour may not be published yet, or the link may be incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="bg-white shadow-sm dark:bg-slate-900">
        {tour.banner_url ? (
          <img src={tour.banner_url} alt="" className="h-56 w-full object-cover md:h-72" />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Image className="h-10 w-10" />
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Badge className="mb-3">Self-guided walking tour</Badge>
          <h1 className="text-3xl font-bold md:text-4xl">{tour.title}</h1>
          {tour.description && (
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{tour.description}</p>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <InteractiveTourMap
            stops={stops}
            mode="public"
            mapConfig={tour.map_config || {}}
            selectedStopId={selectedStop?.id}
            onSelectStop={(stop) => setSelectedStopId(stop.id)}
            heightClass="h-[520px]"
          />
          <Card>
            <CardHeader>
              <CardTitle>Tour Stops</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stops.map((stop, index) => (
                <button
                  key={stop.id}
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedStop?.id === stop.id ? "border-[#835879] bg-[#835879]/5" : "bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900"
                  }`}
                  onClick={() => setSelectedStopId(stop.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#835879]/10 text-sm font-semibold text-[#835879]">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{stop.label}</p>
                      <p className="truncate text-xs text-slate-500">{stop.address_text || "Tap for details"}</p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {selectedStop ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedStop.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedStop.photo_url ? (
                  <img src={selectedStop.photo_url} alt="" className="max-h-80 w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                    <Image className="h-8 w-8" />
                  </div>
                )}
                {selectedStop.address_text && (
                  <div className="flex gap-2 text-sm text-slate-500">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{selectedStop.address_text}</span>
                  </div>
                )}
                {selectedStop.description && (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {selectedStop.description}
                  </p>
                )}
                {directionsUrl(selectedStop) && (
                  <Button asChild className="w-full bg-[#835879] text-white">
                    <a href={directionsUrl(selectedStop)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open directions
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                Select a stop on the map or list to read more.
              </CardContent>
            </Card>
          )}
        </aside>
      </main>
    </div>
  );
}
