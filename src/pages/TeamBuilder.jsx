import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Plus,
  Users,
  Calendar,
  MapPin,
  Clock,
  Info,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { apiFetch } from "@/api";

import CreateOpportunityDialog from "@/components/teambuilder/CreateOpportunityDialog";
import VolunteerManagerDialog from "@/components/teambuilder/VolunteerManagerDialog";

/**
 * Props expected:
 * - currentUser
 * - isAdmin
 * - isEventChampion
 */
export default function TeamBuilder() {
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    apiFetch("/me")
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, []);

  /**
   * DATA
   */
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["volunteer_jobs"],
    queryFn: () => apiFetch("/volunteer/jobs"),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch("/events"),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["volunteer_assignments"],
    queryFn: () => apiFetch("/volunteer/assignments"),
  });

  /**
   * HELPERS
   */
  const getAssignmentsForJob = (jobId) =>
    assignments.filter((a) => a.volunteer_job_id === jobId);

  const getUserAssignment = (jobId) =>
    assignments.find(
      (a) =>
        a.volunteer_job_id === jobId &&
        a.user_id === user?.id
    );

  /**
   * GROUP JOBS BY EVENT
   */
  const groupedJobs = jobs.reduce((acc, job) => {
    let eventName = job.event_name;

    if (!eventName && job.event_id) {
      const evt = events.find((e) => e.id === job.event_id);
      if (evt) eventName = evt.title || evt.name;
    }

    eventName = eventName || "General Opportunities";
    if (!acc[eventName]) acc[eventName] = [];
    acc[eventName].push(job);
    return acc;
  }, {});

  const sortedGroups = Object.keys(groupedJobs).sort((a, b) => {
    if (a === "General Opportunities") return 1;
    if (b === "General Opportunities") return -1;
    return a.localeCompare(b);
  });

  /**
   * MUTATIONS
   */
  const signUpMutation = useMutation({
    mutationFn: async (job) => {
      if (!user) throw new Error("Missing user");
      const name = user.full_name || user.email || "Volunteer";
      await apiFetch("/volunteer/assignments", {
        method: "POST",
        body: JSON.stringify({
          volunteer_job_id: job.id,
          user_id: user.id,
          name,
          email: user.email || null,
          phone: user.phone || user.phone_number || "",
          status: "accepted",
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      queryClient.invalidateQueries({
        queryKey: ["volunteer_assignments"],
      });
      toast.success("You are signed up!");
    },
    onError: () => toast.error("Failed to sign up"),
  });

  const cancelMutation = useMutation({
    mutationFn: async (assignment) => {
      await apiFetch(`/volunteer/assignments/${assignment.id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      queryClient.invalidateQueries({
        queryKey: ["volunteer_assignments"],
      });
      toast.success("Volunteer commitment cancelled");
    },
    onError: () => toast.error("Failed to cancel"),
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (assignment) => {
      await apiFetch(`/volunteer/assignments/${assignment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer_jobs"] });
      queryClient.invalidateQueries({
        queryKey: ["volunteer_assignments"],
      });
      toast.success("Invitation accepted!");
    },
  });

  const isAdminOrChampion =
    user?.app_role === "admin" ||
    user?.app_role === "super_admin" ||
    user?.app_role === "event_champion" ||
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "event_champion";

  /**
   * RENDER
   */
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 text-[#2d4650] dark:text-slate-100">
              <Users className="w-10 h-10" />
              TeamBuilder
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Recruit, manage, and schedule volunteers.
            </p>
          </div>

          {isAdminOrChampion && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-[#835879] text-white gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Opportunity
            </Button>
          )}
        </div>

        {/* Pending Invites */}
        {user &&
          assignments.some(
            (a) =>
              a.user_id === user.id &&
              a.status === "invited"
          ) && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Pending Invitations
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments
                  .filter(
                    (a) =>
                      a.user_id === user.id &&
                      a.status === "invited"
                  )
                  .map((invite) => {
                    const job = jobs.find(
                      (j) => j.id === invite.volunteer_job_id
                    );
                    if (!job) return null;

                    return (
                      <Alert
                        key={invite.id}
                        className="bg-amber-50 border-amber-200"
                      >
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertTitle>
                          Invitation: {job.title}
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                          <p className="text-sm mb-2">
                            {job.event_name} •{" "}
                            {format(new Date(job.date), "MMM d")}
                          </p>
                          <Button
                            size="sm"
                            onClick={() =>
                              acceptInviteMutation.mutate(invite)
                            }
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

        {/* Job Listings */}
        {jobsLoading ? (
          <div className="text-center p-12">
            Loading opportunities…
          </div>
        ) : (
          <div className="space-y-10">
            {sortedGroups.map((group) => (
              <div key={group}>
                <h2 className="text-2xl font-bold mb-4">
                  {group}
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedJobs[group].map((job) => {
                    const assignmentsForJob = getAssignmentsForJob(job.id);
                    const acceptedCount = assignmentsForJob.filter(
                      (assignment) => assignment.status === "accepted"
                    ).length;
                    const filledCount =
                      Number.isFinite(Number(job.count_filled)) &&
                      Number(job.count_filled) >= 0
                        ? Number(job.count_filled)
                        : acceptedCount;
                    const neededCount = Number(job.count_needed) || 0;
                    const remainingCount = Math.max(neededCount - filledCount, 0);
                    const userAssignment =
                      getUserAssignment(job.id);
                    const isSignedUp =
                      userAssignment?.status === "accepted";
                    const isInvited =
                      userAssignment?.status === "invited";
                    const isFull =
                      neededCount > 0
                        ? filledCount >= neededCount
                        : job.count_filled >= job.count_needed;

                    return (
                      <Card key={job.id} className="flex flex-col">
                        <CardHeader>
                          <Badge>
                            {isFull ? "Filled" : "Open"}
                          </Badge>
                          <CardTitle>{job.title}</CardTitle>
                          <CardDescription>
                            <Calendar className="inline w-3 h-3 mr-1" />
                            {format(
                              new Date(job.date),
                              "MMM d, yyyy"
                            )}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-2">
                          <div className="text-sm">
                            <Clock className="inline w-4 h-4 mr-1" />
                            {job.schedule || "TBD"}
                          </div>
                          {neededCount > 0 && (
                            <div className="text-sm">
                              <Users className="inline w-4 h-4 mr-1" />
                              {filledCount === 0
                                ? `${neededCount} slots available`
                                : `${remainingCount}/${neededCount} slots available`}
                            </div>
                          )}
                          <div className="text-sm">
                            <MapPin className="inline w-4 h-4 mr-1" />
                            {job.location || "TBD"}
                          </div>
                        </CardContent>

                        <CardFooter className="flex gap-2">
                          {isSignedUp ? (
                            <>
                              <Button
                                disabled
                                className="flex-1"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Signed Up
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  cancelMutation.mutate(
                                    userAssignment
                                  )
                                }
                              >
                                Cancel
                              </Button>
                            </>
                          ) : isInvited ? (
                            <Button
                              className="w-full"
                              onClick={() =>
                                acceptInviteMutation.mutate(
                                  userAssignment
                                )
                              }
                            >
                              Accept Invite
                            </Button>
                          ) : (
                            <Button
                              className="flex-1 bg-[#835879] text-white"
                              disabled={isFull}
                              onClick={() =>
                                signUpMutation.mutate(job)
                              }
                            >
                              {isFull ? "Full" : "Sign Up"}
                            </Button>
                          )}

                          {isAdminOrChampion && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedJob(job);
                                setManageDialogOpen(true);
                              }}
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateOpportunityDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {selectedJob && (
          <VolunteerManagerDialog
            job={selectedJob}
            open={manageDialogOpen}
            onOpenChange={setManageDialogOpen}
            currentUser={user}
          />
        )}
      </div>
    </div>
  );
}
