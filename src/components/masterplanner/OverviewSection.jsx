import React from "react";
import { Input } from "@/components/ui/input";
import TemporalInput from "@/components/masterplanner/TemporalInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EVENT_TYPES = [
  "Fundraiser",
  "Crawl",
  "Parade",
  "Festival",
  "Concert/Performance",
  "Market",
  "Workshop",
  "Forum",
  "Social",
  "Other",
];

const COMMITTEES = [
  "Promotion",
  "Organization",
  "Design",
  "Economic Vitality",
  "MSO Board",
  "MSO Staff",
];

export default function OverviewSection({
  data,
  onChange,
  readOnly,
  validationErrors = {},
}) {
  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };
  const selectedCommittees =
    data.organizing_committees?.length
      ? data.organizing_committees
      : data.committee_organizing
        ? [data.committee_organizing]
        : [];

  const toggleCommittee = (committee, checked) => {
    const next = checked
      ? Array.from(new Set([...selectedCommittees, committee]))
      : selectedCommittees.filter((item) => item !== committee);
    onChange({
      organizing_committees: next,
      committee_organizing: next[0] || "",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-2">
        <Label htmlFor="name">Event Name *</Label>
        <Input
          id="name"
          value={data.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Awesome Main Street Event"
          disabled={readOnly}
          className={
            validationErrors.name
              ? "border-red-500 focus-visible:ring-red-500"
              : ""
          }
        />
        {validationErrors.name && (
          <p className="text-xs text-red-500 mt-1">
            {validationErrors.name}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="event_type">Event Type</Label>
          <Select
            value={data.event_type || ""}
            onValueChange={(val) => handleChange("event_type", val)}
            disabled={readOnly}
          >
            <SelectTrigger id="event_type" aria-label="Event Type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={data.location || ""}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="e.g. Central Park"
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date *</Label>
          <TemporalInput
            id="start_date"
            type="date"
            value={data.start_date || ""}
            onValueChange={(value) => handleChange("start_date", value)}
            disabled={readOnly}
            className={
              validationErrors.start_date
                ? "border-red-500 focus-visible:ring-red-500"
                : ""
            }
          />
          {validationErrors.start_date && (
            <p className="text-xs text-red-500 mt-1">
              {validationErrors.start_date}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <TemporalInput
            id="end_date"
            type="date"
            value={data.end_date || ""}
            onValueChange={(value) => handleChange("end_date", value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <TemporalInput
            id="start_time"
            type="time"
            value={data.start_time || ""}
            onValueChange={(value) => handleChange("start_time", value)}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <TemporalInput
            id="end_time"
            type="time"
            value={data.end_time || ""}
            onValueChange={(value) => handleChange("end_time", value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label id="organizing-committees-label">Organizing Committees</Label>
          <div
            className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2"
            role="group"
            aria-labelledby="organizing-committees-label"
          >
            {COMMITTEES.map((committee) => {
              const id = `committee-${committee.toLowerCase().replace(/\s+/g, "-")}`;
              return (
                <div key={committee} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={selectedCommittees.includes(committee)}
                    onCheckedChange={(checked) =>
                      toggleCommittee(committee, Boolean(checked))
                    }
                    disabled={readOnly}
                  />
                  <Label htmlFor={id} className="font-normal">
                    {committee}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admission">Admission</Label>
          <Input
            id="admission"
            value={data.admission || ""}
            onChange={(e) => handleChange("admission", e.target.value)}
            placeholder="e.g. Free, $10 Ticket, Donations"
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Event Description</Label>
        <Textarea
          id="description"
          value={data.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Briefly describe the event..."
          rows={5}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience">Event Audience</Label>
        <Textarea
          id="audience"
          value={data.audience || ""}
          onChange={(e) => handleChange("audience", e.target.value)}
          placeholder="Who is this event for?"
          rows={3}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mission_fit">How Event Fits MSO Mission</Label>
        <Textarea
          id="mission_fit"
          value={data.mission_fit || ""}
          onChange={(e) => handleChange("mission_fit", e.target.value)}
          placeholder="Explain alignment with Main Street Ottumwa mission..."
          rows={3}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h3 className="font-semibold text-[#2d4650]">Source & Provenance</h3>
          <p className="text-sm text-slate-500">
            Record where historical plan information came from and any known
            limitations.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="source_imported_from">Imported from</Label>
            <Input
              id="source_imported_from"
              value={data.source_imported_from || ""}
              onChange={(event) =>
                handleChange("source_imported_from", event.currentTarget.value)
              }
              placeholder="File, system, or prior plan"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source_year">Source year</Label>
            <Input
              id="source_year"
              type="number"
              inputMode="numeric"
              value={data.source_year ?? ""}
              onChange={(event) =>
                handleChange("source_year", event.currentTarget.value)
              }
              placeholder="YYYY"
              disabled={readOnly}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="import_caveats">Import caveats</Label>
          <Textarea
            id="import_caveats"
            value={data.import_caveats || ""}
            onChange={(event) =>
              handleChange("import_caveats", event.currentTarget.value)
            }
            placeholder="Conflicting values, stale details, or items that need verification"
            rows={3}
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
