import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSignature, Upload } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SignatureRequestDialog({ open, onOpenChange, document }) {
  const queryClient = useQueryClient();
  const [recipientIds, setRecipientIds] = useState([]);
  const [message, setMessage] = useState("");
  const [dueAt, setDueAt] = useState("");
  const usersQuery = useQuery({
    queryKey: ["document-permission-users"],
    queryFn: () => apiFetch("/users/roster"),
    enabled: open,
  });
  const requestsQuery = useQuery({
    queryKey: ["signature-requests", "document", document?.id],
    queryFn: () => apiFetch(`/documents/${document.id}/signature-requests`),
    enabled: Boolean(open && document?.id),
  });
  const closeDialog = (nextOpen) => {
    if (!nextOpen) { setRecipientIds([]); setMessage(""); setDueAt(""); }
    onOpenChange(nextOpen);
  };

  const mutation = useMutation({
    mutationFn: () => apiFetch(`/documents/${document.id}/signature-requests`, {
      method: "POST",
      body: JSON.stringify({
        recipient_user_ids: recipientIds,
        source_version_id: document.version_id,
        title: `${document.title} signature request`,
        message: message.trim() || null,
        due_at: dueAt ? new Date(`${dueAt}T23:59:59`).toISOString() : null,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature-requests"] });
      toast.success("Signature request sent");
      closeDialog(false);
    },
    onError: (error) => toast.error(error.message || "Signature request could not be created"),
  });

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> Request signatures</DialogTitle><DialogDescription>Signers work in the order shown. Each person downloads the latest returned copy, signs it, and uploads their result.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          {(requestsQuery.data || []).length > 0 && <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><Label>Existing requests</Label>{requestsQuery.data.slice(0, 5).map((request) => <div key={request.id} className="flex items-center justify-between text-sm"><span>{request.title}</span><Badge variant="outline" className="capitalize">{request.status} · {request.signed_count}/{request.signer_count}</Badge></div>)}</div>}
          <div className="space-y-2"><Label>Signers, in order</Label><div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
            {(usersQuery.data || []).map((user) => (
              <label key={user.id} className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={recipientIds.includes(user.id)} onChange={(event) => setRecipientIds(event.target.checked ? [...recipientIds, user.id] : recipientIds.filter((id) => id !== user.id))} />
                <span>{user.full_name || user.email} <span className="text-slate-400">{user.full_name ? user.email : ""}</span></span>
              </label>
            ))}
          </div><p className="text-xs text-slate-500">Selection order determines signing order.</p></div>
          <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div>
          <div className="space-y-2"><Label>Message</Label><Textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Please review and sign this document." /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => closeDialog(false)}>Cancel</Button><Button disabled={!recipientIds.length || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Sending…" : "Send request"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SignatureInboxDialog({ open, onOpenChange, initialRequestId = null, openFile }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(initialRequestId);
  const [signedFile, setSignedFile] = useState(null);
  const meQuery = useQuery({ queryKey: ["users-me"], queryFn: () => apiFetch("/users/me"), enabled: open });
  const inboxQuery = useQuery({
    queryKey: ["signature-requests", "mine"],
    queryFn: () => apiFetch("/document-signature-requests"),
    enabled: open,
  });
  const detailQuery = useQuery({
    queryKey: ["signature-request", selectedId],
    queryFn: () => apiFetch(`/document-signature-requests/${selectedId}`),
    enabled: Boolean(open && selectedId),
  });
  const returnMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append("file", signedFile, signedFile.name);
      return apiFetch(`/document-signature-requests/${selectedId}/return`, { method: "POST", body });
    },
    onSuccess: () => {
      setSignedFile(null);
      queryClient.invalidateQueries({ queryKey: ["signature-requests"] });
      queryClient.invalidateQueries({ queryKey: ["signature-request", selectedId] });
      toast.success("Signed copy returned");
    },
    onError: (error) => toast.error(error.message || "Signed copy could not be returned"),
  });
  const declineMutation = useMutation({
    mutationFn: () => apiFetch(`/document-signature-requests/${selectedId}/decline`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["signature-requests"] }); setSelectedId(null); toast.success("Signature request declined"); },
    onError: (error) => toast.error(error.message || "Request could not be declined"),
  });

  const detail = detailQuery.data;
  const isMyTurn = detail?.current_recipient_user_id === meQuery.data?.id && ["pending", "in_progress"].includes(detail?.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> My signature requests</DialogTitle><DialogDescription>Download the current copy, sign it, and return the signed file here.</DialogDescription></DialogHeader>
        {!selectedId ? <div className="space-y-2">
          {inboxQuery.isLoading && <p className="text-sm text-slate-500">Loading requests…</p>}
          {(inboxQuery.data || []).length === 0 && !inboxQuery.isLoading && <p className="rounded-md border p-6 text-center text-sm text-slate-500">No signature requests.</p>}
          {(inboxQuery.data || []).map((request) => <button key={request.id} className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => setSelectedId(request.id)}><div><p className="font-medium">{request.title}</p><p className="text-sm text-slate-500">{request.document_title}</p></div><Badge variant="outline" className="capitalize">{request.recipient_status}</Badge></button>)}
        </div> : <div className="space-y-5">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>← Back to requests</Button>
          {detailQuery.isLoading ? <p>Loading…</p> : detail && <>
            <div><h3 className="text-lg font-semibold">{detail.title}</h3><p className="text-sm text-slate-500">{detail.document_title} · source version {detail.source_version_number}</p>{detail.message && <p className="mt-2 text-sm">{detail.message}</p>}</div>
            <div className="space-y-2">{detail.recipients.map((recipient) => <div key={recipient.id} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">{recipient.sequence_number}. {recipient.full_name || recipient.email}</p><p className="text-xs text-slate-500">{recipient.status === "signed" ? "Signed copy saved" : recipient.status}</p></div>{recipient.status === "signed" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Badge variant="outline" className="capitalize">{recipient.status}</Badge>}</div>)}</div>
            <Button className="gap-2" onClick={() => openFile(detail.current_file_id)}><Download className="h-4 w-4" /> Download current copy</Button>
            {isMyTurn && <div className="space-y-3 rounded-lg border p-4"><Label>Return your signed copy</Label><Input type="file" onChange={(event) => setSignedFile(event.target.files?.[0] || null)} /><div className="flex gap-2"><Button className="gap-2" disabled={!signedFile || returnMutation.isPending} onClick={() => returnMutation.mutate()}><Upload className="h-4 w-4" /> {returnMutation.isPending ? "Uploading…" : "Return signed copy"}</Button><Button variant="outline" disabled={declineMutation.isPending} onClick={() => declineMutation.mutate()}>Decline</Button></div></div>}
            {detail.status === "completed" && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">All signatures are complete. The final signed copy is preserved with this request.</p>}
          </>}
        </div>}
      </DialogContent>
    </Dialog>
  );
}
