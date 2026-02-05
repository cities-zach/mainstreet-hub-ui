import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPassport,
  createPassportStop,
  deletePassport,
  exportPassportEntriesToWheelspin,
  geocodeAddress,
  getEvents,
  getPassport,
  getPassports,
  getPassportStopSuggestions,
  getPassportReport,
  lockPassport,
  publishPassport,
  updatePassport,
  updatePassportStop
} from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { uploadPublicFile } from "@/lib/uploads";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import PassportMap from "@/components/passport/PassportMap";

function StopEditor({ stop, onSave }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: stop.name || "",
    address_text: stop.address_text || "",
    lat: stop.lat ?? "",
    lng: stop.lng ?? "",
    logo_url: stop.logo_url || "",
    special_text: stop.special_text || "",
    is_active: stop.is_active ?? true,
    requires_staff_confirmation: stop.requires_staff_confirmation ?? false,
    extra_entry_multiplier: stop.extra_entry_multiplier ?? ""
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadingLogo(true);
      const result = await uploadPublicFile({
        bucket: "uploads",
        pathPrefix: "passport-stops",
        file
      });
      setForm((prev) => ({ ...prev, logo_url: result.file_url }));
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    const ok = await onSave(form);
    if (ok !== false) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit stop</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            placeholder="Stop name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            placeholder="Address"
            value={form.address_text}
            onChange={(event) =>
              setForm({ ...form, address_text: event.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Latitude"
              value={form.lat}
              onChange={(event) => setForm({ ...form, lat: event.target.value })}
            />
            <Input
              placeholder="Longitude"
              value={form.lng}
              onChange={(event) => setForm({ ...form, lng: event.target.value })}
            />
          </div>
          <Input
            placeholder="Logo URL"
            value={form.logo_url}
            onChange={(event) =>
              setForm({ ...form, logo_url: event.target.value })
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={uploadingLogo}
              onClick={() => document.getElementById(`logo-upload-${stop.id}`)?.click()}
            >
              {uploadingLogo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="ml-2">Upload logo</span>
            </Button>
            {form.logo_url && (
              <img
                src={form.logo_url}
                alt="Stop logo"
                className="h-10 w-10 rounded-full object-cover border"
              />
            )}
            <input
              id={`logo-upload-${stop.id}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
          <Textarea
            placeholder="Special text"
            value={form.special_text}
            onChange={(event) =>
              setForm({ ...form, special_text: event.target.value })
            }
          />
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Stop active</div>
              <div className="text-xs text-slate-500">Show this stop on the map</div>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) =>
                setForm({ ...form, is_active: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Requires staff confirmation</div>
              <div className="text-xs text-slate-500">
                Block public stamps unless a staff user is signed in
              </div>
            </div>
            <Switch
              checked={form.requires_staff_confirmation}
              onCheckedChange={(checked) =>
                setForm({ ...form, requires_staff_confirmation: checked })
              }
            />
          </div>
          <Input
            placeholder="Extra entry multiplier"
            value={form.extra_entry_multiplier}
            onChange={(event) =>
              setForm({ ...form, extra_entry_multiplier: event.target.value })
            }
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PassportAdmin() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    event_id: "",
    banner_url: "",
    entries_per_required_stops: 1,
    required_stops_count: "",
    allow_extra_entries: false,
    allow_scores: false,
    require_contact: false,
    require_staff_confirmation: false
  });
  const [stopForm, setStopForm] = useState({
    name: "",
    address_text: "",
    lat: "",
    lng: "",
    logo_url: "",
    special_text: "",
    sort_order: ""
  });
  const [stopSuggestions, setStopSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [uploadingStopLogo, setUploadingStopLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [locatingStop, setLocatingStop] = useState(false);

  const { data: passports = [], isLoading } = useQuery({
    queryKey: ["passports"],
    queryFn: getPassports
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents
  });

  const { data: passportDetail } = useQuery({
    queryKey: ["passport", selectedId],
    queryFn: () => getPassport(selectedId),
    enabled: Boolean(selectedId)
  });

  useEffect(() => {
    if (!stopForm.name || stopForm.name.trim().length < 2) {
      setStopSuggestions([]);
      return;
    }
    let active = true;
    const handle = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const suggestions = await getPassportStopSuggestions(stopForm.name.trim());
        if (active) setStopSuggestions(suggestions || []);
      } catch {
        if (active) setStopSuggestions([]);
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [stopForm.name]);

  const createMutation = useMutation({
    mutationFn: createPassport,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["passports"] });
      setSelectedId(created.id);
      setForm({
        title: "",
        event_id: "",
        banner_url: "",
        entries_per_required_stops: 1,
        required_stops_count: "",
        allow_extra_entries: false,
        allow_scores: false,
        require_contact: false,
        require_staff_confirmation: false
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePassport(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["passport", selectedId] })
  });

  const publishMutation = useMutation({
    mutationFn: publishPassport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passports"] });
      queryClient.invalidateQueries({ queryKey: ["passport", selectedId] });
      toast.success("Passport published");
    }
  });

  const lockMutation = useMutation({
    mutationFn: lockPassport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passports"] });
      queryClient.invalidateQueries({ queryKey: ["passport", selectedId] });
    }
  });

  const createStopMutation = useMutation({
    mutationFn: ({ passportId, data }) => createPassportStop(passportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passport", selectedId] });
      setStopForm({
        name: "",
        address_text: "",
        lat: "",
        lng: "",
        logo_url: "",
        special_text: "",
        sort_order: ""
      });
    }
  });

  const updateStopMutation = useMutation({
    mutationFn: ({ passportId, stopId, data }) =>
      updatePassportStop(passportId, stopId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["passport", selectedId] })
  });

  const exportWheelMutation = useMutation({
    mutationFn: ({ passportId }) => exportPassportEntriesToWheelspin(passportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["passport", selectedId] })
  });

  const reportMutation = useMutation({
    mutationFn: (id) => getPassportReport(id)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deletePassport(id),
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["passports"] });
    }
  });

  const selectedPassport = passportDetail?.passport;
  const stops = passportDetail?.stops || [];
  const stats = passportDetail?.stats || {};

  const publicUrl = useMemo(() => {
    if (!selectedPassport?.public_slug) return null;
    if (typeof window === "undefined") return selectedPassport.public_slug;
    return `${window.location.origin}/p/${selectedPassport.public_slug}`;
  }, [selectedPassport?.public_slug]);

  const handleCreate = () => {
    createMutation.mutate({
      ...form,
      event_id: form.event_id || null,
      required_stops_count: form.required_stops_count
        ? Number(form.required_stops_count)
        : null
    });
  };

  const handleStopLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadingStopLogo(true);
      const result = await uploadPublicFile({
        bucket: "uploads",
        pathPrefix: "passport-stops",
        file
      });
      setStopForm((prev) => ({ ...prev, logo_url: result.file_url }));
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setUploadingStopLogo(false);
    }
  };

  const handleBannerUpload = async (event, { applyToSelected = false } = {}) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadingBanner(true);
      const result = await uploadPublicFile({
        bucket: "uploads",
        pathPrefix: "passport-banners",
        file
      });
      if (applyToSelected && selectedPassport?.id) {
        updateMutation.mutate({
          id: selectedPassport.id,
          data: { banner_url: result.file_url }
        });
      } else {
        setForm((prev) => ({ ...prev, banner_url: result.file_url }));
      }
      toast.success("Banner uploaded");
    } catch (err) {
      toast.error(err.message || "Failed to upload banner");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAutoLocate = async () => {
    const address = (stopForm.address_text || "").trim();
    if (!address) {
      toast.error("Enter an address to locate.");
      return;
    }
    try {
      setLocatingStop(true);
      const result = await geocodeAddress(address);
      setStopForm((prev) => ({
        ...prev,
        lat: result.lat ?? prev.lat,
        lng: result.lng ?? prev.lng,
        address_text: result.place_name || prev.address_text
      }));
      toast.success("Location updated from Mapbox");
    } catch (err) {
      toast.error(err.message || "Unable to locate address");
    } finally {
      setLocatingStop(false);
    }
  };

  const applySuggestion = (suggestion) => {
    setStopForm((prev) => ({
      ...prev,
      name: suggestion.name || prev.name,
      address_text: suggestion.address_text || "",
      lat: suggestion.lat ?? "",
      lng: suggestion.lng ?? "",
      logo_url: suggestion.logo_url || "",
      special_text: suggestion.special_text || ""
    }));
    setStopSuggestions([]);
  };

  const handleAddStop = () => {
    if (!selectedId) return;
    createStopMutation.mutate({
      passportId: selectedId,
      data: {
        ...stopForm,
        lat: stopForm.lat || null,
        lng: stopForm.lng || null,
        sort_order: stopForm.sort_order || 0
      }
    });
  };

  const handleExportReport = async () => {
    if (!selectedPassport?.id) return;
    try {
      const report = await reportMutation.mutateAsync(selectedPassport.id);
      const workbook = XLSX.utils.book_new();

      const summaryRows = [
        {
          passport_title: report.passport?.title || "",
          required_stops: report.passport?.required_stops_count ?? "",
          total_participants: report.summary?.total_participants ?? 0,
          completed_passports: report.summary?.completed_passports ?? 0,
          started_not_finished: report.summary?.started_not_finished ?? 0
        }
      ];
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summaryRows),
        "Summary"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(report.contacts || []),
        "Contacts"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(report.stop_stats || []),
        "Stops"
      );

      if (report.scores && report.scores.length > 0) {
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.json_to_sheet(report.scores),
          "Scores"
        );
      }

      const safeTitle =
        (report.passport?.title || "passport-report")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "passport-report";
      XLSX.writeFile(workbook, `${safeTitle}.xlsx`);
    } catch (err) {
      toast.error(err.message || "Failed to export report");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Passport Builder</h1>
          <p className="text-sm text-slate-500">
            Create crawl passports, configure stops, and publish a public link.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Passports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <div className="text-sm text-slate-500">Loading…</div>}
            {passports.map((passport) => (
              <button
                key={passport.id}
                onClick={() => setSelectedId(passport.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectedId === passport.id
                    ? "border-[#835879] bg-[#835879]/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="font-medium">{passport.title}</div>
                <div className="text-xs text-slate-500">
                  {passport.status} • {passport.stop_count} stops • {passport.participant_count}{" "}
                  participants
                </div>
              </button>
            ))}
            <div className="pt-4 border-t space-y-2">
              <div className="text-sm font-medium">New passport</div>
              <Input
                placeholder="Passport title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <div className="space-y-2">
                <Input
                  placeholder="Banner image URL"
                  value={form.banner_url}
                  onChange={(event) =>
                    setForm({ ...form, banner_url: event.target.value })
                  }
                />
                <div className="text-xs text-slate-500">
                  Recommended banner size: 1200 × 600 (mobile-friendly).
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingBanner}
                    onClick={() =>
                      document.getElementById("passport-banner-upload")?.click()
                    }
                  >
                    {uploadingBanner ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="ml-2">Upload banner</span>
                  </Button>
                  {form.banner_url && (
                    <img
                      src={form.banner_url}
                      alt="Passport banner"
                      className="h-12 w-24 rounded-md object-cover border"
                    />
                  )}
                  <input
                    id="passport-banner-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleBannerUpload(event)}
                  />
                </div>
              </div>
              <select
                value={form.event_id}
                onChange={(event) => setForm({ ...form, event_id: event.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">No event linked</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title || event.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="Stops per entry"
                  value={form.entries_per_required_stops}
                  onChange={(event) =>
                    setForm({ ...form, entries_per_required_stops: event.target.value })
                  }
                />
                <Input
                  type="number"
                  min="1"
                  placeholder="Required stops"
                  value={form.required_stops_count}
                  onChange={(event) =>
                    setForm({ ...form, required_stops_count: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                {[
                  ["allow_extra_entries", "Allow extra entries"],
                  ["allow_scores", "Allow scoring"],
                  ["require_contact", "Require contact info"],
                  ["require_staff_confirmation", "Require staff confirmation"]
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    {label}
                    <Switch
                      checked={form[key]}
                      onCheckedChange={(checked) => setForm({ ...form, [key]: checked })}
                    />
                  </label>
                ))}
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!form.title}>
                Create passport
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedPassport ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Passport overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500">Status:</span>
                    <span className="rounded-full px-3 py-1 bg-slate-100 text-slate-700 capitalize">
                      {selectedPassport.status || "draft"}
                    </span>
                    {selectedPassport.status === "published" && (
                      <span className="rounded-full px-3 py-1 bg-emerald-100 text-emerald-700">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="rounded-xl border p-3 text-sm">
                      <div className="text-slate-500">Participants</div>
                      <div className="text-lg font-semibold">{stats.participants || 0}</div>
                    </div>
                    <div className="rounded-xl border p-3 text-sm">
                      <div className="text-slate-500">Stamps</div>
                      <div className="text-lg font-semibold">{stats.stamps || 0}</div>
                    </div>
                    <div className="rounded-xl border p-3 text-sm">
                      <div className="text-slate-500">Entries</div>
                      <div className="text-lg font-semibold">{stats.entries || 0}</div>
                    </div>
                  </div>
                  {publicUrl && (
                    <div className="rounded-xl border p-3 text-sm">
                      <div className="text-slate-500">Public URL</div>
                      <div className="font-medium break-all">{publicUrl}</div>
                    </div>
                  )}
                  <div className="rounded-xl border p-3 text-sm space-y-2">
                    <div className="text-slate-500">Passport banner</div>
                    {selectedPassport.banner_url && (
                      <img
                        src={selectedPassport.banner_url}
                        alt="Passport banner"
                        className="h-24 w-full rounded-lg object-cover border"
                      />
                    )}
                    <div className="text-xs text-slate-500">
                      Recommended banner size: 1200 × 600 (mobile-friendly).
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploadingBanner}
                        onClick={() =>
                          document.getElementById("passport-banner-upload-edit")?.click()
                        }
                      >
                        {uploadingBanner ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span className="ml-2">Upload banner</span>
                      </Button>
                      <input
                        id="passport-banner-upload-edit"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                          handleBannerUpload(event, { applyToSelected: true })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => publishMutation.mutate(selectedPassport.id)}
                      disabled={publishMutation.isPending}
                    >
                      Publish
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => lockMutation.mutate(selectedPassport.id)}
                      disabled={lockMutation.isPending}
                    >
                      Lock entries
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportWheelMutation.mutate({ passportId: selectedPassport.id })}
                      disabled={exportWheelMutation.isPending}
                    >
                      Export to WheelSpin
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportReport}
                      disabled={reportMutation.isPending || selectedPassport.status !== "locked"}
                      title={
                        selectedPassport.status !== "locked"
                          ? "Lock entries to export the report"
                          : "Export report"
                      }
                    >
                      Export report
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Delete this passport? This cannot be undone and will remove all stops, stamps, and entries."
                          )
                        ) {
                          deleteMutation.mutate(selectedPassport.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Delete passport
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stops</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Input
                      placeholder="Stop name"
                      value={stopForm.name}
                      onChange={(event) =>
                        setStopForm({ ...stopForm, name: event.target.value })
                      }
                    />
                    {(suggestionsLoading || stopSuggestions.length > 0) && (
                      <div className="rounded-lg border bg-white shadow-sm">
                        {suggestionsLoading && (
                          <div className="px-3 py-2 text-xs text-slate-500">
                            Loading suggestions…
                          </div>
                        )}
                        {stopSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => applySuggestion(suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            <div className="font-medium">{suggestion.name}</div>
                            <div className="text-xs text-slate-500">
                              {suggestion.address_text || "No address"}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <Input
                      placeholder="Address"
                      value={stopForm.address_text}
                      onChange={(event) =>
                        setStopForm({ ...stopForm, address_text: event.target.value })
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Latitude"
                        value={stopForm.lat}
                        onChange={(event) =>
                          setStopForm({ ...stopForm, lat: event.target.value })
                        }
                      />
                      <Input
                        placeholder="Longitude"
                        value={stopForm.lng}
                        onChange={(event) =>
                          setStopForm({ ...stopForm, lng: event.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={locatingStop}
                        onClick={handleAutoLocate}
                      >
                        {locatingStop ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Auto-locate"
                        )}
                      </Button>
                      <div className="text-xs text-slate-500">
                        Uses Mapbox to locate the address.
                      </div>
                    </div>
                    <PassportMap
                      stops={[
                        {
                          id: "preview",
                          name: stopForm.name || "Stop preview",
                          address_text: stopForm.address_text,
                          lat: stopForm.lat ? Number(stopForm.lat) : null,
                          lng: stopForm.lng ? Number(stopForm.lng) : null
                        }
                      ]}
                      stamps={[]}
                      mapConfig={{}}
                      showControls={false}
                      heightClass="h-[220px]"
                    />
                    <Input
                      placeholder="Logo URL"
                      value={stopForm.logo_url}
                      onChange={(event) =>
                        setStopForm({ ...stopForm, logo_url: event.target.value })
                      }
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploadingStopLogo}
                        onClick={() =>
                          document.getElementById("stop-logo-upload")?.click()
                        }
                      >
                        {uploadingStopLogo ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span className="ml-2">Upload logo</span>
                      </Button>
                      {stopForm.logo_url && (
                        <img
                          src={stopForm.logo_url}
                          alt="Stop logo"
                          className="h-10 w-10 rounded-full object-cover border"
                        />
                      )}
                      <input
                        id="stop-logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleStopLogoUpload}
                      />
                    </div>
                    <Textarea
                      placeholder="Special text"
                      value={stopForm.special_text}
                      onChange={(event) =>
                        setStopForm({ ...stopForm, special_text: event.target.value })
                      }
                    />
                    <Input
                      placeholder="Sort order"
                      value={stopForm.sort_order}
                      onChange={(event) =>
                        setStopForm({ ...stopForm, sort_order: event.target.value })
                      }
                    />
                    <Button onClick={handleAddStop} disabled={!stopForm.name}>
                      Add stop
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {stops.map((stop) => (
                      <div
                        key={stop.id}
                        className="rounded-xl border p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{stop.name}</div>
                            <div className="text-xs text-slate-500">
                              {stop.address_text || "No address"}
                            </div>
                          </div>
                          <StopEditor
                            stop={stop}
                            onSave={async (data) => {
                              await updateStopMutation.mutateAsync({
                                passportId: selectedPassport.id,
                                stopId: stop.id,
                                data
                              });
                              return true;
                            }}
                          />
                        </div>
                        {selectedPassport.public_slug && (
                          <div className="text-xs text-slate-500 break-all space-y-1">
                            <div>Stamp QR: {`${publicUrl}?qr=${stop.qr_token}`}</div>
                            {stop.bonus_qr_token && (
                              <div>Bonus QR: {`${publicUrl}?bonus=${stop.bonus_qr_token}`}</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {stops.length === 0 && (
                      <div className="text-sm text-slate-500">No stops yet.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input
                      type="number"
                      min="1"
                      value={selectedPassport.entries_per_required_stops || 1}
                      onChange={(event) =>
                        updateMutation.mutate({
                          id: selectedPassport.id,
                          data: { entries_per_required_stops: event.target.value }
                        })
                      }
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Required stops"
                      value={selectedPassport.required_stops_count || ""}
                      onChange={(event) =>
                        updateMutation.mutate({
                          id: selectedPassport.id,
                          data: { required_stops_count: event.target.value }
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                Select a passport to manage stops and publishing.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
