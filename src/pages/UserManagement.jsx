import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle,
  XCircle,
  User as UserIcon,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

/* ---------------- API HELPERS ---------------- */

const fetchMe = async () => {
  const res = await apiFetch("/me");
  return res.user;
};

const fetchUsers = async () => {
  return apiFetch("/users");
};

const updateUser = async ({ id, data }) => {
  return apiFetch(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
};

const fetchInvites = async () => {
  return apiFetch("/invites");
};

const createInvite = async (data) => {
  return apiFetch("/invites", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/* ---------------- COMPONENT ---------------- */

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("volunteer");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["invites"],
    queryFn: fetchInvites,
  });

  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      setInviteEmail("");
      setInviteRole("volunteer");
      toast.success("Invite sent");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to send invite");
    },
  });

  const handleRoleChange = (userId, newRole) => {
    updateUserMutation.mutate({
      id: userId,
      data: { role: newRole },
    });
  };

  const handleStatusChange = (userId, newStatus) => {
    updateUserMutation.mutate({
      id: userId,
      data: { account_status: newStatus },
    });
  };

  const handleInviteSubmit = (event) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  if (isLoading) return <div className="p-8">Loading users…</div>;

  /* Frontend gate (backend MUST enforce too) */
  if (currentUser?.role !== "super_admin" && currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800">
            Access Denied
          </h1>
          <p className="text-slate-600 mt-2">
            Only Super Admins can access this page.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2d4650]">
              User Management
            </h1>
            <p className="text-slate-500">
              Assign roles and approve new users
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search users…"
              className="pl-9 bg-white/80 border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Invite Users */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Invite a user
              </h2>
              <p className="text-sm text-slate-500">
                Send a secure invite link to add someone to your organization.
              </p>
            </div>
            <form
              onSubmit={handleInviteSubmit}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              <div className="md:col-span-2 space-y-2">
                <Label>Email</Label>
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="event_champion">
                      Event Champion
                    </SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button
                  type="submit"
                  className="bg-[#835879] text-white"
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? "Sending…" : "Send Invite"}
                </Button>
              </div>
            </form>
            {invites.length > 0 && (
              <div className="text-sm text-slate-600">
                {invites.filter((i) => !i.used_at).length} pending invite
                {invites.filter((i) => !i.used_at).length === 1 ? "" : "s"}.
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Table */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 text-slate-600">User</th>
                  <th className="text-left p-4 text-slate-600">Role</th>
                  <th className="text-left p-4 text-slate-600">Status</th>
                  <th className="text-left p-4 text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: "#835879" }}
                        >
                          {user.full_name?.[0]?.toUpperCase() || (
                            <UserIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <Select
                        value={user.role || "volunteer"}
                        onValueChange={(val) =>
                          handleRoleChange(user.id, val)
                        }
                      >
                        <SelectTrigger className="w-40 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">
                            Super Admin
                          </SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="event_champion">
                            Event Champion
                          </SelectItem>
                          <SelectItem value="volunteer">
                            Volunteer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={
                          user.account_status === "approved"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : user.account_status === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {user.account_status === "approved" && (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        )}
                        {user.account_status === "pending" && (
                          <Shield className="w-3 h-3 mr-1" />
                        )}
                        {user.account_status === "rejected" && (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {(user.account_status || "pending").toUpperCase()}
                      </Badge>
                    </td>

                    <td className="p-4">
                      {user.account_status !== "approved" ? (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() =>
                            handleStatusChange(user.id, "approved")
                          }
                        >
                          Approve
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() =>
                            handleStatusChange(user.id, "pending")
                          }
                        >
                          Suspend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
