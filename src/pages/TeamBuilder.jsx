import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Archive,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  History,
  Info,
  MapPin,
  Plus,
  Settings2,
  UserPlus,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiFetch } from "@/api";

import CreateOpportunityDialog from "@/components/teambuilder/CreateOpportunityDialog";
import VolunteerManagerDialog from "@/components/teambuilder/VolunteerManagerDialog";

const STATUS_STYLES = {
  open: "border-green-200 bg-green-50 text-green-800",
  filled: "border-blue-200 bg-blue-50 text-blue-800",
  closed: "border-slate-300 bg-slate-100 text-slate-700",
  ended: "border-slate-300 bg-slate-100 text-slate-700",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  archived: "border-purple-200 bg-purple-50 text-purple-800",
};

const STATUS_LABELS = {
  open: "Open",
  filled: "Filled",
  closed: "Closed",
  ended: "Ended",
  cancelled: "Cancelled",
  archived: "Archived",
};

function formatJobDate(value) {
  const isoDate = String(value || "").slice(0, 10);
  const parsed = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "Date TBD" : format(parsed, "MMM d, yyyy");
}

export default function TeamBuilder() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [managedJob, setManagedJob] = useState(null);
  const [volunteerJob, setVolunteerJob] = useState(null);

  useEffect(() => {
    apiFetch("/me")
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, []);

  const {
    data: jobs = [],
    isLoading: jobsLoading,
    isError: jobsError,
  } = useQuery({
    queryKey: ["volunteer_jobs", "all"],
    queryFn: () => apiFetch("/volunteer/jobs?scope=all"),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["volunteer_assignments", "self", user?.id],
    queryFn: () => apiFetch(`/volunteer/assignments?user_id=${user.id}`),
    enabled: Boolean(user?.id),
  });

  const getUserAssignment = (jobId) =>
    assignments.find(
      (assignment) =>
        assignment.volunteer_job_id === jobId && assignment.user_id === user?.id
    );

  const role = user?.app_role || user?.role;
  const isAdminOrChampion = ["admin", "super_admin", "event_champion"].includes(role);

  const counts = useMemo(
    () => ({
      upcoming: jobs.filter((job) => job.lifecycle_group === "upcoming").length,
      past: jobs.filter((job) => job.lifecycle_group === "past").length,
      archived: jobs.filter((job) => job.lifecycle_group === "archived").length,
    }),
    [jobs]
  );

  const visibleJobs = useMemo(() => {
    const multiplier = activeTab === "past" ? -1 : 1;
    return jobs
      .filter((job) => job.lifecycle_group === activeTab)
      .sort((first, second) =>
        String(first.date || "").localeCompare(String(second.date || "")) * multiplier
      );
  }, [activeTab, jobs]);

  const groupedJobs = useMemo(
    () =>
      visibleJobs.reduce((groups, job) => {
        const eventName = job.event_name || "General Opportunities";
        if (!groups.has(eventName)) groups.set(eventName, []);
        groups.get(eventName).push(job);
        return groups;
      }, new Map()),
    [visibleJobs]
  );

  const pendingInvites = assignments.filter((assignment) => {
    if (assignment.status !== "invited" || assignment.user_id !== user?.id) return false;
    const job = jobs.find((candidate) => candidate.id === assignment.volunteer_job_id);
    return job?.can_accept_assignments;
  });

  const signUpMutation = useMutation({
    mutationFn: async (job) => {
      if (!user) throw new Error("Missing user");
      await apiFetch("/volunteer/assignments", {
        method: "POST",
        body: JSON.stringify({
          volunteer_job_id: job.id,
          user_id: user.id,
          name: user.full_name || user.email || "Volunteer",
          email: user.email || null,
          phone: user.phone || user.phone_number || "",
          status: "accepted",
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      queryClient.invalidateQueries({ queryKey: ["volunteer_assignments"] });
      toast.success("You are signed up!");
    },
    onError: (error) => toast.error(error?.message || "Failed to sign up"),
  });

  const cancelMutation = useMutation({
    mutationFn: (assignment) =>
      apiFetch(`/volunteer/assignments/${assignment.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      queryClient.invalidateQueries({ queryKey: ["volunteer_assignments"] });
      toast.success("Volunteer commitment cancelled");
    },
    onError: (error) => toast.error(error?.message || "Failed to cancel"),
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (assignment) =>
      apiFetch(`/volunteer/assignments/${assignment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      queryClient.invalidateQueries({ queryKey: ["volunteer_assignments"] });
      toast.success("Invitation accepted!");
    },
    onError: (error) => toast.error(error?.message || "Failed to accept invitation"),
  });

  const emptyCopy = {
    upcoming: {
      title: "No upcoming volunteer opportunities",
      body: "Past opportunities are kept under Past so attendance and volunteer hours remain available.",
    },
    past: {
      title: "No past volunteer opportunities",
      body: "Completed and ended opportunities will appear here for attendance and historical reporting.",
    },
    archived: {
      title: "No archived volunteer opportunities",
      body: "Archiving clears an opportunity from active work without deleting its history.",
    },
  }[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 transition-colors duration-300 dark:from-slate-950 dark:to-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-bold text-[#2d4650] dark:text-slate-100">
              <Users className="h-10 w-10" />
              TeamBuilder
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Recruit, manage, and schedule volunteers.
            </p>
          </div>

          {isAdminOrChampion && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2 bg-[#835879] text-white"
            >
              <Plus className="h-5 w-5" />
              Create Opportunity
            </Button>
          )}
        </div>

        {pendingInvites.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Pending Invitations</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingInvites.map((invite) => {
                const job = jobs.find((candidate) => candidate.id === invite.volunteer_job_id);
                if (!job) return null;
                return (
                  <Alert key={invite.id} className="border-amber-200 bg-amber-50">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle>Invitation: {job.title}</AlertTitle>
                    <AlertDescription className="mt-2">
                      <p className="mb-2 text-sm">
                        {job.event_name || "General Opportunities"} · {formatJobDate(job.date)}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => acceptInviteMutation.mutate(invite)}
                        className="bg-amber-600 text-white"
                      >
                        Accept Invitation
                      </Button>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full max-w-2xl ${isAdminOrChampion ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="upcoming" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Upcoming ({counts.upcoming})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <History className="h-4 w-4" />
              Past ({counts.past})
            </TabsTrigger>
            {isAdminOrChampion && (
              <TabsTrigger value="archived" className="gap-2">
                <Archive className="h-4 w-4" />
                Archived ({counts.archived})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {jobsLoading ? (
          <div className="p-12 text-center">Loading opportunities…</div>
        ) : jobsError ? (
          <Alert variant="destructive">
            <AlertTitle>TeamBuilder could not load</AlertTitle>
            <AlertDescription>Refresh the page or try again in a moment.</AlertDescription>
          </Alert>
        ) : visibleJobs.length === 0 ? (
          <Card className="border-dashed bg-white/70">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <CalendarDays className="h-10 w-10 text-slate-400" />
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{emptyCopy.title}</h2>
                <p className="mt-1 max-w-xl text-sm text-slate-500">{emptyCopy.body}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {Array.from(groupedJobs.entries()).map(([group, groupJobs]) => (
              <section key={group} aria-labelledby={`group-${group.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <h2
                    id={`group-${group.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                    className="text-2xl font-bold"
                  >
                    {group}
                  </h2>
                  {groupJobs[0]?.event_id && (
                    <Badge variant="outline" className="text-xs">MasterPlanner</Badge>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {groupJobs.map((job) => {
                    const filledCount = Number(job.count_filled) || 0;
                    const neededCount = Number(job.count_needed) || 0;
                    const remainingCount = Math.max(neededCount - filledCount, 0);
                    const userAssignment = getUserAssignment(job.id);
                    const isSignedUp = userAssignment?.status === "accepted";
                    const isInvited = userAssignment?.status === "invited";
                    const effectiveStatus = job.effective_status || job.status || "open";
                    const canAccept = job.can_accept_assignments === true;

                    return (
                      <Card key={job.id} className="flex flex-col">
                        <CardHeader>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={STATUS_STYLES[effectiveStatus]}>
                              {STATUS_LABELS[effectiveStatus] || effectiveStatus}
                            </Badge>
                            {job.pending_attendance_count > 0 && (
                              <Badge className="border-amber-200 bg-amber-100 text-amber-900">
                                <ClipboardCheck className="mr-1 h-3 w-3" />
                                {job.pending_attendance_count} attendance pending
                              </Badge>
                            )}
                          </div>
                          <CardTitle>{job.title}</CardTitle>
                          <CardDescription>
                            <Calendar className="mr-1 inline h-3 w-3" />
                            {formatJobDate(job.date)}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-2">
                          <div className="text-sm">
                            <Clock className="mr-1 inline h-4 w-4" />
                            {job.schedule || "TBD"}
                          </div>
                          {neededCount > 0 && (
                            <div className="text-sm">
                              <Users className="mr-1 inline h-4 w-4" />
                              {filledCount === 0
                                ? `${neededCount} slots available`
                                : `${remainingCount}/${neededCount} slots available`}
                            </div>
                          )}
                          <div className="text-sm">
                            <MapPin className="mr-1 inline h-4 w-4" />
                            {job.location || "TBD"}
                          </div>
                        </CardContent>

                        <CardFooter className="flex flex-wrap gap-2">
                          {isSignedUp ? (
                            <>
                              <Button disabled className="min-w-0 flex-1">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {job.lifecycle_group === "past" ? "Commitment recorded" : "Signed Up"}
                              </Button>
                              {job.lifecycle_group === "upcoming" && (
                                <Button
                                  variant="outline"
                                  onClick={() => cancelMutation.mutate(userAssignment)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </>
                          ) : isInvited && canAccept ? (
                            <Button
                              className="flex-1"
                              onClick={() => acceptInviteMutation.mutate(userAssignment)}
                            >
                              Accept Invite
                            </Button>
                          ) : (
                            <Button
                              className="min-w-0 flex-1 bg-[#835879] text-white"
                              disabled={!canAccept}
                              onClick={() => signUpMutation.mutate(job)}
                            >
                              {canAccept ? "Sign Up" : STATUS_LABELS[effectiveStatus] || "Unavailable"}
                            </Button>
                          )}

                          {job.can_manage && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setVolunteerJob(job)}
                                aria-label={`Manage volunteers for ${job.title}`}
                                title="Manage volunteers"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setManagedJob(job)}
                                aria-label={`Manage opportunity ${job.title}`}
                                title="Manage opportunity"
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {createDialogOpen && (
          <CreateOpportunityDialog
            open
            onOpenChange={setCreateDialogOpen}
          />
        )}

        {managedJob && (
          <CreateOpportunityDialog
            job={managedJob}
            open={Boolean(managedJob)}
            onOpenChange={(open) => !open && setManagedJob(null)}
          />
        )}

        {volunteerJob && (
          <VolunteerManagerDialog
            job={volunteerJob}
            open={Boolean(volunteerJob)}
            onOpenChange={(open) => !open && setVolunteerJob(null)}
            currentUser={user}
          />
        )}
      </div>
    </div>
  );
}
