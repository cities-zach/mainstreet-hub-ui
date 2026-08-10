import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const ROLE_LABELS = {
  volunteer: "Volunteers",
  event_champion: "Event Champions",
  admin: "Administrators",
  super_admin: "Super Administrators",
};

function principalLabel(grant, users) {
  if (grant.principal_type === "organization") return "Everyone in the organization";
  if (grant.principal_type === "role") return ROLE_LABELS[grant.principal_id] || grant.principal_id;
  const user = users.find((item) => item.id === grant.principal_id);
  return user?.full_name || user?.email || "Selected user";
}

export default function PermissionsDialog({ open, onOpenChange, resource, type = "document" }) {
  const queryClient = useQueryClient();
  const endpoint = resource
    ? type === "folder"
      ? `/document-folders/${resource.id}/permissions`
      : `/documents/${resource.id}/permissions`
    : null;
  const [draft, setDraft] = useState(null);
  const [principal, setPrincipal] = useState("organization:");
  const [accessLevel, setAccessLevel] = useState("read");

  const usersQuery = useQuery({
    queryKey: ["document-permission-users"],
    queryFn: () => apiFetch("/users/roster"),
    enabled: open,
  });
  const permissionsQuery = useQuery({
    queryKey: ["document-permissions", type, resource?.id],
    queryFn: () => apiFetch(endpoint),
    enabled: Boolean(open && endpoint),
  });

  const grants = draft?.grants ?? permissionsQuery.data?.grants ?? [];
  const fredEnabled = draft?.fred_enabled ?? (permissionsQuery.data?.fred_enabled !== false);
  const inherit = draft?.inherit_folder_permissions ?? (permissionsQuery.data?.inherit_folder_permissions === true);
  const users = useMemo(() => usersQuery.data || [], [usersQuery.data]);
  const principalOptions = useMemo(() => [
    { value: "organization:", label: "Everyone in the organization" },
    ...Object.entries(ROLE_LABELS).map(([id, label]) => ({ value: `role:${id}`, label })),
    ...users.map((user) => ({
      value: `user:${user.id}`,
      label: user.full_name ? `${user.full_name} (${user.email})` : user.email,
    })),
  ], [users]);

  const saveMutation = useMutation({
    mutationFn: () => apiFetch(endpoint, {
      method: "PUT",
      body: JSON.stringify({
        grants: inherit && type === "document" ? [] : grants,
        fred_enabled: fredEnabled,
        ...(type === "document" ? { inherit_folder_permissions: inherit } : {}),
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document-folders"] });
      queryClient.invalidateQueries({ queryKey: ["document-permissions"] });
      toast.success("Permissions updated");
      setDraft(null);
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message || "Permissions could not be updated"),
  });

  const addGrant = () => {
    const [principalType, principalId] = principal.split(":");
    const next = { principal_type: principalType, principal_id: principalId, access_level: accessLevel };
    const key = `${principalType}:${principalId}:${accessLevel}`;
    if (grants.some((grant) => `${grant.principal_type}:${grant.principal_id}:${grant.access_level}` === key)) return;
    setDraft({ grants: [...grants, next], fred_enabled: fredEnabled, inherit_folder_permissions: inherit });
  };

  const closeDialog = (nextOpen) => {
    if (!nextOpen) setDraft(null);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Permissions</DialogTitle>
          <DialogDescription>
            Control who can use {resource?.name || resource?.title}. FRED can only use it for people who also have file access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {type === "document" && resource?.folder_id && (
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={inherit} onChange={(event) => setDraft({ grants, fred_enabled: fredEnabled, inherit_folder_permissions: event.target.checked })} />
              <span><strong>Inherit folder permissions</strong><br /><span className="text-slate-500">Use the folder’s audience instead of document-specific grants.</span></span>
            </label>
          )}

          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <input type="checkbox" className="mt-1" checked={fredEnabled} onChange={(event) => setDraft({ grants, fred_enabled: event.target.checked, inherit_folder_permissions: inherit })} />
            <span><strong>Allow FRED to use this {type}</strong><br /><span className="text-slate-500">This never gives FRED broader access than the person asking.</span></span>
          </label>

          {!(type === "document" && inherit) && (
            <div className="space-y-3">
              <Label>Access grants</Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                <select className="rounded-md border bg-background px-3 py-2 text-sm" value={principal} onChange={(event) => setPrincipal(event.target.value)}>
                  {principalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="rounded-md border bg-background px-3 py-2 text-sm" value={accessLevel} onChange={(event) => setAccessLevel(event.target.value)}>
                  <option value="read">View</option>
                  <option value="sign">View & sign</option>
                  <option value="manage">Manage</option>
                </select>
                <Button type="button" variant="outline" onClick={addGrant}>Add</Button>
              </div>
              <div className="space-y-2">
                {grants.length === 0 && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Only the owner and administrators will retain access.</p>}
                {grants.map((grant, index) => (
                  <div key={`${grant.principal_type}-${grant.principal_id}-${grant.access_level}-${index}`} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div><p className="font-medium">{principalLabel(grant, users)}</p><p className="capitalize text-slate-500">{grant.access_level === "read" ? "View" : grant.access_level === "sign" ? "View and sign" : "Manage"}</p></div>
                    <Button size="icon" variant="ghost" aria-label="Remove grant" onClick={() => setDraft({ grants: grants.filter((_, grantIndex) => grantIndex !== index), fred_enabled: fredEnabled, inherit_folder_permissions: inherit })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => closeDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : "Save permissions"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
