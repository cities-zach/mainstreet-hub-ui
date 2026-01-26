import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { apiFetch } from "@/api";
import { cn } from "@/lib/utils";

export default function TaskForm({ onSuccess, onCancel, currentUser }) {
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    event_id: "",
    assigned_to_id: ""
  });

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
        assigned_to_id: ""
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    createMutation.mutate({
      ...formData,
      due_date: formData.due_date || null,
      event_id: formData.event_id || null,
      assigned_to_id: formData.assigned_to_id || null,
      assigned_by_id: currentUser?.id || null
    });
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
          <Label>Assign To</Label>
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Saving..." : "Save Task"}
        </Button>
      </div>
    </form>
  );
}
