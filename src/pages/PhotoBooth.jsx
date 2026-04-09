import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approvePhotoBoothPhoto,
  createPhotoBoothEvent,
  getPhotoBoothEvents,
  getPhotoBoothPhotos,
  updatePhotoBoothEvent
} from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

function formatStatus(status) {
  return STATUS_LABELS[status] || status || "Draft";
}

export default function PhotoBooth() {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [newEvent, setNewEvent] = useState({
    title: "",
    prompt: "",
    consent_text: "I consent to having my photo edited and emailed to me."
  });

  const { data: events = [] } = useQuery({
    queryKey: ["photobooth_events"],
    queryFn: () => getPhotoBoothEvents()
  });

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const { data: photos = [] } = useQuery({
    queryKey: ["photobooth_photos", selectedEventId],
    queryFn: () => getPhotoBoothPhotos(selectedEventId),
    enabled: !!selectedEventId
  });

  const createEventMutation = useMutation({
    mutationFn: (payload) => createPhotoBoothEvent(payload),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ["photobooth_events"] });
      setSelectedEventId(event.id);
      setNewEvent({
        title: "",
        prompt: "",
        consent_text: newEvent.consent_text
      });
      toast.success("PhotoBooth event created");
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to create event");
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => updatePhotoBoothEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photobooth_events"] });
      toast.success("Event updated");
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to update event");
    }
  });

  const approveMutation = useMutation({
    mutationFn: (photoId) => approvePhotoBoothPhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photobooth_photos", selectedEventId] });
      toast.success("Photo approved and email sent");
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to approve photo");
    }
  });

  const handleCreateEvent = () => {
    if (!newEvent.title.trim() || !newEvent.prompt.trim()) {
      toast.error("Title and prompt are required");
      return;
    }
    createEventMutation.mutate({
      title: newEvent.title.trim(),
      prompt: newEvent.prompt.trim(),
      consent_text: newEvent.consent_text?.trim() || null
    });
  };

  const handleUpdateEvent = (updates) => {
    if (!selectedEvent) return;
    updateEventMutation.mutate({
      id: selectedEvent.id,
      data: updates
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">PhotoBooth</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Capture, edit, and deliver event photos with OpenAI.
            </p>
          </div>
          {selectedEvent && (
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {formatStatus(selectedEvent.status)}
            </Badge>
          )}
        </div>

        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Create PhotoBooth Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Event Title</Label>
              <Input
                value={newEvent.title}
                onChange={(event) => setNewEvent((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Main Street Rewind"
              />
            </div>
            <div className="space-y-2">
              <Label>OpenAI Prompt</Label>
              <Textarea
                value={newEvent.prompt}
                onChange={(event) => setNewEvent((prev) => ({ ...prev, prompt: event.target.value }))}
                placeholder="Describe the style and edits you want."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Consent Text</Label>
              <Textarea
                value={newEvent.consent_text}
                onChange={(event) =>
                  setNewEvent((prev) => ({ ...prev, consent_text: event.target.value }))
                }
                rows={3}
              />
            </div>
            <Button onClick={handleCreateEvent} disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Existing Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">No PhotoBooth events yet.</p>
            ) : (
              events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selectedEventId === event.id
                      ? "border-[#835879] bg-[#835879]/10"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {event.title}
                      </div>
                      <div className="text-xs text-slate-500">{formatStatus(event.status)}</div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {event.stats
                        ? `${event.stats.edited || 0} ready · ${event.stats.sent || 0} sent`
                        : ""}
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {selectedEvent && (
          <>
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Event Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Textarea
                    value={selectedEvent.prompt || ""}
                    onChange={(event) =>
                      handleUpdateEvent({ prompt: event.target.value })
                    }
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Consent Text</Label>
                  <Textarea
                    value={selectedEvent.consent_text || ""}
                    onChange={(event) =>
                      handleUpdateEvent({ consent_text: event.target.value })
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Review Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {photos.length === 0 ? (
                  <p className="text-sm text-slate-500">No photos yet.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {photos.map((photo) => (
                      <div key={photo.id} className="border rounded-xl p-4 space-y-3">
                        <div className="text-xs uppercase text-slate-500">{photo.status}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-slate-500">Original</div>
                            {photo.original_url ? (
                              <img
                                src={photo.original_url}
                                alt="Original"
                                className="rounded-lg border"
                              />
                            ) : (
                              <div className="text-xs text-slate-400">Missing</div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Edited</div>
                            {photo.edited_url ? (
                              <img
                                src={photo.edited_url}
                                alt="Edited"
                                className="rounded-lg border"
                              />
                            ) : (
                              <div className="text-xs text-slate-400">Pending</div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="gap-2"
                          disabled={photo.status !== "edited" || approveMutation.isPending}
                          onClick={() => approveMutation.mutate(photo.id)}
                        >
                          Approve & Send
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
