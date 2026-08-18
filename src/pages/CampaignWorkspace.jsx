import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarDays, Check, CircleDashed, ExternalLink,
  FileText, Link2, Pencil, Plus, RotateCcw, Save, Trash2, UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { marketStreetDateTimeToIso, marketStreetIsoToDateTime } from "@/lib/marketstreetTime";

const STATUS_STYLES = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  paused: "border-amber-200 bg-amber-50 text-amber-800",
  complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
  not_started: "border-slate-200 bg-slate-50 text-slate-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-800",
  review: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  approved: "border-teal-200 bg-teal-50 text-teal-800",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
};

const EMPTY_DELIVERABLE = {
  title: "", deliverable_type: "", description: "", status: "not_started",
  owner_id: "none", channel_id: "none", due_at: "", completed_at: "",
};

const EMPTY_EVIDENCE = { provider: "web", title: "", url: "" };

function statusLabel(value) {
  return String(value || "unknown").replaceAll("_", " ");
}

function StatusBadge({ status }) {
  return <Badge variant="outline" className={STATUS_STYLES[status] || "bg-slate-50 text-slate-700"}>{statusLabel(status)}</Badge>;
}

function formatDateTime(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(date);
}

function campaignForm(campaign) {
  return {
    title: campaign?.title || "",
    description: campaign?.description || "",
    objective: campaign?.objective || "",
    audience: campaign?.audience || "",
    status: campaign?.status || "draft",
    priority: campaign?.priority || "normal",
    owner_id: campaign?.owner_id || "none",
    start_date: campaign?.start_date?.slice(0, 10) || "",
    end_date: campaign?.end_date?.slice(0, 10) || "",
    budget: campaign?.budget ?? "",
  };
}

function deliverableForm(deliverable) {
  return {
    title: deliverable?.title || "",
    deliverable_type: deliverable?.deliverable_type || "",
    description: deliverable?.description || "",
    status: deliverable?.status || "not_started",
    owner_id: deliverable?.owner_id || "none",
    channel_id: deliverable?.channel_id || "none",
    due_at: marketStreetIsoToDateTime(deliverable?.due_at),
    completed_at: marketStreetIsoToDateTime(deliverable?.completed_at),
  };
}

function deliverablePayload(form) {
  const payload = {
    ...form,
    owner_id: form.owner_id === "none" ? null : form.owner_id,
    channel_id: form.channel_id === "none" ? null : form.channel_id,
    due_at: form.due_at ? marketStreetDateTimeToIso(form.due_at) : null,
  };
  if (form.status === "complete" && form.completed_at) {
    payload.completed_at = marketStreetDateTimeToIso(form.completed_at);
  } else {
    delete payload.completed_at;
  }
  return payload;
}

export default function CampaignWorkspace() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const focusedDeliverableId = searchParams.get("deliverable");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignDraft, setCampaignDraft] = useState(null);
  const [deliverableOpen, setDeliverableOpen] = useState(false);
  const [deliverableTarget, setDeliverableTarget] = useState(null);
  const [deliverableDraft, setDeliverableDraft] = useState(EMPTY_DELIVERABLE);
  const [evidenceTarget, setEvidenceTarget] = useState(null);
  const [evidenceDraft, setEvidenceDraft] = useState(EMPTY_EVIDENCE);

  const detailQuery = useQuery({
    queryKey: ["marketstreet-campaign", id],
    queryFn: () => apiFetch(`/marketstreet/campaigns/${id}`),
  });
  const rosterQuery = useQuery({ queryKey: ["user-roster"], queryFn: () => apiFetch("/users/roster") });
  const channelsQuery = useQuery({ queryKey: ["marketstreet-channels"], queryFn: () => apiFetch("/marketstreet/channels") });
  const contentQuery = useQuery({
    queryKey: ["marketstreet-content", id],
    queryFn: () => apiFetch(`/marketstreet/content?campaign_id=${id}`),
  });

  const campaign = detailQuery.data?.campaign;
  const deliverables = useMemo(() => detailQuery.data?.deliverables || [], [detailQuery.data?.deliverables]);
  const users = rosterQuery.data || [];
  const channels = (channelsQuery.data || []).filter((channel) => channel.is_enabled || channel.id === deliverableDraft.channel_id);
  const activeDeliverables = deliverables.filter((item) => item.status !== "cancelled");
  const completedCount = activeDeliverables.filter((item) => item.status === "complete").length;
  const openDeliverableCount = activeDeliverables.length - completedCount;
  const progress = activeDeliverables.length ? Math.round((completedCount / activeDeliverables.length) * 100) : 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["marketstreet-campaign", id] });
    queryClient.invalidateQueries({ queryKey: ["marketstreet-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["marketstreet-overview"] });
    queryClient.invalidateQueries({ queryKey: ["marketstreet-calendar"] });
    queryClient.invalidateQueries({ queryKey: ["action-center"] });
  };

  useEffect(() => {
    if (!focusedDeliverableId || detailQuery.isLoading) return;
    const target = document.getElementById(`deliverable-${focusedDeliverableId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedDeliverableId, detailQuery.isLoading]);

  const saveCampaign = useMutation({
    mutationFn: () => apiFetch(`/marketstreet/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...campaignDraft,
        status: campaignDraft.status === campaign.status ? undefined : campaignDraft.status,
        owner_id: campaignDraft.owner_id === "none" ? null : campaignDraft.owner_id,
        start_date: campaignDraft.start_date || null,
        end_date: campaignDraft.end_date || null,
        budget: campaignDraft.budget === "" ? null : Number(campaignDraft.budget),
      }),
    }),
    onSuccess: () => { refresh(); setCampaignOpen(false); toast.success("Campaign updated"); },
    onError: (error) => toast.error(error.message || "Campaign could not be updated"),
  });

  const saveDeliverable = useMutation({
    mutationFn: () => apiFetch(
      deliverableTarget ? `/marketstreet/deliverables/${deliverableTarget.id}` : `/marketstreet/campaigns/${id}/deliverables`,
      { method: deliverableTarget ? "PATCH" : "POST", body: JSON.stringify(deliverablePayload(deliverableDraft)) }
    ),
    onSuccess: () => {
      refresh();
      setDeliverableOpen(false);
      setDeliverableTarget(null);
      setDeliverableDraft(EMPTY_DELIVERABLE);
      toast.success(deliverableTarget ? "Work item updated" : "Work item added");
    },
    onError: (error) => toast.error(error.message || "Work item could not be saved"),
  });

  const quickStatus = useMutation({
    mutationFn: ({ deliverable, status }) => apiFetch(`/marketstreet/deliverables/${deliverable.id}`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),
    onSuccess: (_, variables) => {
      refresh();
      toast.success(variables.status === "complete" ? "Work marked complete" : "Work reopened");
    },
    onError: (error) => toast.error(error.message || "Status could not be updated"),
  });

  const addEvidence = useMutation({
    mutationFn: () => apiFetch("/marketstreet/resources", {
      method: "POST",
      body: JSON.stringify({ ...evidenceDraft, deliverable_id: evidenceTarget.id }),
    }),
    onSuccess: () => {
      refresh();
      setEvidenceTarget(null);
      setEvidenceDraft(EMPTY_EVIDENCE);
      toast.success("Evidence linked");
    },
    onError: (error) => toast.error(error.message || "Evidence could not be linked"),
  });

  const removeEvidence = useMutation({
    mutationFn: (resource) => apiFetch(`/marketstreet/resources/${resource.id}`, { method: "DELETE" }),
    onSuccess: () => { refresh(); toast.success("Link removed"); },
    onError: (error) => toast.error(error.message || "Link could not be removed"),
  });

  const openCampaignEditor = () => {
    setCampaignDraft(campaignForm(campaign));
    setCampaignOpen(true);
  };
  const openDeliverableEditor = (deliverable = null) => {
    setDeliverableTarget(deliverable);
    setDeliverableDraft(deliverable ? deliverableForm(deliverable) : { ...EMPTY_DELIVERABLE, owner_id: campaign?.owner_id || "none" });
    setDeliverableOpen(true);
  };

  if (detailQuery.isLoading) {
    return <div className="min-h-screen bg-[#f5f4f1] p-8 text-center text-slate-500 dark:bg-slate-950">Loading campaign…</div>;
  }
  if (detailQuery.isError || !campaign) {
    return <div className="min-h-screen bg-[#f5f4f1] p-8 dark:bg-slate-950"><Card className="mx-auto max-w-xl"><CardContent className="p-8 text-center"><p className="font-semibold">Campaign could not be loaded.</p><p className="mt-2 text-sm text-slate-500">{detailQuery.error?.message}</p><Button className="mt-5" onClick={() => navigate("/marketstreet")}>Back to MarketStreet</Button></CardContent></Card></div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f4f1] px-4 py-5 dark:bg-slate-950 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <Button variant="ghost" className="gap-2" asChild><Link to="/marketstreet?tab=campaigns"><ArrowLeft className="h-4 w-4" /> Back to campaigns</Link></Button>

        <section className="overflow-hidden rounded-3xl bg-[#2d4650] text-white shadow-xl">
          <div className="flex flex-col justify-between gap-6 px-6 py-7 md:px-9 md:py-9 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2"><StatusBadge status={campaign.status} /><Badge variant="outline" className="border-white/30 text-white">{campaign.priority} priority</Badge></div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{campaign.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200 md:text-base">{campaign.description || campaign.objective || "No campaign brief yet."}</p>
              {campaign.source_event_name && <p className="mt-3 text-sm text-slate-300">Created from: {campaign.source_event_name}</p>}
            </div>
            <Button variant="secondary" className="shrink-0 gap-2 bg-white text-[#2d4650] hover:bg-slate-100" onClick={openCampaignEditor}><Pencil className="h-4 w-4" /> Edit campaign</Button>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Work completed</p><p className="mt-1 text-3xl font-bold">{completedCount} <span className="text-base font-medium text-slate-400">of {activeDeliverables.length}</span></p><Progress className="mt-3" value={progress} /></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Campaign owner</p><p className="mt-2 flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4 text-[#835879]" />{campaign.owner_name || "Unassigned"}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Campaign dates</p><p className="mt-2 flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-[#835879]" />{campaign.start_date?.slice(0, 10) || "Not set"} – {campaign.end_date?.slice(0, 10) || "Open"}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Publishing</p><p className="mt-1 text-3xl font-bold">{campaign.published_count} <span className="text-base font-medium text-slate-400">of {campaign.publication_count}</span></p><p className="mt-1 text-xs text-slate-500">publications completed</p></CardContent></Card>
        </div>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div><CardTitle>Campaign work</CardTitle><CardDescription>Requirements, assignments, deadlines, completion times, and proof of work.</CardDescription></div>
            <Button className="gap-2" onClick={() => openDeliverableEditor()}><Plus className="h-4 w-4" /> Add work</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliverables.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center"><CircleDashed className="mx-auto mb-3 h-9 w-9 text-slate-400" /><p className="font-semibold">No work items yet</p><p className="mt-1 text-sm text-slate-500">Add the concrete things this campaign needs, such as creating a Facebook event.</p></div>
            ) : deliverables.map((deliverable) => {
              const highlighted = deliverable.id === focusedDeliverableId;
              return (
                <div id={`deliverable-${deliverable.id}`} key={deliverable.id} className={`rounded-xl border p-4 transition ${highlighted ? "border-[#835879] bg-violet-50 ring-2 ring-[#835879]/20 dark:bg-violet-950/20" : "border-slate-200 dark:border-slate-800"}`}>
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900 dark:text-white">{deliverable.title}</h3><StatusBadge status={deliverable.status} />{deliverable.channel_name && <Badge variant="secondary">{deliverable.channel_name}</Badge>}</div>
                      {deliverable.description && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{deliverable.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        <span><strong className="text-slate-700 dark:text-slate-200">Owner:</strong> {deliverable.owner_name || "Unassigned"}</span>
                        <span><strong className="text-slate-700 dark:text-slate-200">Due:</strong> {formatDateTime(deliverable.due_at)}</span>
                        {deliverable.completed_at && <span><strong className="text-slate-700 dark:text-slate-200">Completed:</strong> {formatDateTime(deliverable.completed_at)}</span>}
                      </div>
                      {(deliverable.resources || []).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{deliverable.resources.map((resource) => <span key={resource.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"><a href={resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-[#835879]"><Link2 className="h-3 w-3" />{resource.title}<ExternalLink className="h-3 w-3" /></a><button type="button" aria-label={`Remove ${resource.title}`} className="ml-1 text-slate-400 hover:text-red-600" onClick={() => removeEvidence.mutate(resource)}><Trash2 className="h-3 w-3" /></button></span>)}</div>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {deliverable.status === "complete" ? <Button size="sm" variant="outline" className="gap-2" onClick={() => quickStatus.mutate({ deliverable, status: "in_progress" })}><RotateCcw className="h-4 w-4" /> Reopen</Button> : deliverable.status !== "cancelled" && <Button size="sm" className="gap-2" onClick={() => quickStatus.mutate({ deliverable, status: "complete" })}><Check className="h-4 w-4" /> Complete</Button>}
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => { setEvidenceTarget(deliverable); setEvidenceDraft({ ...EMPTY_EVIDENCE, title: deliverable.title }); }}><Link2 className="h-4 w-4" /> Add link</Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => openDeliverableEditor(deliverable)}><Pencil className="h-4 w-4" /> Edit</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle>Content and publications</CardTitle><CardDescription>Scheduled content remains editable in the Content Studio until it is published.</CardDescription></div><Button variant="outline" asChild><Link to={`/marketstreet?tab=content&campaign=${id}`}><FileText className="mr-2 h-4 w-4" /> Manage content</Link></Button></CardHeader>
          <CardContent className="space-y-3">
            {(contentQuery.data || []).length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No content is attached to this campaign yet.</p> : contentQuery.data.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.title}</p><StatusBadge status={item.status} /></div><p className="mt-1 text-sm text-slate-500">{(item.publications || []).length} publication{item.publications?.length === 1 ? "" : "s"}</p></div><div className="flex flex-wrap gap-2">{(item.publications || []).map((publication) => <Badge key={publication.id} variant="outline">{publication.channel_name} · {formatDateTime(publication.planned_at)}</Badge>)}</div></div>)}
          </CardContent>
        </Card>
      </div>

      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Edit campaign</DialogTitle><DialogDescription>Every planning field can be updated as the campaign changes.</DialogDescription></DialogHeader>
          {campaignDraft && <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label htmlFor="campaign-edit-title">Title</Label><Input id="campaign-edit-title" className="mt-1" value={campaignDraft.title} onChange={(e) => setCampaignDraft({ ...campaignDraft, title: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label htmlFor="campaign-edit-description">Description</Label><Textarea id="campaign-edit-description" className="mt-1" value={campaignDraft.description} onChange={(e) => setCampaignDraft({ ...campaignDraft, description: e.target.value })} /></div>
            <div><Label>Objective</Label><Input className="mt-1" value={campaignDraft.objective} onChange={(e) => setCampaignDraft({ ...campaignDraft, objective: e.target.value })} /></div>
            <div><Label>Audience</Label><Input className="mt-1" value={campaignDraft.audience} onChange={(e) => setCampaignDraft({ ...campaignDraft, audience: e.target.value })} /></div>
            <div><Label>Status</Label><Select value={campaignDraft.status} onValueChange={(value) => setCampaignDraft({ ...campaignDraft, status: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["draft", "active", "paused", "complete", "archived"].map((value) => <SelectItem key={value} value={value} disabled={value === "complete" && openDeliverableCount > 0}>{statusLabel(value)}</SelectItem>)}</SelectContent></Select>{openDeliverableCount > 0 && <p className="mt-1 text-xs text-slate-500">Complete or cancel {openDeliverableCount} remaining work item{openDeliverableCount === 1 ? "" : "s"} before completing the campaign.</p>}</div>
            <div><Label>Priority</Label><Select value={campaignDraft.priority} onValueChange={(value) => setCampaignDraft({ ...campaignDraft, priority: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["low", "normal", "high", "urgent"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Owner</Label><Select value={campaignDraft.owner_id} onValueChange={(value) => setCampaignDraft({ ...campaignDraft, owner_id: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.full_name || user.email}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Budget</Label><Input className="mt-1" type="number" min="0" step="0.01" value={campaignDraft.budget} onChange={(e) => setCampaignDraft({ ...campaignDraft, budget: e.target.value })} /></div>
            <div><Label>Start date</Label><Input className="mt-1" type="date" value={campaignDraft.start_date} onChange={(e) => setCampaignDraft({ ...campaignDraft, start_date: e.target.value })} /></div>
            <div><Label>End date</Label><Input className="mt-1" type="date" min={campaignDraft.start_date || undefined} value={campaignDraft.end_date} onChange={(e) => setCampaignDraft({ ...campaignDraft, end_date: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setCampaignOpen(false)}>Cancel</Button><Button className="gap-2" disabled={!campaignDraft?.title.trim() || saveCampaign.isPending} onClick={() => saveCampaign.mutate()}><Save className="h-4 w-4" /> Save campaign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deliverableOpen} onOpenChange={(open) => { setDeliverableOpen(open); if (!open) setDeliverableTarget(null); }}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{deliverableTarget ? "Edit work item" : "Add campaign work"}</DialogTitle><DialogDescription>Dates, assignments, status, and actual completion time remain editable.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label htmlFor="deliverable-title">Title</Label><Input id="deliverable-title" className="mt-1" value={deliverableDraft.title} onChange={(e) => setDeliverableDraft({ ...deliverableDraft, title: e.target.value })} placeholder="Create Facebook Event" /></div>
            <div><Label>Type</Label><Input className="mt-1" value={deliverableDraft.deliverable_type} onChange={(e) => setDeliverableDraft({ ...deliverableDraft, deliverable_type: e.target.value })} placeholder="Facebook Event" /></div>
            <div><Label>Status</Label><Select value={deliverableDraft.status} onValueChange={(value) => setDeliverableDraft({ ...deliverableDraft, status: value, completed_at: value === "complete" ? deliverableDraft.completed_at : "" })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["not_started", "in_progress", "review", "approved", "complete", "cancelled"].map((value) => <SelectItem key={value} value={value}>{statusLabel(value)}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea className="mt-1" value={deliverableDraft.description} onChange={(e) => setDeliverableDraft({ ...deliverableDraft, description: e.target.value })} /></div>
            <div><Label>Owner</Label><Select value={deliverableDraft.owner_id} onValueChange={(value) => setDeliverableDraft({ ...deliverableDraft, owner_id: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.full_name || user.email}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Channel</Label><Select value={deliverableDraft.channel_id} onValueChange={(value) => setDeliverableDraft({ ...deliverableDraft, channel_id: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No channel</SelectItem>{channels.map((channel) => <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Due date and time</Label><Input className="mt-1" type="datetime-local" value={deliverableDraft.due_at} onChange={(e) => setDeliverableDraft({ ...deliverableDraft, due_at: e.target.value })} /></div>
            {deliverableDraft.status === "complete" && <div><Label>Actually completed</Label><Input className="mt-1" type="datetime-local" value={deliverableDraft.completed_at} onChange={(e) => setDeliverableDraft({ ...deliverableDraft, completed_at: e.target.value })} /><p className="mt-1 text-xs text-slate-500">Leave blank to record the current time.</p></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDeliverableOpen(false)}>Cancel</Button><Button className="gap-2" disabled={!deliverableDraft.title.trim() || saveDeliverable.isPending} onClick={() => saveDeliverable.mutate()}><Save className="h-4 w-4" /> Save work</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(evidenceTarget)} onOpenChange={(open) => !open && setEvidenceTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add proof or working link</DialogTitle><DialogDescription>Attach the finished Facebook event, Canva design, Drive file, document, or another web link.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Provider</Label><Select value={evidenceDraft.provider} onValueChange={(value) => setEvidenceDraft({ ...evidenceDraft, provider: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="web">Web link</SelectItem><SelectItem value="canva">Canva</SelectItem><SelectItem value="google_drive">Google Drive</SelectItem><SelectItem value="document_center">Document Center</SelectItem></SelectContent></Select></div>
            <div><Label>Link title</Label><Input className="mt-1" value={evidenceDraft.title} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, title: e.target.value })} /></div>
            <div><Label>URL</Label><Input className="mt-1" type="url" value={evidenceDraft.url} onChange={(e) => setEvidenceDraft({ ...evidenceDraft, url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEvidenceTarget(null)}>Cancel</Button><Button disabled={!evidenceDraft.title.trim() || !evidenceDraft.url.trim() || addEvidence.isPending} onClick={() => addEvidence.mutate()}>Attach link</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
