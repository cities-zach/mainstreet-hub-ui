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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserPlus, Mail, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/api";

export default function VolunteerManagerDialog({ job, open, onOpenChange, currentUser }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("invite");
  const [inviteData, setInviteData] = useState({ userId: "" });
  const [nonUserData, setNonUserData] = useState({ name: "", email: "", phone: "" });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users"),
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
    onError: () => toast.error("Failed to send invitation")
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
    onError: () => toast.error("Failed to add volunteer")
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
    onError: () => toast.error("Failed to remove volunteer")
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

  const isAdmin =
    currentUser?.app_role === "admin" ||
    currentUser?.app_role === "super_admin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "super_admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Volunteers</DialogTitle>
          <DialogDescription>
            Invite a registered user or add a non-user volunteer.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite User</TabsTrigger>
            <TabsTrigger value="manual">Add Non-User</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={inviteData.userId} onValueChange={(val) => setInviteData({ userId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Search users..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleInvite}
              className="w-full bg-[#835879] hover:bg-[#6d4a64]"
              disabled={inviteMutation.isPending}
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
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={nonUserData.email}
                onChange={(e) => setNonUserData({ ...nonUserData, email: e.target.value })}
                placeholder="john@example.com"
              />
              <p className="text-xs text-slate-500">Confirmation email is disabled for now.</p>
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input
                value={nonUserData.phone}
                onChange={(e) => setNonUserData({ ...nonUserData, phone: e.target.value })}
                placeholder="555-0123"
              />
            </div>
            <Button
              onClick={handleAddNonUser}
              className="w-full bg-[#835879] hover:bg-[#6d4a64]"
              disabled={addNonUserMutation.isPending}
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
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {jobAssignments.map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${assignment.status === "accepted" ? "bg-green-500" : "bg-amber-500"}`} />
                    <span className="text-sm font-medium">{assignment.name}</span>
                    {assignment.is_non_user && (
                      <Badge variant="secondary" className="text-xs">Non-user</Badge>
                    )}
                  </div>
                  {(assignment.is_non_user || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemove(assignment)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
