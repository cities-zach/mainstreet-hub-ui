import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Image, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api";
import { uploadPublicFile } from "@/lib/uploads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const emptyForm = {
  name: "",
  description: "",
  photo_url: "",
  primary_goal: "",
  goals: [],
};

const emptyOfflineDonation = {
  amount: "",
  first_name: "",
  last_name: "",
  email: "",
  donor_message: "",
  anonymous: false,
  is_match_pledge: false,
  match_message: "",
};

function centsToDollars(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function dollarsToCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatMoney(cents, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Number(cents || 0) / 100);
}

function publicCampaignUrl(campaign) {
  if (!campaign?.public_slug || typeof window === "undefined") return "";
  return `${window.location.origin}/fundraising/${campaign.public_slug}`;
}

function formFromCampaign(campaign) {
  return {
    name: campaign?.name || "",
    description: campaign?.description || "",
    photo_url: campaign?.photo_url || "",
    primary_goal: centsToDollars(campaign?.primary_goal_cents),
    goals: (campaign?.goals || []).map((goal) => ({
      id: goal.id,
      label: goal.label || "",
      description: goal.description || "",
      amount: centsToDollars(goal.amount_cents),
    })),
  };
}

function ProgressBar({ campaign }) {
  const percent = campaign?.percent || 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{formatMoney(campaign?.paid_total_cents, campaign?.currency)} raised</span>
        <span>{formatMoney(campaign?.active_goal?.amount_cents || campaign?.primary_goal_cents, campaign?.currency)} goal</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#835879]" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}

export default function Fundraising() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [offlineForm, setOfflineForm] = useState(emptyOfflineDonation);
  const [uploading, setUploading] = useState(false);

  const campaigns = useQuery({
    queryKey: ["fundraising", "campaigns"],
    queryFn: () => apiFetch("/fundraising/campaigns"),
  });

  const selectedCampaign = useQuery({
    queryKey: ["fundraising", "campaign", selectedId],
    queryFn: () => apiFetch(`/fundraising/campaigns/${selectedId}`),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    if (selectedCampaign.data) setForm(formFromCampaign(selectedCampaign.data));
  }, [selectedCampaign.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["fundraising"] });
  };

  const saveCampaign = useMutation({
    mutationFn: (payload) =>
      selectedId
        ? apiFetch(`/fundraising/campaigns/${selectedId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : apiFetch("/fundraising/campaigns", {
            method: "POST",
            body: JSON.stringify(payload),
          }),
    onSuccess: (campaign) => {
      toast.success(selectedId ? "Campaign updated" : "Campaign created");
      setSelectedId(campaign.id);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const launchCampaign = useMutation({
    mutationFn: () => apiFetch(`/fundraising/campaigns/${selectedId}/launch`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Campaign launched");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const archiveCampaign = useMutation({
    mutationFn: () => apiFetch(`/fundraising/campaigns/${selectedId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Campaign archived");
      setSelectedId(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const exportCsv = useMutation({
    mutationFn: () => apiFetch(`/fundraising/campaigns/${selectedId}/export.csv`),
    onSuccess: (data) => {
      const csv = data?.raw || "";
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(selectedCampaign.data?.name || "fundraising").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-contributions.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: (error) => toast.error(error.message),
  });

  const addOfflineDonation = useMutation({
    mutationFn: (payload) =>
      apiFetch(`/fundraising/campaigns/${selectedId}/offline-contributions`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success(offlineForm.is_match_pledge ? "Donor match added" : "Offline donation added");
      setOfflineForm(emptyOfflineDonation);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateGoal = (index, patch) => {
    setForm((current) => ({
      ...current,
      goals: current.goals.map((goal, idx) => (idx === index ? { ...goal, ...patch } : goal)),
    }));
  };

  const removeGoal = (index) => {
    setForm((current) => ({
      ...current,
      goals: current.goals.filter((_, idx) => idx !== index),
    }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      const result = await uploadPublicFile({
        bucket: "uploads",
        pathPrefix: "fundraising/campaigns",
        file,
      });
      setForm((current) => ({ ...current, photo_url: result.file_url }));
      toast.success("Campaign photo uploaded");
    } catch (error) {
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveCampaign.mutate({
      name: form.name,
      description: form.description,
      photo_url: form.photo_url,
      primary_goal_cents: dollarsToCents(form.primary_goal),
      goals: form.goals.map((goal, index) => ({
        label: goal.label,
        description: goal.description,
        amount_cents: dollarsToCents(goal.amount),
        sort_order: index,
      })),
    });
  };

  const handleOfflineSubmit = (event) => {
    event.preventDefault();
    addOfflineDonation.mutate({
      ...offlineForm,
      amount_cents: dollarsToCents(offlineForm.amount),
    });
  };

  const currentCampaign = selectedCampaign.data;
  const publicUrl = publicCampaignUrl(currentCampaign);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#2d4650] dark:text-slate-100">Fundraising Campaigns</h1>
          <p className="text-sm text-slate-500">Build public campaigns, collect contributions, and sync donors to the Relationship Manager.</p>
        </div>
        <Button
          type="button"
          className="bg-[#835879] text-white"
          onClick={() => {
            setSelectedId(null);
            setForm(emptyForm);
          }}
        >
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(campaigns.data || []).map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedId === campaign.id ? "border-[#835879] bg-[#835879]/5" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
                onClick={() => setSelectedId(campaign.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-xs text-slate-500">{formatMoney(campaign.paid_total_cents, campaign.currency)} raised</p>
                  </div>
                  <Badge>{campaign.status}</Badge>
                </div>
              </button>
            ))}
            {!campaigns.data?.length && <p className="text-sm text-slate-500">No fundraising campaigns yet.</p>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{selectedId ? currentCampaign?.name || "Edit campaign" : "Create campaign"}</CardTitle>
                {currentCampaign && <Badge>{currentCampaign.status}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {selectedId && selectedCampaign.isLoading ? (
                <p className="text-sm text-slate-500">Loading campaign...</p>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Campaign name</Label>
                        <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                      </div>
                      <div className="space-y-1">
                        <Label>Description</Label>
                        <Textarea
                          value={form.description}
                          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                          placeholder="Tell donors what this campaign supports."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Campaign photo URL</Label>
                        <Input value={form.photo_url} onChange={(event) => setForm((current) => ({ ...current, photo_url: event.target.value }))} placeholder="https://..." />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Primary goal ($)</Label>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            value={form.primary_goal}
                            onChange={(event) => setForm((current) => ({ ...current, primary_goal: event.target.value }))}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-xl border bg-slate-50 p-3 dark:bg-slate-900">
                      {form.photo_url ? (
                        <img src={form.photo_url} alt="" className="h-40 w-full rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-slate-500">
                          <Image className="h-6 w-6" />
                        </div>
                      )}
                      <Button type="button" variant="outline" disabled={uploading} onClick={() => document.getElementById("fundraising-photo-upload")?.click()}>
                        <Upload className="h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload photo"}
                      </Button>
                      <p className="text-xs text-slate-500">Ideal Size: 1600 x 900 px</p>
                      <input id="fundraising-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Secondary goals</Label>
                        <p className="text-xs text-slate-500">Shown after the primary goal is met.</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, goals: [...current.goals, { label: "", description: "", amount: "" }] }))}>
                        <Plus className="h-3 w-3" />
                        Add goal
                      </Button>
                    </div>
                    {form.goals.map((goal, index) => (
                      <div key={goal.id || index} className="grid gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-900 md:grid-cols-[1fr_140px_auto]">
                        <Input placeholder="Goal label" value={goal.label} onChange={(event) => updateGoal(index, { label: event.target.value })} />
                        <Input type="number" min="1" step="0.01" placeholder="Amount" value={goal.amount} onChange={(event) => updateGoal(index, { amount: event.target.value })} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeGoal(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        <Textarea className="md:col-span-3" placeholder="Optional description" value={goal.description} onChange={(event) => updateGoal(index, { description: event.target.value })} />
                      </div>
                    ))}
                    {!form.goals.length && <p className="text-sm text-slate-500">No secondary goals set.</p>}
                  </div>

                  {currentCampaign && <ProgressBar campaign={currentCampaign} />}

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" className="bg-[#835879] text-white" disabled={saveCampaign.isPending}>
                      {selectedId ? "Save campaign" : "Create campaign"}
                    </Button>
                    {currentCampaign?.status !== "launched" && selectedId && (
                      <Button type="button" variant="outline" onClick={() => launchCampaign.mutate()} disabled={launchCampaign.isPending}>
                        Launch
                      </Button>
                    )}
                    {publicUrl && currentCampaign?.status === "launched" && (
                      <>
                        <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success("Public link copied"))}>
                          <Copy className="h-4 w-4" />
                          Copy link
                        </Button>
                        <Button asChild type="button" variant="outline">
                          <a href={publicUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Open public page
                          </a>
                        </Button>
                      </>
                    )}
                    {selectedId && (
                      <Button type="button" variant="outline" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
                        Download CSV
                      </Button>
                    )}
                    {selectedId && (
                      <Button type="button" variant="destructive" onClick={() => archiveCampaign.mutate()} disabled={archiveCampaign.isPending}>
                        Archive
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {currentCampaign?.status === "launched" && (
            <Card>
              <CardHeader>
                <CardTitle>Add Offline Donation</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleOfflineSubmit}>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={offlineForm.amount}
                        onChange={(event) => setOfflineForm((current) => ({ ...current, amount: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>First name</Label>
                      <Input
                        value={offlineForm.first_name}
                        onChange={(event) => setOfflineForm((current) => ({ ...current, first_name: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Last name</Label>
                      <Input
                        value={offlineForm.last_name}
                        onChange={(event) => setOfflineForm((current) => ({ ...current, last_name: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={offlineForm.email}
                        onChange={(event) => setOfflineForm((current) => ({ ...current, email: event.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Donor message</Label>
                    <Textarea
                      value={offlineForm.donor_message}
                      onChange={(event) => setOfflineForm((current) => ({ ...current, donor_message: event.target.value }))}
                      placeholder="Optional public message unless anonymous is checked"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-start gap-2 rounded-xl border bg-slate-50 p-3 text-sm dark:bg-slate-900">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[#835879]"
                        checked={offlineForm.anonymous}
                        onChange={(event) => setOfflineForm((current) => ({ ...current, anonymous: event.target.checked }))}
                      />
                      <span>
                        <span className="font-medium">Anonymous donation</span>
                        <span className="mt-0.5 block text-xs text-slate-500">Message stays in reports but will not display publicly.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 rounded-xl border bg-slate-50 p-3 text-sm dark:bg-slate-900">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[#835879]"
                        checked={offlineForm.is_match_pledge}
                        onChange={(event) => setOfflineForm((current) => ({ ...current, is_match_pledge: event.target.checked }))}
                      />
                      <span>
                        <span className="font-medium">Donor Match</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Match pledges do not count upfront. They are applied as matching credit to later donations until the pool is used.
                        </span>
                      </span>
                    </label>
                  </div>
                  {offlineForm.is_match_pledge && (
                    <div className="space-y-1">
                      <Label>Match message</Label>
                      <Textarea
                        value={offlineForm.match_message}
                        onChange={(event) => setOfflineForm((current) => ({ ...current, match_message: event.target.value }))}
                        placeholder="The next $500 in donations will be matched thanks to..."
                        required
                      />
                      <p className="text-xs text-slate-500">
                        This banner displays publicly until the matching pool is fully used. Avoid adding offline donations during an active match unless they should consume the pool.
                      </p>
                    </div>
                  )}
                  <Button type="submit" className="bg-[#835879] text-white" disabled={addOfflineDonation.isPending}>
                    {addOfflineDonation.isPending ? "Saving..." : offlineForm.is_match_pledge ? "Add donor match" : "Add offline donation"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {currentCampaign && (
            <Card>
              <CardHeader>
                <CardTitle>Contribution Report</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-2">Donor</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Source</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Matched</th>
                      <th className="p-2">Message</th>
                      <th className="p-2">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentCampaign.contributions || []).map((contribution) => (
                      <tr key={contribution.id} className="border-t">
                        <td className="p-2">
                          <p className="font-medium">{contribution.first_name} {contribution.last_name}</p>
                          <p className="text-xs text-slate-500">{contribution.email}</p>
                        </td>
                        <td className="p-2">{formatMoney(contribution.amount_cents, contribution.currency)}</td>
                        <td className="p-2">
                          <Badge>{contribution.is_match_pledge ? "match pledge" : contribution.source || "stripe"}</Badge>
                        </td>
                        <td className="p-2"><Badge>{contribution.status}</Badge></td>
                        <td className="p-2">{contribution.matched_amount_cents ? formatMoney(contribution.matched_amount_cents, contribution.currency) : "—"}</td>
                        <td className="max-w-xs p-2 text-slate-600">
                          {contribution.donor_message || contribution.match_message || "—"}{contribution.anonymous ? " (anonymous)" : ""}
                        </td>
                        <td className="p-2 text-xs text-slate-500">{contribution.paid_at ? new Date(contribution.paid_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!currentCampaign.contributions?.length && <p className="py-4 text-sm text-slate-500">No contributions yet.</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
