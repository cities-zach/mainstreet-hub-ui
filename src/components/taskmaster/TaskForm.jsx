import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/api";
import { cn } from "@/lib/utils";

export default function TaskForm({ onSuccess, onCancel, currentUser, task = null }) {
  const queryClient = useQueryClient();
  const isEdit = !!task;
  const [assignOpen, setAssignOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    due_date: task?.due_date || "",
    event_id: task?.event_id || "",
    assigned_to_id: task?.assigned_to_id || "",
    is_private: task?.is_private || false
  });
  const [newStepTitle, setNewStepTitle] = useState("");
  const [steps, setSteps] = useState([]);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users")
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch("/events")
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onSuccess?.();
      setFormData({
        title: "",
        description: "",
        due_date: "",
        event_id: "",
        assigned_to_id: "",
        is_private: false
      });
      setSteps([]);
      setNewStepTitle("");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) =>
      apiFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onSuccess?.();
    }
  });

  const trimmedSteps = useMemo(
    () => steps.map((step) => step.title.trim()).filter(Boolean),
    [steps]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    const payload = {
      ...formData,
      due_date: formData.due_date || null,
      event_id: formData.event_id || null,
      assigned_to_id: formData.assigned_to_id || null,
      assigned_by_id: currentUser?.id || null,
      is_private: !!formData.is_private
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate({
        ...payload,
        steps: trimmedSteps
      });
    }
  };

  const getUserLabel = (user) => {
    if (!user) return "Unknown user";
    const name = user.full_name?.trim();
    if (name) return `${name} (${user.email})`;
    return user.email || "Unnamed user";
  };

  const selectedUser = users.find((u) => u.id === formData.assigned_to_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Assign To</Label>
            {isEdit && currentUser?.id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFormData({ ...formData, assigned_to_id: currentUser.id })
                }
              >
                Assign to me
              </Button>
            )}
          </div>
          <Popover open={assignOpen} onOpenChange={setAssignOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between overflow-hidden"
              >
                <span className="truncate">
                  {formData.assigned_to_id
                    ? getUserLabel(selectedUser)
                    : "Unassigned"}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="unassigned"
                      onSelect={() => {
                        setFormData({ ...formData, assigned_to_id: "" });
                        setAssignOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !formData.assigned_to_id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Unassigned
                    </CommandItem>
                    {users.map((u) => (
                      <CommandItem
                        key={u.id}
                        value={`${u.full_name || ""} ${u.email}`.trim()}
                        onSelect={() => {
                          setFormData({ ...formData, assigned_to_id: u.id });
                          setAssignOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.assigned_to_id === u.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {getUserLabel(u)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Event</Label>
        <select
          className="w-full border rounded px-2 py-2 text-sm"
          value={formData.event_id}
          onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
        >
          <option value="">No event</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>
      {!isEdit && (
        <div className="space-y-2">
          <Label>Steps</Label>
          {steps.length > 0 && (
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-2">
                  <Input
                    value={step.title}
                    onChange={(event) => {
                      const next = [...steps];
                      next[index] = { ...next[index], title: event.target.value };
                      setSteps(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setSteps((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newStepTitle}
              onChange={(event) => setNewStepTitle(event.target.value)}
              placeholder="Add a step..."
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const title = newStepTitle.trim();
                if (!title) return;
                setSteps((prev) => [
                  ...prev,
                  { id: `${Date.now()}-${prev.length}`, title }
                ]);
                setNewStepTitle("");
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <Checkbox
          checked={formData.is_private}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, is_private: Boolean(checked) })
          }
        />
        <div>
          <p className="font-medium">Private task</p>
          <p className="text-xs text-slate-500">
            Only the assigner and assignee can view private tasks.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Task"}
        </Button>
      </div>
    </form>
  );
}
