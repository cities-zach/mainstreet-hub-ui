import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, Shield, Users } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_TEAM = { id: null, name: "", description: "", color: "#835879", members: {} };

export default function TeamManagement() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState(null);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await apiFetch("/me")).user,
  });
  const teamsQuery = useQuery({ queryKey: ["organization-teams"], queryFn: () => apiFetch("/teams") });
  const usersQuery = useQuery({ queryKey: ["user-roster"], queryFn: () => apiFetch("/users/roster") });
  const currentUser = meQuery.data;
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const users = useMemo(() => usersQuery.data || [], [usersQuery.data]);

  const openEditor = (team = null) => {
    const members = Object.fromEntries((team?.members || []).map((member) => [
      member.user_id, member.membership_role,
    ]));
    setEditor(team ? {
      id: team.id,
      name: team.name,
      description: team.description || "",
      color: team.color || "#835879",
      members,
    } : { ...EMPTY_TEAM, members: {} });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const members = Object.entries(editor.members).map(([userId, membershipRole]) => ({
        user_id: userId,
        membership_role: membershipRole,
      }));
      if (!editor.id) {
        return apiFetch("/teams", {
          method: "POST",
          body: JSON.stringify({
            name: editor.name.trim(),
            description: editor.description.trim() || null,
            color: editor.color,
            members,
          }),
        });
      }
      await apiFetch(`/teams/${editor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editor.name.trim(),
          description: editor.description.trim() || null,
          color: editor.color,
          members,
        }),
      });
      return { id: editor.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-teams"] });
      queryClient.invalidateQueries({ queryKey: ["document-permission-teams"] });
      toast.success(editor.id ? "Team updated" : "Team created");
      setEditor(null);
    },
    onError: (error) => toast.error(error.message || "Team could not be saved"),
  });

  const archiveMutation = useMutation({
    mutationFn: (team) => apiFetch(`/teams/${team.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-teams"] });
      queryClient.invalidateQueries({ queryKey: ["document-permission-teams"] });
      toast.success("Team archived; its permission grants are no longer active");
    },
    onError: (error) => toast.error(error.message || "Team could not be archived"),
  });

  const toggleMember = (userId, checked) => {
    const members = { ...editor.members };
    if (checked) members[userId] = "member";
    else delete members[userId];
    setEditor({ ...editor, members });
  };

  if (meQuery.isLoading || teamsQuery.isLoading || usersQuery.isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading teams…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center"><Shield className="mx-auto h-14 w-14 text-red-500" /><h1 className="mt-4 text-2xl font-bold">Access denied</h1><p className="mt-2 text-slate-500">Administrators manage organization teams.</p></div>
      </div>
    );
  }

  const teams = teamsQuery.data || [];
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-[#2d4650] dark:text-slate-100"><Users className="h-8 w-8" /> Teams</h1>
            <p className="mt-2 text-slate-500">Reusable groups for document permissions and future assignments across MainSuite.</p>
          </div>
          <Button className="gap-2 bg-[#835879] text-white" onClick={() => openEditor()}><Plus className="h-4 w-4" /> New team</Button>
        </div>

        {teams.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-slate-500">No teams yet. Create one to start assigning folder access.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3"><span className="h-10 w-2 rounded-full" style={{ backgroundColor: team.color }} /><div><CardTitle>{team.name}</CardTitle><p className="mt-1 text-xs text-slate-500">{team.member_count} member{team.member_count === 1 ? "" : "s"}</p></div></div>
                    <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Edit ${team.name}`} onClick={() => openEditor(team)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Archive ${team.name}`} disabled={archiveMutation.isPending} onClick={() => { if (window.confirm(`Archive ${team.name}? Its folder permissions will stop granting access immediately.`)) archiveMutation.mutate(team); }}><Archive className="h-4 w-4" /></Button></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {team.description && <p className="text-sm text-slate-600 dark:text-slate-300">{team.description}</p>}
                  <div className="flex flex-wrap gap-1.5">{team.members.map((member) => <Badge key={member.user_id} variant={member.membership_role === "manager" ? "default" : "outline"}>{member.full_name || member.email}{member.membership_role === "manager" ? " · manager" : ""}</Badge>)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit team" : "Create team"}</DialogTitle><DialogDescription>Roles remain separate from teams. A team may include administrators, volunteers, and other user types together.</DialogDescription></DialogHeader>
          {editor && <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
              <div className="space-y-2"><Label>Team name</Label><Input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} placeholder="Board of Directors" /></div>
              <div className="space-y-2"><Label>Color</Label><Input type="color" className="h-10 p-1" value={editor.color} onChange={(event) => setEditor({ ...editor, color: event.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} placeholder="What this team is responsible for" /></div>
            <div className="space-y-2">
              <Label>Members</Label>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-2">
                {users.map((user) => {
                  const selected = Object.hasOwn(editor.members, user.id);
                  return <div key={user.id} className="flex flex-col gap-2 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-900 sm:flex-row sm:items-center"><label className="flex min-w-0 flex-1 items-center gap-3"><input type="checkbox" checked={selected} onChange={(event) => toggleMember(user.id, event.target.checked)} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{user.full_name || user.email}</span><span className="block truncate text-xs capitalize text-slate-500">{user.email} · {user.role.replaceAll("_", " ")}</span></span></label>{selected && <select className="rounded-md border bg-background px-2 py-1.5 text-sm" value={editor.members[user.id]} onChange={(event) => setEditor({ ...editor, members: { ...editor.members, [user.id]: event.target.value } })}><option value="member">Member</option><option value="manager">Team manager</option></select>}</div>;
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button><Button disabled={!editor.name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "Saving…" : "Save team"}</Button></div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
