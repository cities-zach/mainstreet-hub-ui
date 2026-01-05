import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
            <SelectTrigger>
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
          <Input
            id="start_date"
            type="date"
            value={data.start_date || ""}
            onChange={(e) => handleChange("start_date", e.target.value)}
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
          <Input
            id="end_date"
            type="date"
            value={data.end_date || ""}
            onChange={(e) => handleChange("end_date", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            value={data.start_time || ""}
            onChange={(e) => handleChange("start_time", e.target.value)}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="time"
            value={data.end_time || ""}
            onChange={(e) => handleChange("end_time", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="committee">Committee Organizing</Label>
          <Select
            value={data.committee_organizing || ""}
            onValueChange={(val) =>
              handleChange("committee_organizing", val)
            }
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select committee" />
            </SelectTrigger>
            <SelectContent>
              {COMMITTEES.map((committee) => (
                <SelectItem key={committee} value={committee}>
                  {committee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
    </div>
  );
}
