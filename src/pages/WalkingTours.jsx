import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Image, Lock, MapPin, Plus, Trash2, Unlock, Upload } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api";
import { uploadPublicFile } from "@/lib/uploads";
import InteractiveTourMap from "@/components/maps/InteractiveTourMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const BANNER_HELP = "Recommended banner size: 1600 x 600 px, JPG/PNG/WebP, under 5 MB.";

const emptyTour = {
  title: "",
  description: "",
  banner_url: "",
  search_enabled: false,
};

const emptyStop = {
  label: "",
  description: "",
  photo_url: "",
  address_text: "",
  lat: "",
  lng: "",
  is_active: true,
};

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function publicTourUrl(tour) {
  if (!tour?.public_slug || typeof window === "undefined") return "";
  return `${window.location.origin}/tours/${tour.public_slug}`;
}

function sharePreviewUrl(tour) {
  if (!tour?.public_slug || typeof window === "undefined") return "";
  return `${window.location.origin}/api/tours/${tour.public_slug}/share`;
}

export default function WalkingTours() {
  const queryClient = useQueryClient();
  const [selectedTourId, setSelectedTourId] = useState(null);
  const [tourForm, setTourForm] = useState(emptyTour);
  const [stopForm, setStopForm] = useState(emptyStop);
  const [editingStopId, setEditingStopId] = useState(null);
  const [pinsLocked, setPinsLocked] = useState(true);
  const [uploading, setUploading] = useState({ banner: false, stop: false });

  const tours = useQuery({
    queryKey: ["walking-tours"],
    queryFn: () => apiFetch("/walking-tours"),
  });

  const selectedTour = useQuery({
    queryKey: ["walking-tours", selectedTourId],
    queryFn: () => apiFetch(`/walking-tours/${selectedTourId}`),
    enabled: Boolean(selectedTourId),
  });

  const tour = selectedTour.data;
  const stops = useMemo(() => tour?.stops || [], [tour?.stops]);

  const invalidateTours = () => {
    queryClient.invalidateQueries({ queryKey: ["walking-tours"] });
  };

  const createTour = useMutation({
    mutationFn: (payload) =>
      apiFetch("/walking-tours", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (created) => {
      toast.success("Walking tour created");
      setSelectedTourId(created.id);
      setTourForm(emptyTour);
      invalidateTours();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTour = useMutation({
    mutationFn: (payload) =>
      apiFetch(`/walking-tours/${selectedTourId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Tour updated");
      invalidateTours();
    },
    onError: (error) => toast.error(error.message),
  });

  const publishTour = useMutation({
    mutationFn: () => apiFetch(`/walking-tours/${selectedTourId}/publish`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Tour published");
      invalidateTours();
    },
    onError: (error) => toast.error(error.message),
  });

  const archiveTour = useMutation({
    mutationFn: (id) => apiFetch(`/walking-tours/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Tour archived");
      setSelectedTourId(null);
      invalidateTours();
    },
    onError: (error) => toast.error(error.message),
  });

  const createStop = useMutation({
    mutationFn: (payload) =>
      apiFetch(`/walking-tours/${selectedTourId}/stops`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Stop added");
      resetStopForm();
      invalidateTours();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateStop = useMutation({
    mutationFn: ({ stopId, payload }) =>
      apiFetch(`/walking-tours/${selectedTourId}/stops/${stopId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Stop updated");
      resetStopForm();
      invalidateTours();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteStop = useMutation({
    mutationFn: (stopId) =>
      apiFetch(`/walking-tours/${selectedTourId}/stops/${stopId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Stop deleted");
      resetStopForm();
      invalidateTours();
    },
    onError: (error) => toast.error(error.message),
  });

  const reorderStops = useMutation({
    mutationFn: (stopIds) =>
      apiFetch(`/walking-tours/${selectedTourId}/stops/reorder`, {
        method: "POST",
        body: JSON.stringify({ stop_ids: stopIds }),
      }),
    onSuccess: () => invalidateTours(),
    onError: (error) => toast.error(error.message),
  });

  const geocodeStop = useMutation({
    mutationFn: (address) =>
      apiFetch("/map/geocode", {
        method: "POST",
        body: JSON.stringify({ address }),
      }),
    onSuccess: (result) => {
      setStopForm((current) => ({
        ...current,
        lat: result.lat ?? current.lat,
        lng: result.lng ?? current.lng,
        address_text: result.place_name || current.address_text,
      }));
      toast.success("Location updated from Mapbox");
    },
    onError: (error) => toast.error(error.message),
  });

  const resetStopForm = () => {
    setStopForm(emptyStop);
    setEditingStopId(null);
  };

  const startEditingStop = (stop) => {
    setEditingStopId(stop.id);
    setStopForm({
      label: stop.label || "",
      description: stop.description || "",
      photo_url: stop.photo_url || "",
      address_text: stop.address_text || "",
      lat: stop.lat ?? "",
      lng: stop.lng ?? "",
      is_active: stop.is_active !== false,
    });
  };

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploading((current) => ({ ...current, banner: true }));
      const result = await uploadPublicFile({
        bucket: "uploads",
        pathPrefix: "walking-tours/banners",
        file,
      });
      if (selectedTourId) {
        updateTour.mutate({ banner_url: result.file_url });
      } else {
        setTourForm((current) => ({ ...current, banner_url: result.file_url }));
      }
      toast.success("Banner uploaded");
    } catch (error) {
      toast.error(error.message || "Failed to upload banner");
    } finally {
      setUploading((current) => ({ ...current, banner: false }));
    }
  };

  const handleStopPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploading((current) => ({ ...current, stop: true }));
      const result = await uploadPublicFile({
        bucket: "uploads",
        pathPrefix: "walking-tours/stops",
        file,
      });
      setStopForm((current) => ({ ...current, photo_url: result.file_url }));
      toast.success("Stop photo uploaded");
    } catch (error) {
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading((current) => ({ ...current, stop: false }));
    }
  };

  const handleTourSubmit = (event) => {
    event.preventDefault();
    if (selectedTourId) {
      updateTour.mutate(tourFormFromSelected(tour));
      return;
    }
    createTour.mutate({
      ...tourForm,
      recommended_banner_size_text: BANNER_HELP,
    });
  };

  const tourFormFromSelected = (selected) => ({
    title: selected?.title || "",
    description: selected?.description || "",
    banner_url: selected?.banner_url || "",
    search_enabled: selected?.search_enabled === true,
  });

  const handleStopSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...stopForm,
      lat: stopForm.lat === "" ? null : Number(stopForm.lat),
      lng: stopForm.lng === "" ? null : Number(stopForm.lng),
      sort_order: editingStopId ? stops.find((stop) => stop.id === editingStopId)?.sort_order || 0 : stops.length,
    };
    if (editingStopId) {
      updateStop.mutate({ stopId: editingStopId, payload });
    } else {
      createStop.mutate(payload);
    }
  };

  const handleMapAdd = ({ lat, lng }) => {
    if (!selectedTourId) {
      toast.error("Create or select a tour before dropping pins");
      return;
    }
    createStop.mutate({
      label: `Stop ${stops.length + 1}`,
      description: "",
      lat,
      lng,
      sort_order: stops.length,
      is_active: true,
    });
  };

  const moveStopMarker = (stop, nextPosition) => {
    updateStop.mutate({
      stopId: stop.id,
      payload: {
        lat: nextPosition.lat,
        lng: nextPosition.lng,
      },
    });
  };

  const moveStop = (stopId, direction) => {
    const currentIndex = stops.findIndex((stop) => stop.id === stopId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= stops.length) return;
    const nextStops = [...stops];
    const [item] = nextStops.splice(currentIndex, 1);
    nextStops.splice(nextIndex, 0, item);
    reorderStops.mutate(nextStops.map((stop) => stop.id));
  };

  const copyShareLink = async () => {
    const url = publicTourUrl(tour);
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    toast.success("Share link copied");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Walking Tours</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Build self-guided public walking tours with mapped stops, photos, and descriptions.
          </p>
        </div>
        {tour && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyShareLink} disabled={tour.status !== "published"}>
              <Copy className="h-4 w-4" />
              Copy share link
            </Button>
            {tour.status === "published" && (
              <Button asChild variant="outline">
                <a href={publicTourUrl(tour)} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open public tour
                </a>
              </Button>
            )}
            {tour.status === "published" && (
              <Button asChild variant="outline">
                <a href={sharePreviewUrl(tour)} target="_blank" rel="noreferrer">
                  Share preview
                </a>
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              className="w-full bg-[#835879] text-white"
              onClick={() => {
                setSelectedTourId(null);
                setTourForm(emptyTour);
                resetStopForm();
              }}
            >
              <Plus className="h-4 w-4" />
              New Tour
            </Button>
            {(tours.data || []).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedTourId === item.id ? "border-[#835879] bg-[#835879]/5" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
                onClick={() => {
                  setSelectedTourId(item.id);
                  setTourForm(emptyTour);
                  resetStopForm();
                  setPinsLocked(true);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.stop_count || 0} stops</p>
                  </div>
                  <Badge>{item.status}</Badge>
                </div>
              </button>
            ))}
            {!tours.isLoading && !(tours.data || []).length && (
              <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
                Create your first walking tour, add a banner, then drop pins on the map.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{tour ? tour.title : "Create Walking Tour"}</CardTitle>
                {tour && <Badge>{tour.status}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {selectedTourId && selectedTour.isLoading ? (
                <p className="text-sm text-slate-500">Loading tour...</p>
              ) : (
                <form className="space-y-4" onSubmit={handleTourSubmit}>
                  <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div className="space-y-3">
                      <Field label="Tour name">
                        <Input
                          value={selectedTourId ? tour?.title || "" : tourForm.title}
                          onChange={(event) => {
                            if (selectedTourId) {
                              queryClient.setQueryData(["walking-tours", selectedTourId], {
                                ...tour,
                                title: event.target.value,
                              });
                            } else {
                              setTourForm((current) => ({ ...current, title: event.target.value }));
                            }
                          }}
                          placeholder="Historic Downtown Walking Tour"
                        />
                      </Field>
                      <Field label="Description">
                        <Textarea
                          value={selectedTourId ? tour?.description || "" : tourForm.description}
                          onChange={(event) => {
                            if (selectedTourId) {
                              queryClient.setQueryData(["walking-tours", selectedTourId], {
                                ...tour,
                                description: event.target.value,
                              });
                            } else {
                              setTourForm((current) => ({ ...current, description: event.target.value }));
                            }
                          }}
                          placeholder="Introduce the tour and what visitors will see."
                        />
                      </Field>
                      <Field label="Banner URL" hint={tour?.recommended_banner_size_text || BANNER_HELP}>
                        <Input
                          value={selectedTourId ? tour?.banner_url || "" : tourForm.banner_url}
                          onChange={(event) => {
                            if (selectedTourId) {
                              queryClient.setQueryData(["walking-tours", selectedTourId], {
                                ...tour,
                                banner_url: event.target.value,
                              });
                            } else {
                              setTourForm((current) => ({ ...current, banner_url: event.target.value }));
                            }
                          }}
                          placeholder="https://..."
                        />
                      </Field>
                      <label className="flex items-start gap-2 rounded-xl border bg-slate-50 p-3 text-sm dark:bg-slate-900">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 accent-[#835879]"
                          checked={selectedTourId ? tour?.search_enabled === true : tourForm.search_enabled}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            if (selectedTourId) {
                              queryClient.setQueryData(["walking-tours", selectedTourId], {
                                ...tour,
                                search_enabled: checked,
                              });
                            } else {
                              setTourForm((current) => ({ ...current, search_enabled: checked }));
                            }
                          }}
                        />
                        <span>
                          <span className="font-medium text-[#2d4650] dark:text-slate-100">Enable stop search on public page</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            Adds a search bar above the stop list so visitors can quickly find a stop by name. Helpful for tours with many stops.
                          </span>
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" disabled={uploading.banner} onClick={() => document.getElementById("walking-tour-banner-upload")?.click()}>
                          <Upload className="h-4 w-4" />
                          {uploading.banner ? "Uploading..." : "Upload banner"}
                        </Button>
                        <input id="walking-tour-banner-upload" type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                        <Button type="submit" className="bg-[#835879] text-white">
                          {selectedTourId ? "Save Tour" : "Create Tour"}
                        </Button>
                        {tour && tour.status !== "published" && (
                          <Button type="button" variant="outline" onClick={() => publishTour.mutate()} disabled={!stops.length}>
                            Publish
                          </Button>
                        )}
                        {tour && (
                          <Button type="button" variant="destructive" onClick={() => archiveTour.mutate(tour.id)}>
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-3 dark:bg-slate-900">
                      {(selectedTourId ? tour?.banner_url : tourForm.banner_url) ? (
                        <img
                          src={selectedTourId ? tour?.banner_url : tourForm.banner_url}
                          alt="Tour banner preview"
                          className="h-40 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-slate-500">
                          Banner preview
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {selectedTourId && tour && (
            <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Map Builder</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        {pinsLocked
                          ? "Pins are locked. Stop details can still be edited from the form and list."
                          : "Click the map to add pins and drag existing pins to move them."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPinsLocked((current) => !current)}
                    >
                      {pinsLocked ? (
                        <>
                          <Unlock className="h-4 w-4" />
                          Unlock pins
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Lock pins
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InteractiveTourMap
                    mode="builder"
                    stops={stops}
                    selectedStopId={editingStopId}
                    pinsLocked={pinsLocked}
                    mapConfig={tour.map_config || {}}
                    onAddStop={handleMapAdd}
                    onMoveStop={moveStopMarker}
                    onSelectStop={startEditingStop}
                    heightClass="h-[520px]"
                  />
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{editingStopId ? "Edit Stop" : "Add Stop"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-3" onSubmit={handleStopSubmit}>
                      <Field label="Label">
                        <Input value={stopForm.label} onChange={(event) => setStopForm((current) => ({ ...current, label: event.target.value }))} placeholder="Historic theater" />
                      </Field>
                      <Field label="Description">
                        <Textarea value={stopForm.description} onChange={(event) => setStopForm((current) => ({ ...current, description: event.target.value }))} />
                      </Field>
                      <Field label="Photo URL">
                        <Input value={stopForm.photo_url} onChange={(event) => setStopForm((current) => ({ ...current, photo_url: event.target.value }))} placeholder="https://..." />
                      </Field>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" disabled={uploading.stop} onClick={() => document.getElementById("walking-tour-stop-upload")?.click()}>
                          <Image className="h-4 w-4" />
                          {uploading.stop ? "Uploading..." : "Upload stop photo"}
                        </Button>
                        <input id="walking-tour-stop-upload" type="file" accept="image/*" className="hidden" onChange={handleStopPhotoUpload} />
                        {stopForm.photo_url && <img src={stopForm.photo_url} alt="Stop preview" className="h-12 w-12 rounded-lg object-cover" />}
                      </div>
                      <Field label="Address">
                        <Input value={stopForm.address_text} onChange={(event) => setStopForm((current) => ({ ...current, address_text: event.target.value }))} />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Latitude">
                          <Input value={stopForm.lat} onChange={(event) => setStopForm((current) => ({ ...current, lat: event.target.value }))} />
                        </Field>
                        <Field label="Longitude">
                          <Input value={stopForm.lng} onChange={(event) => setStopForm((current) => ({ ...current, lng: event.target.value }))} />
                        </Field>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={stopForm.is_active}
                          onChange={(event) => setStopForm((current) => ({ ...current, is_active: event.target.checked }))}
                        />
                        Active on public tour
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" disabled={!stopForm.address_text || geocodeStop.isPending} onClick={() => geocodeStop.mutate(stopForm.address_text)}>
                          <MapPin className="h-4 w-4" />
                          Auto-locate
                        </Button>
                        <Button type="submit" className="bg-[#835879] text-white" disabled={!stopForm.label}>
                          {editingStopId ? "Save Stop" : "Add Stop"}
                        </Button>
                        {editingStopId && (
                          <Button type="button" variant="outline" onClick={resetStopForm}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stops</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[520px] space-y-2 overflow-auto">
                    {stops.map((stop, index) => (
                      <div key={stop.id} className="rounded-xl border p-3 text-sm">
                        <div className="flex items-start gap-3">
                          {stop.photo_url ? (
                            <img src={stop.photo_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-900">
                              <Image className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{index + 1}. {stop.label}</p>
                            <p className="truncate text-xs text-slate-500">{stop.address_text || "No address"}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => startEditingStop(stop)}>
                                Edit
                              </Button>
                              <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => moveStop(stop.id, -1)}>
                                Up
                              </Button>
                              <Button type="button" size="sm" variant="outline" disabled={index === stops.length - 1} onClick={() => moveStop(stop.id, 1)}>
                                Down
                              </Button>
                              <Button type="button" size="sm" variant="destructive" onClick={() => deleteStop.mutate(stop.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Badge>{stop.is_active ? "active" : "hidden"}</Badge>
                        </div>
                      </div>
                    ))}
                    {!stops.length && (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
                        Click the map to drop your first stop, or use the form above.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
