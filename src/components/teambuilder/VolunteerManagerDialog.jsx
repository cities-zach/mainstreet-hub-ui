import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, ChevronsUpDown, ClipboardCheck, UserPlus, Mail, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/api";
import { cn } from "@/lib/utils";

export default function VolunteerManagerDialog({ job, open, onOpenChange, currentUser }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("invite");
  const [inviteData, setInviteData] = useState({ userId: "" });
  const [nonUserData, setNonUserData] = useState({ name: "", email: "", phone: "" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const acceptsAssignments = job?.can_accept_assignments === true;

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users/roster"),
    enabled: open
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["volunteer_assignments", job?.id],
    queryFn: () => apiFetch(`/volunteer/assignments?volunteer_job_id=${job?.id}`),
    enabled: open && !!job
  });

  const jobAssignments = assignments.filter(a => a.volunteer_job_id === job?.id);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const targetUser = users.find(u => u.id === inviteData.userId);
      if (!targetUser) throw new Error("User not found");

      return apiFetch("/volunteer/assignments", {
        method: "POST",
        body: JSON.stringify({
          volunteer_job_id: job.id,
          user_id: targetUser.id,
          name: targetUser.full_name || targetUser.email,
          email: targetUser.email,
          phone: targetUser.phone || "",
          status: "invited",
          invited_by_id: currentUser?.id || null,
          is_non_user: false
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_assignments"] });
      toast.success("Invitation sent!");
      onOpenChange(false);
      setInviteData({ userId: "" });
    },
    onError: (error) => toast.error(error?.message || "Failed to send invitation")
  });

  const addNonUserMutation = useMutation({
    mutationFn: async () => {
      return apiFetch("/volunteer/assignments", {
        method: "POST",
        body: JSON.stringify({
          volunteer_job_id: job.id,
          name: nonUserData.name,
          email: nonUserData.email,
          phone: nonUserData.phone,
          status: "accepted",
          invited_by_id: currentUser?.id || null,
          is_non_user: true
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      toast.success("Volunteer added successfully!");
      onOpenChange(false);
      setNonUserData({ name: "", email: "", phone: "" });
    },
    onError: (error) => toast.error(error?.message || "Failed to add volunteer")
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignment) => {
      return apiFetch(`/volunteer/assignments/${assignment.id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      toast.success("Volunteer removed");
    },
    onError: (error) => toast.error(error?.message || "Failed to remove volunteer")
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ assignmentId, attendance_status, hours_completed }) =>
      apiFetch(`/volunteer/assignments/${assignmentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          attendance_status,
          hours_completed:
            hours_completed === "" || hours_completed == null
              ? attendance_status === "attended"
                ? Number(job?.hours) || 0
                : 0
              : Number(hours_completed),
        }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      setAttendanceDrafts((current) => {
        const next = { ...current };
        delete next[variables.assignmentId];
        return next;
      });
      toast.success("Volunteer attendance saved");
    },
    onError: (error) => toast.error(error?.message || "Failed to save attendance")
  });

  const handleInvite = () => {
    if (!inviteData.userId) return toast.error("Please select a user");
    inviteMutation.mutate();
  };

  const handleAddNonUser = () => {
    if (!nonUserData.name || !nonUserData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    addNonUserMutation.mutate();
  };

  const handleRemove = (assignment) => {
    removeAssignmentMutation.mutate(assignment);
  };

  const updateAttendanceDraft = (assignment, field, value) => {
    setAttendanceDrafts((current) => ({
      ...current,
      [assignment.id]: {
        attendance_status: assignment.attendance_status || "pending",
        hours_completed: assignment.hours_completed ?? "",
        ...current[assignment.id],
        [field]: value,
      },
    }));
  };

  const saveAttendance = (assignment) => {
    const draft = attendanceDrafts[assignment.id] || {};
    updateAttendanceMutation.mutate({
      assignmentId: assignment.id,
      attendance_status: draft.attendance_status || "pending",
      hours_completed: draft.hours_completed,
    });
  };

  const canManageAssignments = job?.can_manage === true;

  const getUserLabel = (user) => {
    if (!user) return "Unknown user";
    const name = user.full_name?.trim();
    if (name) return `${name} (${user.email})`;
    return user.email || "Unnamed user";
  };

  const selectedUser = users.find((u) => u.id === inviteData.userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Volunteers</DialogTitle>
          <DialogDescription>
            {job?.title ? `${job.title}. ` : ""}
            Invite volunteers and record attendance without removing their history.
          </DialogDescription>
        </DialogHeader>

        {!acceptsAssignments && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Signups are closed for this opportunity. Existing volunteer attendance can still be recorded below.
          </div>
        )}

        <Tabs defaultValue="invite" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite User</TabsTrigger>
            <TabsTrigger value="manual">Add Non-User</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Popover open={inviteOpen} onOpenChange={setInviteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between overflow-hidden"
                    disabled={!acceptsAssignments}
                  >
                    <span className="truncate">
                      {inviteData.userId ? getUserLabel(selectedUser) : "Select a user…"}
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
                        {users.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.full_name || ""} ${u.email}`.trim()}
                            onSelect={() => {
                              setInviteData({ userId: u.id });
                              setInviteOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                inviteData.userId === u.id ? "opacity-100" : "opacity-0"
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
            <Button
              onClick={handleInvite}
              className="w-full bg-[#835879] hover:bg-[#6d4a64]"
              disabled={inviteMutation.isPending || !acceptsAssignments}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={nonUserData.name}
                onChange={(e) => setNonUserData({ ...nonUserData, name: e.target.value })}
                placeholder="John Doe"
                disabled={!acceptsAssignments}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={nonUserData.email}
                onChange={(e) => setNonUserData({ ...nonUserData, email: e.target.value })}
                placeholder="john@example.com"
                disabled={!acceptsAssignments}
              />
              <p className="text-xs text-slate-500">Confirmation email is disabled for now.</p>
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input
                value={nonUserData.phone}
                onChange={(e) => setNonUserData({ ...nonUserData, phone: e.target.value })}
                placeholder="555-0123"
                disabled={!acceptsAssignments}
              />
            </div>
            <Button
              onClick={handleAddNonUser}
              className="w-full bg-[#835879] hover:bg-[#6d4a64]"
              disabled={addNonUserMutation.isPending || !acceptsAssignments}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Volunteer
            </Button>
          </TabsContent>
        </Tabs>

        {jobAssignments.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <Label className="text-sm font-semibold mb-3 block">
              Current Volunteers ({jobAssignments.length})
            </Label>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {jobAssignments.map((assignment) => {
                const draft = attendanceDrafts[assignment.id] || {
                  attendance_status: assignment.attendance_status || "pending",
                  hours_completed: assignment.hours_completed ?? "",
                };
                const preservePastRecord =
                  job?.lifecycle_group === "past" && assignment.status === "accepted";
                return (
                  <div key={assignment.id} className="space-y-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className={`h-2 w-2 shrink-0 rounded-full ${assignment.status === "accepted" ? "bg-green-500" : "bg-amber-500"}`} />
                        <span className="truncate text-sm font-medium">{assignment.name}</span>
                        {assignment.is_non_user && (
                          <Badge variant="secondary" className="text-xs">Non-user</Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {assignment.status}
                        </Badge>
                      </div>
                      {(assignment.is_non_user || canManageAssignments) && !preservePastRecord && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleRemove(assignment)}
                          aria-label={`Remove ${assignment.name} from this opportunity`}
                          title={`Remove ${assignment.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {assignment.status === "accepted" && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_auto]">
                        <Select
                          value={draft.attendance_status}
                          onValueChange={(value) =>
                            updateAttendanceDraft(assignment, "attendance_status", value)
                          }
                        >
                          <SelectTrigger aria-label={`Attendance for ${assignment.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="attended">Attended</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="did_not_attend">Did not attend</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          step="0.25"
                          value={draft.hours_completed}
                          onChange={(event) =>
                            updateAttendanceDraft(assignment, "hours_completed", event.target.value)
                          }
                          aria-label={`Hours completed by ${assignment.name}`}
                          placeholder="Hours"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveAttendance(assignment)}
                          disabled={updateAttendanceMutation.isPending}
                        >
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
