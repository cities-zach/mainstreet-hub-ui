import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function localDate() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function defaultPublicationTime(date = "") {
  return `${date || localDate()}T10:00`;
}

function newPublication(date = "", channelId = "") {
  return {
    client_id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    id: null,
    channel_id: channelId,
    planned_at: defaultPublicationTime(date),
    status: "planned",
  };
}

const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const hour = hours % 12 || 12;
  return { value, label: `${hour}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}` };
});

function plannedPart(value, part) {
  const [date = "", time = "10:00"] = String(value || "").split("T");
  return part === "date" ? date : time.slice(0, 5);
}

export default function PublicationPlanner({ channels = [], value = [], onChange, defaultDate = "" }) {
  const update = (clientId, updates) => onChange(value.map((publication) => (
    publication.client_id === clientId ? { ...publication, ...updates } : publication
  )));
  const remove = (clientId) => onChange(value.filter((publication) => publication.client_id !== clientId));
  const updateDateTime = (publication, part, nextValue) => {
    const date = part === "date" ? nextValue : plannedPart(publication.planned_at, "date");
    const time = part === "time" ? nextValue : plannedPart(publication.planned_at, "time");
    update(publication.client_id, { planned_at: date && time ? `${date}T${time}` : "" });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Publication schedule</Label>
        <p className="mt-1 text-xs leading-5 text-slate-500">Add each channel and set its own date and time. Add the same channel again for a follow-up post.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {channels.map((channel) => (
          <Button key={channel.id} type="button" size="sm" variant="outline" onClick={() => onChange([...value, newPublication(defaultDate, channel.id)])}>
            <Plus className="h-3.5 w-3.5" />
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: channel.color }} />
            {channel.name}
          </Button>
        ))}
      </div>
      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-700">No publications scheduled yet.</div>
      ) : (
        <div className="space-y-3">
          {value.map((publication, index) => {
            const channel = channels.find((entry) => entry.id === publication.channel_id);
            const runNumber = value.slice(0, index + 1).filter((entry) => entry.channel_id === publication.channel_id).length;
            const channelTotal = value.filter((entry) => entry.channel_id === publication.channel_id).length;
            return (
              <div key={publication.client_id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Publication {index + 1}</Badge>
                    {channel && channelTotal > 1 && <span className="text-xs font-medium text-slate-500">{channel.name} · post {runNumber}</span>}
                  </div>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remove publication ${index + 1}`} onClick={() => remove(publication.client_id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
                  <div>
                    <Label htmlFor={`publication-channel-${publication.client_id}`}>Channel</Label>
                    <Select value={publication.channel_id} onValueChange={(channelId) => update(publication.client_id, { channel_id: channelId })}>
                      <SelectTrigger id={`publication-channel-${publication.client_id}`} className="mt-1"><SelectValue placeholder="Choose channel" /></SelectTrigger>
                      <SelectContent>{channels.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`publication-date-${publication.client_id}`}>Date</Label>
                    <Input id={`publication-date-${publication.client_id}`} className="mt-1" type="date" value={plannedPart(publication.planned_at, "date")} onChange={(event) => updateDateTime(publication, "date", event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor={`publication-time-${publication.client_id}`}>Time</Label>
                    <Select value={plannedPart(publication.planned_at, "time") || "10:00"} onValueChange={(time) => updateDateTime(publication, "time", time)}>
                      <SelectTrigger id={`publication-time-${publication.client_id}`} className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">{TIME_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`publication-status-${publication.client_id}`}>Status</Label>
                    <Select value={publication.status} onValueChange={(status) => update(publication.client_id, { status })}>
                      <SelectTrigger id={`publication-status-${publication.client_id}`} className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="scheduled">Confirmed scheduled</SelectItem><SelectItem value="failed">Needs attention</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
