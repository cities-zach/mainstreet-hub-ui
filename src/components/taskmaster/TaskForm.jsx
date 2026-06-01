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
import { Check, ChevronsUpDown, Plus, Trash2, Search, X } from "lucide-react";
import { apiFetch } from "@/api";
import { cn } from "@/lib/utils";

const CRM_LINK_TYPES = [
  { id: "contact", label: "Person", path: "/crm/contacts" },
  { id: "entity", label: "Business", path: "/crm/entities" },
  { id: "place", label: "Place", path: "/crm/places" },
];

function crmRecordLabel(record) {
  return record.display_name || record.name || record.place_name || record.line1 || "Unnamed record";
}

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
  const [crmType, setCrmType] = useState("contact");
  const [crmQuery, setCrmQuery] = useState("");
  const [crmLink, setCrmLink] = useState(null);

  const crmSearchPath = CRM_LINK_TYPES.find((t) => t.id === crmType)?.path || "/crm/contacts";
  const { data: crmResults = [] } = useQuery({
    queryKey: ["task-crm-picker", crmType, crmQuery],
    queryFn: () => apiFetch(`${crmSearchPath}?query=${encodeURIComponent(crmQuery)}`),
    enabled: crmQuery.trim().length > 1,
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
        assigned_to_id: "",
        is_private: false
      });
      setSteps([]);
      setNewStepTitle("");
      setCrmLink(null);
      setCrmQuery("");
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
      is_private: !!formData.is_private,
      crm_contact_id: crmLink?.type === "contact" ? crmLink.id : undefined,
      crm_entity_id: crmLink?.type === "entity" ? crmLink.id : undefined,
      crm_place_id: crmLink?.type === "place" ? crmLink.id : undefined,
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
            <PopoverContent className="w-full p-0 max-h-[60vh] overflow-hidden">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandList className="max-h-[240px] overflow-y-auto">
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
      <div className="space-y-2">
        <Label>Link a CRM record (optional)</Label>
        {isEdit && Array.isArray(task?.crm_links) && task.crm_links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {task.crm_links.map((link) => (
              <span key={link.id} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {link.contact_name || link.entity_name || link.place_name || "Linked record"}
              </span>
            ))}
          </div>
        )}
        {crmLink ? (
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="font-medium">{crmLink.label}</span>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCrmLink(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2 rounded-md border p-2">
            <div className="flex gap-2">
              {CRM_LINK_TYPES.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  size="sm"
                  variant={crmType === t.id ? "default" : "outline"}
                  onClick={() => {
                    setCrmType(t.id);
                    setCrmQuery("");
                  }}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder={`Search ${CRM_LINK_TYPES.find((t) => t.id === crmType)?.label.toLowerCase()}…`}
                value={crmQuery}
                onChange={(e) => setCrmQuery(e.target.value)}
              />
            </div>
            {crmQuery.trim().length > 1 && (
              <div className="max-h-40 overflow-auto rounded-md border divide-y">
                {crmResults.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    className="w-full text-left p-2 text-sm hover:bg-slate-50"
                    onClick={() => {
                      setCrmLink({ type: crmType, id: record.id, label: crmRecordLabel(record) });
                      setCrmQuery("");
                    }}
                  >
                    {crmRecordLabel(record)}
                  </button>
                ))}
                {crmResults.length === 0 && <p className="p-2 text-xs text-slate-500">No matches.</p>}
              </div>
            )}
          </div>
        )}
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
