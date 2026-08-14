import React, { useMemo, useState } from "react";
import { Check, Link2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PublicationPlanner from "@/components/marketstreet/PublicationPlanner";

const EMPTY_CAMPAIGN = {
  title: "", description: "", objective: "", audience: "", start_date: "", end_date: "", status: "draft",
};

function newContent() {
  return {
    client_id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    title: "",
    body: "",
    content_type: "social_post",
    status: "idea",
    publications: [],
    resource: { provider: "canva", title: "", url: "" },
  };
}

const STEPS = [
  { number: 1, label: "Brief" },
  { number: 2, label: "Content" },
  { number: 3, label: "Channels & timing" },
];

function StepIndicator({ step }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
      {STEPS.map(({ number, label }) => (
        <div key={number} className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold sm:text-sm ${step === number ? "bg-white text-[#835879] shadow-sm dark:bg-slate-800" : step > number ? "text-emerald-700" : "text-slate-500"}`}>
          {step > number ? <Check className="h-4 w-4" /> : <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">{number}</span>}
          <span className="hidden sm:inline">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function CampaignWizard({ open, onOpenChange, channels = [], onSubmit, isPending }) {
  const [step, setStep] = useState(1);
  const [campaign, setCampaign] = useState(EMPTY_CAMPAIGN);
  const [contentItems, setContentItems] = useState([newContent()]);

  const scheduledCount = useMemo(
    () => contentItems.reduce((total, item) => total + item.publications.length, 0),
    [contentItems]
  );
  const canContinue = step === 1
    ? Boolean(campaign.title.trim())
    : step === 2
      ? contentItems.length > 0 && contentItems.every((item) => item.title.trim())
      : contentItems.every((item) => item.publications.every((publication) => publication.channel_id && publication.planned_at));

  const updateCampaign = (field, value) => {
    setCampaign((current) => ({ ...current, [field]: value }));
  };
  const updateContent = (clientId, updates) => setContentItems((current) => current.map((item) => (
    item.client_id === clientId ? { ...item, ...updates } : item
  )));
  const updateResource = (clientId, updates) => setContentItems((current) => current.map((item) => (
    item.client_id === clientId ? { ...item, resource: { ...item.resource, ...updates } } : item
  )));
  const submit = () => onSubmit({
    ...campaign,
    content_items: contentItems.map((item) => ({
      title: item.title,
      body: item.body,
      content_type: item.content_type,
      status: item.status,
      publications: item.publications.map((publication) => ({
        id: publication.id || undefined,
        channel_id: publication.channel_id,
        planned_at: publication.planned_at,
        status: publication.status,
      })),
      resource: item.resource.url.trim()
        ? { ...item.resource, title: item.resource.title.trim() || item.title.trim() }
        : undefined,
    })),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build a campaign</DialogTitle>
          <DialogDescription>Create the campaign, its content, and the channel schedule in one pass.</DialogDescription>
        </DialogHeader>
        <StepIndicator step={step} />

        {step === 1 && (
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="campaign-title">Campaign title</Label>
              <Input id="campaign-title" className="mt-1" value={campaign.title} onChange={(event) => updateCampaign("title", event.target.value)} placeholder="Holiday window campaign" autoFocus />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="campaign-description">Description</Label>
              <Textarea id="campaign-description" className="mt-1" value={campaign.description} onChange={(event) => updateCampaign("description", event.target.value)} placeholder="What this campaign needs to accomplish" />
            </div>
            <div>
              <Label htmlFor="campaign-audience">Audience</Label>
              <Input id="campaign-audience" className="mt-1" value={campaign.audience} onChange={(event) => updateCampaign("audience", event.target.value)} placeholder="Downtown residents and visitors" />
            </div>
            <div>
              <Label htmlFor="campaign-objective">Primary objective</Label>
              <Input id="campaign-objective" className="mt-1" value={campaign.objective} onChange={(event) => updateCampaign("objective", event.target.value)} placeholder="Increase event awareness" />
            </div>
            <div>
              <Label htmlFor="campaign-start-date">Start date</Label>
              <Input id="campaign-start-date" className="mt-1" type="date" value={campaign.start_date} onChange={(event) => updateCampaign("start_date", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="campaign-end-date">End date</Label>
              <Input id="campaign-end-date" className="mt-1" type="date" min={campaign.start_date || undefined} value={campaign.end_date} onChange={(event) => updateCampaign("end_date", event.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="font-semibold">Build the content plan</h3><p className="text-sm text-slate-500">Add the shared copy and optional working source for each item.</p></div>
              <Button type="button" variant="outline" onClick={() => setContentItems((current) => [...current, newContent()])}><Plus /> Add content</Button>
            </div>
            {contentItems.map((item, index) => (
              <div key={item.client_id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Badge variant="secondary">Content {index + 1}</Badge><span className="text-sm text-slate-500">{item.title || "Untitled"}</span></div>{contentItems.length > 1 && <Button type="button" size="icon" variant="ghost" aria-label={`Remove content ${index + 1}`} onClick={() => setContentItems((current) => current.filter((entry) => entry.client_id !== item.client_id))}><Trash2 /></Button>}</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label htmlFor={`content-title-${item.client_id}`}>Title</Label><Input id={`content-title-${item.client_id}`} className="mt-1" value={item.title} onChange={(event) => updateContent(item.client_id, { title: event.target.value })} placeholder="Volunteer spotlight: August" /></div>
                  <div className="sm:col-span-2"><Label htmlFor={`content-copy-${item.client_id}`}>Working copy</Label><Textarea id={`content-copy-${item.client_id}`} className="mt-1 min-h-24" value={item.body} onChange={(event) => updateContent(item.client_id, { body: event.target.value })} placeholder="Draft the shared message here…" /></div>
                  <div><Label htmlFor={`source-provider-${item.client_id}`}>Source provider <span className="text-slate-400">(optional)</span></Label><Select value={item.resource.provider} onValueChange={(value) => updateResource(item.client_id, { provider: value })}><SelectTrigger id={`source-provider-${item.client_id}`} className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="canva">Canva</SelectItem><SelectItem value="google_drive">Google Drive</SelectItem><SelectItem value="document_center">Document Center</SelectItem><SelectItem value="web">Web link</SelectItem></SelectContent></Select></div>
                  <div><Label htmlFor={`source-url-${item.client_id}`}>Source URL</Label><Input id={`source-url-${item.client_id}`} className="mt-1" type="url" value={item.resource.url} onChange={(event) => updateResource(item.client_id, { url: event.target.value })} placeholder="https://…" /></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div><h3 className="font-semibold">Choose channels and timing</h3><p className="text-sm text-slate-500">Each publication gets its own channel, date, and time.</p></div>
            {contentItems.map((item, index) => (
              <div key={item.client_id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-4 flex items-center justify-between gap-3"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-slate-500">Content {index + 1}</p></div><Badge variant="outline">{item.publications.length} publication{item.publications.length === 1 ? "" : "s"}</Badge></div>
                <PublicationPlanner channels={channels} value={item.publications} onChange={(publications) => updateContent(item.client_id, { publications })} defaultDate={campaign.start_date} />
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-900"><Link2 className="h-4 w-4 text-[#835879]" /><span><strong>{contentItems.length}</strong> content item{contentItems.length === 1 ? "" : "s"} and <strong>{scheduledCount}</strong> channel placement{scheduledCount === 1 ? "" : "s"} will be created together.</span></div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>{step > 1 && <Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)}>Back</Button>}</div>
          <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>{step < 3 ? <Button type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Continue</Button> : <Button type="button" disabled={!canContinue || isPending} onClick={submit}>{isPending ? "Creating…" : "Create campaign & schedule"}</Button>}</div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
