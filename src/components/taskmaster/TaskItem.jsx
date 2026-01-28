import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Circle, ListChecks, Trash2 } from "lucide-react";
import { differenceInCalendarDays, endOfDay, format, isBefore, parseISO } from "date-fns";
import { apiFetch } from "@/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function TaskItem({
  task,
  currentUser,
  onUpdate,
  onLevelUp,
  taskCompletionSoundUrl = "",
}) {
  if (!task) return null;

  const completed = task.status === "completed";
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [steps, setSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const dueDate = useMemo(
    () => (task.due_date ? parseISO(task.due_date) : null),
    [task.due_date]
  );
  const isOverdue = !!dueDate && !completed && isBefore(endOfDay(dueDate), new Date());
  const daysUntilDue =
    dueDate && !completed ? differenceInCalendarDays(dueDate, new Date()) : null;
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
  const borderClass = isOverdue
    ? "border-red-400"
    : isDueSoon
      ? "border-yellow-400"
      : "border-slate-200";

  const assignedToLabel =
    task.assigned_to_name || task.assigned_to_email || "Unassigned";
  const updatedAt = task.updated_at ? parseISO(task.updated_at) : null;
  const stepTotal = Number(task.step_count || 0);
  const stepCompleted = Number(task.step_completed_count || 0);

  useEffect(() => {
    if (!stepsOpen) return;
    let active = true;
    const loadSteps = async () => {
      setStepsLoading(true);
      try {
        const data = await apiFetch(`/tasks/${task.id}/steps`);
        if (active) setSteps(data || []);
      } catch (err) {
        toast.error(err.message || "Failed to load steps");
      } finally {
        if (active) setStepsLoading(false);
      }
    };
    loadSteps();
    return () => {
      active = false;
    };
  }, [stepsOpen, task.id]);

  const handleAddStep = async (event) => {
    event.preventDefault();
    const title = newStepTitle.trim();
    if (!title) return;
    try {
      const created = await apiFetch(`/tasks/${task.id}/steps`, {
        method: "POST",
        body: JSON.stringify({ title })
      });
      setSteps((prev) => [...prev, created]);
      setNewStepTitle("");
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || "Failed to add step");
    }
  };

  const handleToggleStep = async (step) => {
    const nextStatus = step.status === "completed" ? "open" : "completed";
    try {
      const updated = await apiFetch(`/tasks/${task.id}/steps/${step.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      setSteps((prev) =>
        prev.map((item) => (item.id === step.id ? updated : item))
      );
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || "Failed to update step");
    }
  };

  const handleDeleteStep = async (step) => {
    try {
      await apiFetch(`/tasks/${task.id}/steps/${step.id}`, {
        method: "DELETE"
      });
      setSteps((prev) => prev.filter((item) => item.id !== step.id));
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || "Failed to delete step");
    }
  };

  const handleToggle = async () => {
    if (!currentUser) return;
    const nextStatus = completed ? "open" : "completed";
    setIsProcessing(true);
    try {
      await apiFetch(`/tasks/${task.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      onUpdate?.();
      if (nextStatus === "completed") {
        if (taskCompletionSoundUrl) {
          new Audio(taskCompletionSoundUrl).play().catch(() => {});
        }
        toast.success("Task completed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update task");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className={`flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition ${borderClass}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={handleToggle}
            className="text-slate-400 hover:text-green-600"
            title={completed ? "Mark incomplete" : "Mark complete"}
            disabled={isProcessing}
          >
            {completed ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          <div className="space-y-1">
            <p
              className={`font-medium ${
                completed ? "line-through text-slate-400" : "text-slate-800"
              }`}
            >
              {task.title || "Untitled Task"}
            </p>
            <p className="text-xs text-slate-500">Assigned to: {assignedToLabel}</p>
            <p className="text-xs text-slate-500">
              Steps: {stepCompleted}/{stepTotal} complete
            </p>
            {dueDate && (
              <p className="text-xs text-slate-500">
                Due: {format(dueDate, "MMM d, yyyy")}
              </p>
            )}
            {updatedAt && (
              <p className="text-xs text-slate-400">
                Updated: {format(updatedAt, "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => setStepsOpen(true)}
        >
          <ListChecks className="w-4 h-4" />
          Steps
        </Button>
      </div>

      <Dialog open={stepsOpen} onOpenChange={setStepsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Task steps</DialogTitle>
            <DialogDescription>
              Track progress on parts of this task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {stepsLoading ? (
              <div className="text-sm text-slate-500">Loading steps...</div>
            ) : steps.length === 0 ? (
              <div className="text-sm text-slate-500">
                No steps yet. Add the first step below.
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2"
                  >
                    <label className="flex items-center gap-3 text-sm text-slate-700">
                      <Checkbox
                        checked={step.status === "completed"}
                        onCheckedChange={() => handleToggleStep(step)}
                      />
                      <span
                        className={step.status === "completed" ? "line-through text-slate-400" : ""}
                      >
                        {step.title}
                      </span>
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteStep(step)}
                    >
                      <Trash2 className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddStep} className="flex gap-2">
              <Input
                value={newStepTitle}
                onChange={(event) => setNewStepTitle(event.target.value)}
                placeholder="Add a step..."
              />
              <Button type="submit">Add</Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
