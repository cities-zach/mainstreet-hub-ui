import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PostEventSection({ data, onChange, readOnly }) {
  const update = (field, value) => onChange({ [field]: value });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Complete these fields before marking the event finished so future
        planners have a clear record of results and lessons.
      </div>

      <div className="space-y-2">
        <Label htmlFor="actual_attendance">Actual attendance</Label>
        <Input
          id="actual_attendance"
          type="number"
          min="0"
          inputMode="numeric"
          value={data.actual_attendance ?? ""}
          onChange={(event) =>
            update("actual_attendance", event.currentTarget.value)
          }
          placeholder="Final attendance count"
          disabled={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_outcomes">Actual outcomes</Label>
        <Textarea
          id="event_outcomes"
          value={data.event_outcomes || ""}
          onChange={(event) =>
            update("event_outcomes", event.currentTarget.value)
          }
          placeholder="What happened? Include measurable results and notable outcomes."
          rows={5}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lessons_learned">Lessons learned</Label>
        <Textarea
          id="lessons_learned"
          value={data.lessons_learned || ""}
          onChange={(event) =>
            update("lessons_learned", event.currentTarget.value)
          }
          placeholder="What should next year's planners repeat, change, or avoid?"
          rows={5}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="post_event_notes">Additional post-event notes</Label>
        <Textarea
          id="post_event_notes"
          value={data.post_event_notes || ""}
          onChange={(event) =>
            update("post_event_notes", event.currentTarget.value)
          }
          placeholder="Links, follow-up context, unresolved items, or archival notes"
          rows={5}
          disabled={readOnly}
        />
      </div>
    </div>
  );
}
