import React, { useState } from "react";
import { CheckCircle, Circle } from "lucide-react";
import { apiFetch } from "@/api";
import { toast } from "sonner";

export default function TaskItem({ task, currentUser, onUpdate, onLevelUp }) {
  if (!task) return null;

  const completed = task.status === "completed";
  const [isProcessing, setIsProcessing] = useState(false);

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
        toast.success("Task completed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update task");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition">
      <div className="flex items-center gap-3">
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

        <div>
          <p
            className={`font-medium ${
              completed ? "line-through text-slate-400" : "text-slate-800"
            }`}
          >
            {task.title || "Untitled Task"}
          </p>
          {task.due_date && (
            <p className="text-xs text-slate-500">
              Due: {task.due_date}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
