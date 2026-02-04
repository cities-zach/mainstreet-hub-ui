import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPassport,
  createPassportStop,
  exportPassportEntriesToWheelspin,
  getEvents,
  getPassport,
  getPassports,
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

function StopEditor({ stop, onSave }) {
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

  return (
    <Dialog>
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
          <Button onClick={() => onSave(form)}>Save changes</Button>
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

  const createMutation = useMutation({
    mutationFn: createPassport,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["passports"] });
      setSelectedId(created.id);
      setForm({
        title: "",
        event_id: "",
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
                    <Input
                      placeholder="Logo URL"
                      value={stopForm.logo_url}
                      onChange={(event) =>
                        setStopForm({ ...stopForm, logo_url: event.target.value })
                      }
                    />
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
                            onSave={(data) =>
                              updateStopMutation.mutate({
                                passportId: selectedPassport.id,
                                stopId: stop.id,
                                data
                              })
                            }
                          />
                        </div>
                        {selectedPassport.public_slug && (
                          <div className="text-xs text-slate-500 break-all">
                            QR link: {`${publicUrl}?qr=${stop.qr_token}`}
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
