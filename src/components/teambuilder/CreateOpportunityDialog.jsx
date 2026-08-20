import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  LockKeyhole,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api";

const EMPTY_FORM = {
  title: "",
  date: "",
  schedule: "",
  location: "",
  hours: 1,
  count_needed: 1,
  instructions: "",
  special_skills: "",
  training_required: false,
};

function formFromJob(job) {
  if (!job) return { ...EMPTY_FORM };
  return {
    title: job.title || "",
    date: job.date ? String(job.date).slice(0, 10) : "",
    schedule: job.schedule || "",
    location: job.location || "",
    hours: Number(job.hours) || 0,
    count_needed: Number(job.count_needed) || 1,
    instructions: job.instructions || "",
    special_skills: job.special_skills || "",
    training_required: Boolean(job.training_required),
  };
}

export default function CreateOpportunityDialog({ open, onOpenChange, job = null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(() => formFromJob(job));
  const [deleteArmed, setDeleteArmed] = useState(false);
  const isEditing = Boolean(job);
  const isEventLinked = Boolean(job?.event_id);
  const isArchived = job?.lifecycle_group === "archived";
  const isPast = job?.lifecycle_group === "past";

  const refreshJobs = () =>
    queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      apiFetch(isEditing ? `/volunteer/jobs/${job.id}` : "/volunteer/jobs", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(
          isEditing
            ? data
            : {
                ...data,
                event_name: "General Opportunities",
                status: "open",
              }
        ),
      }),
    onSuccess: () => {
      refreshJobs();
      toast.success(isEditing ? "Volunteer opportunity updated" : "Volunteer opportunity created");
      onOpenChange(false);
      if (!isEditing) setFormData({ ...EMPTY_FORM });
    },
    onError: (error) => toast.error(error?.message || "Failed to save opportunity"),
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ path, method = "POST", body }) =>
      apiFetch(path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    onSuccess: (_data, variables) => {
      refreshJobs();
      queryClient.invalidateQueries({ queryKey: ["volunteer_assignments"] });
      toast.success(variables.successMessage);
      onOpenChange(false);
    },
    onError: (error) => toast.error(error?.message || "Failed to update opportunity"),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.title.trim() || !formData.date || !formData.count_needed) {
      toast.error("Please fill in the required fields");
      return;
    }
    saveMutation.mutate(formData);
  };

  const runStatusAction = (status, successMessage) =>
    lifecycleMutation.mutate({
      path: `/volunteer/jobs/${job.id}`,
      method: "PATCH",
      body: { status },
      successMessage,
    });

  const runArchiveAction = (action, successMessage) =>
    lifecycleMutation.mutate({
      path: `/volunteer/jobs/${job.id}/${action}`,
      successMessage,
    });

  const deleteOpportunity = () =>
    lifecycleMutation.mutate({
      path: `/volunteer/jobs/${job.id}`,
      method: "DELETE",
      successMessage: "Volunteer opportunity deleted",
    });

  const storedStatus = job?.status || "open";
  const canReopen = !isPast && ["closed", "cancelled"].includes(storedStatus);
  const canClose = !isPast && ["open", "filled"].includes(storedStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Manage Volunteer Opportunity" : "Create Volunteer Opportunity"}
          </DialogTitle>
          <DialogDescription>
            {isEventLinked
              ? "This opportunity is linked to a MasterPlanner event."
              : isEditing
                ? "Edit the opportunity or manage its lifecycle."
                : "Add a volunteer task not associated with a specific event plan."}
          </DialogDescription>
        </DialogHeader>

        {isEditing && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-3">
            <Badge variant="outline" className="capitalize">
              {job.effective_status || storedStatus}
            </Badge>
            <span className="text-sm text-slate-600">
              {isEventLinked ? `From ${job.event_name || "MasterPlanner"}` : "Standalone opportunity"}
            </span>
          </div>
        )}

        {isEventLinked && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex items-start gap-2">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-2">
                <p>
                  Edit dates, staffing, and instructions in MasterPlanner so both modules stay synchronized.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/event-plan?id=${job.event_id}`}>
                    Edit in MasterPlanner
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="volunteer-title">Task Title *</Label>
            <Input
              id="volunteer-title"
              value={formData.title}
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              placeholder="e.g., Office Admin Support"
              disabled={isEventLinked}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="volunteer-date">Date *</Label>
              <Input
                id="volunteer-date"
                type="date"
                value={formData.date}
                onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                disabled={isEventLinked}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="volunteer-schedule">Time/Schedule</Label>
              <Input
                id="volunteer-schedule"
                value={formData.schedule}
                onChange={(event) => setFormData({ ...formData, schedule: event.target.value })}
                placeholder="e.g., 9 AM - 12 PM"
                disabled={isEventLinked}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="volunteer-location">Location</Label>
              <Input
                id="volunteer-location"
                value={formData.location}
                onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                placeholder="e.g., Main Office"
                disabled={isEventLinked}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="volunteer-count">Volunteers Needed *</Label>
              <Input
                id="volunteer-count"
                type="number"
                min="1"
                value={formData.count_needed}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    count_needed: parseInt(event.target.value || "1", 10),
                  })
                }
                disabled={isEventLinked}
              />
            </div>
          </div>
          <div className="grid max-w-[240px] gap-2">
            <Label htmlFor="volunteer-hours">Hours</Label>
            <Input
              id="volunteer-hours"
              type="number"
              min="0"
              step="0.25"
              value={formData.hours}
              onChange={(event) =>
                setFormData({ ...formData, hours: Number(event.target.value || 0) })
              }
              disabled={isEventLinked}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="volunteer-instructions">Instructions</Label>
            <Textarea
              id="volunteer-instructions"
              value={formData.instructions}
              onChange={(event) => setFormData({ ...formData, instructions: event.target.value })}
              placeholder="What should the volunteer know?"
              disabled={isEventLinked}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="volunteer-skills">Special Skills (Optional)</Label>
            <Input
              id="volunteer-skills"
              value={formData.special_skills}
              onChange={(event) => setFormData({ ...formData, special_skills: event.target.value })}
              placeholder="e.g., Heavy lifting, Computer skills"
              disabled={isEventLinked}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="volunteer-training"
              checked={formData.training_required}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, training_required: checked })
              }
              disabled={isEventLinked}
            />
            <Label htmlFor="volunteer-training">Training Required?</Label>
          </div>

          {!isEventLinked && (
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#835879] text-white hover:bg-[#6d4a64]"
                disabled={saveMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "Save Changes" : "Create Opportunity"}
              </Button>
            </DialogFooter>
          )}
        </form>

        {isEditing && (
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-semibold">Opportunity lifecycle</Label>
            <div className="flex flex-wrap gap-2">
              {isArchived ? (
                <Button
                  variant="outline"
                  onClick={() => runArchiveAction("restore", "Volunteer opportunity restored")}
                  disabled={lifecycleMutation.isPending}
                >
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Restore
                </Button>
              ) : (
                <>
                  {canClose && (
                    <Button
                      variant="outline"
                      onClick={() => runStatusAction("closed", "Volunteer signups closed")}
                      disabled={lifecycleMutation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Close signups
                    </Button>
                  )}
                  {canReopen && (
                    <Button
                      variant="outline"
                      onClick={() => runStatusAction("open", "Volunteer signups reopened")}
                      disabled={lifecycleMutation.isPending}
                    >
                      Reopen signups
                    </Button>
                  )}
                  {storedStatus !== "cancelled" && !isPast && (
                    <Button
                      variant="outline"
                      onClick={() => runStatusAction("cancelled", "Volunteer opportunity cancelled")}
                      disabled={lifecycleMutation.isPending}
                    >
                      Cancel opportunity
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => runArchiveAction("archive", "Volunteer opportunity archived")}
                    disabled={lifecycleMutation.isPending}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                </>
              )}
            </div>

            {!job.can_delete && !isEventLinked && (
              <p className="text-xs text-slate-500">
                This opportunity has volunteer history, so it can be archived but not permanently deleted.
              </p>
            )}

            {job.can_delete && !isArchived && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                {deleteArmed ? (
                  <div className="space-y-3">
                    <p className="text-sm text-red-800">
                      Permanently delete this empty standalone opportunity?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={deleteOpportunity}
                        disabled={lifecycleMutation.isPending}
                      >
                        Confirm delete
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteArmed(false)}>
                        Keep opportunity
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-red-700 hover:bg-red-100 hover:text-red-800"
                    onClick={() => setDeleteArmed(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete empty opportunity
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
