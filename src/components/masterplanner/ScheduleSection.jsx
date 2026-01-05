import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Calendar,
  ListTodo,
  Check,
} from "lucide-react";

export default function ScheduleSection({ data, onChange, readOnly }) {
  const scheduleItems = data.schedule_items || [];
  const planningItems = data.planning_schedule_items || [];

  // --- Run of Show Functions ---
  const addItem = () => {
    onChange({
      schedule_items: [
        ...scheduleItems,
        { time: "", activity: "", location: "" },
      ],
    });
  };

  const updateItem = (index, field, value) => {
    const updated = [...scheduleItems];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ schedule_items: updated });
  };

  const removeItem = (index) => {
    onChange({
      schedule_items: scheduleItems.filter((_, i) => i !== index),
    });
  };

  // --- Planning Schedule Functions ---
  const addPlanningItem = () => {
    onChange({
      planning_schedule_items: [
        ...planningItems,
        { task: "", responsible_person: "", due_date: "", notes: "" },
      ],
    });
  };

  const updatePlanningItem = (index, field, value) => {
    const updated = [...planningItems];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ planning_schedule_items: updated });
  };

  const removePlanningItem = (index) => {
    onChange({
      planning_schedule_items: planningItems.filter((_, i) => i !== index),
    });
  };

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-12 max-w-5xl">
      {/* Event Schedule / Run of Show */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <Calendar className="w-6 h-6 text-[#835879]" />
          <h2 className="text-2xl font-bold text-[#2d4650]">
            Event Schedule
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Setup Start Time</Label>
            <Input
              type="datetime-local"
              value={data.setup_start_time || ""}
              onChange={(e) =>
                handleChange("setup_start_time", e.target.value)
              }
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>Teardown End Time</Label>
            <Input
              type="datetime-local"
              value={data.teardown_end_time || ""}
              onChange={(e) =>
                handleChange("teardown_end_time", e.target.value)
              }
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>Event Start Time</Label>
            <Input
              type="time"
              value={data.event_start_time || ""}
              onChange={(e) =>
                handleChange("event_start_time", e.target.value)
              }
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>Event End Time</Label>
            <Input
              type="time"
              value={data.event_end_time || ""}
              onChange={(e) =>
                handleChange("event_end_time", e.target.value)
              }
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-semibold text-[#2d4650]">
              Run of Show / Schedule
            </Label>
            {!readOnly && (
              <Button
                onClick={addItem}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {scheduleItems.map((item, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row gap-4 items-start bg-slate-50 p-3 rounded-lg border border-slate-100"
              >
                <div className="w-full md:w-32">
                  <Input
                    type="time"
                    value={item.time}
                    onChange={(e) =>
                      updateItem(index, "time", e.target.value)
                    }
                    disabled={readOnly}
                  />
                </div>

                <div className="flex-1 w-full">
                  <Input
                    value={item.activity}
                    onChange={(e) =>
                      updateItem(index, "activity", e.target.value)
                    }
                    placeholder="Activity / Performance"
                    disabled={readOnly}
                  />
                </div>

                <div className="flex-1 w-full">
                  <Input
                    value={item.location}
                    onChange={(e) =>
                      updateItem(index, "location", e.target.value)
                    }
                    placeholder="Location / Stage"
                    disabled={readOnly}
                  />
                </div>

                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="text-slate-400 hover:text-red-500 mt-auto md:mt-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {scheduleItems.length === 0 && (
              <div className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-lg">
                No run of show items added.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Planning Schedule */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <ListTodo className="w-6 h-6 text-[#835879]" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#2d4650]">
              Planning Schedule
            </h2>
            <p className="text-sm text-slate-500">
              Tasks will be added to TaskMaster upon event approval.
            </p>
          </div>
          {!readOnly && (
            <Button
              onClick={addPlanningItem}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {planningItems.map((item, index) => (
            <div
              key={index}
              className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 space-y-1">
                  <Label className="text-xs text-slate-500">Task</Label>
                  <Input
                    value={item.task}
                    onChange={(e) =>
                      updatePlanningItem(index, "task", e.target.value)
                    }
                    placeholder="Task Description"
                    disabled={readOnly}
                    className={
                      item.status === "done"
                        ? "border-green-500 bg-green-50"
                        : ""
                    }
                  />
                  {item.status === "done" && (
                    <div className="mt-1 text-green-600 flex items-center gap-1 text-xs font-bold">
                      <Check className="w-3 h-3" /> Done
                    </div>
                  )}
                </div>

                <div className="md:col-span-4 space-y-1">
                  <Label className="text-xs text-slate-500">
                    Responsible Person
                  </Label>
                  <Input
                    value={item.responsible_person}
                    onChange={(e) =>
                      updatePlanningItem(
                        index,
                        "responsible_person",
                        e.target.value
                      )
                    }
                    placeholder="Name"
                    disabled={readOnly}
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <Label className="text-xs text-slate-500">Due Date</Label>
                  <Input
                    type="date"
                    value={item.due_date}
                    onChange={(e) =>
                      updatePlanningItem(index, "due_date", e.target.value)
                    }
                    disabled={readOnly}
                  />
                </div>

                <div className="md:col-span-12 space-y-1">
                  <Label className="text-xs text-slate-500">Notes</Label>
                  <Input
                    value={item.notes}
                    onChange={(e) =>
                      updatePlanningItem(index, "notes", e.target.value)
                    }
                    placeholder="Additional notes..."
                    disabled={readOnly}
                  />
                </div>
              </div>

              {!readOnly && (
                <Button
                  onClick={() => removePlanningItem(index)}
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}

          {planningItems.length === 0 && (
            <div className="text-sm text-slate-500 italic text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              No planning tasks added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
