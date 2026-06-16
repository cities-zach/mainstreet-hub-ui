import React, { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart, Image } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function money(cents, currency = "usd", digits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: digits,
  }).format(Number(cents || 0) / 100);
}

export default function FundraisingPublic() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    amount: "25",
    first_name: "",
    last_name: "",
    email: "",
    donor_message: "",
    anonymous: false,
  });

  const campaignQuery = useQuery({
    queryKey: ["public-fundraising", slug],
    queryFn: () => apiFetch(`/fundraising/public/${slug}`),
    enabled: Boolean(slug),
    retry: false,
  });
  const checkout = useMutation({
    mutationFn: (payload) =>
      apiFetch(`/fundraising/public/${slug}/checkout`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      if (res?.url) window.location.href = res.url;
    },
    onError: (error) => toast.error(error.message),
  });

  const data = campaignQuery.data;
  const campaign = data?.campaign;
  const percent = Math.min(100, data?.percent || 0);
  const activeGoal = data?.active_goal;
  const goals = useMemo(() => {
    if (!campaign) return [];
    return [
      { id: "primary", label: "Primary goal", amount_cents: campaign.primary_goal_cents },
      ...(campaign.goals || []),
    ].sort((a, b) => a.amount_cents - b.amount_cents);
  }, [campaign]);

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));
  const submit = (event) => {
    event.preventDefault();
    checkout.mutate(form);
  };

  if (campaignQuery.isLoading) {
    return <div className="min-h-screen bg-slate-50 p-6 text-slate-900">Loading campaign...</div>;
  }
  if (campaignQuery.error || !campaign) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <Card className="mx-auto mt-12 max-w-xl">
          <CardContent className="p-6">
            <h1 className="text-xl font-semibold">Campaign not available</h1>
            <p className="mt-2 text-sm text-slate-500">This campaign may not be launched yet, or the link may be incorrect.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="bg-white shadow-sm dark:bg-slate-900">
        {campaign.photo_url ? (
          <img src={campaign.photo_url} alt="" className="h-64 w-full object-cover md:h-80" />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Image className="h-10 w-10" />
          </div>
        )}
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#835879]/10 px-3 py-1 text-sm font-medium text-[#835879]">
            <Heart className="h-4 w-4" />
            Fundraising campaign
          </div>
          <h1 className="mt-4 text-3xl font-bold md:text-5xl">{campaign.name}</h1>
          {campaign.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-slate-600 dark:text-slate-300">{campaign.description}</p>}
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          {params.get("thanks") === "1" && (
            <Card className="border-emerald-200 bg-emerald-50 text-emerald-900">
              <CardContent className="p-4 text-sm">Thank you for your contribution. Progress updates after Stripe confirms the payment.</CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-3xl font-bold text-[#835879]">{money(data.paid_total_cents, campaign.currency)}</p>
                  <p className="text-sm text-slate-500">raised toward {money(activeGoal?.amount_cents, campaign.currency)}</p>
                </div>
                <p className="text-sm font-medium text-slate-500">{percent}%</p>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-[#835879]" style={{ width: `${percent}%` }} />
              </div>
              {goals.length > 1 && (
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {goals.map((goal) => (
                    <div key={goal.id} className={`rounded-xl border p-3 ${activeGoal?.amount_cents === goal.amount_cents ? "border-[#835879] bg-[#835879]/5" : "bg-white dark:bg-slate-950"}`}>
                      <p className="font-medium">{goal.label || "Stretch goal"}</p>
                      <p className="text-slate-500">{money(goal.amount_cents, campaign.currency)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {data.donor_messages?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Donor Messages</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {data.donor_messages.map((message, index) => (
                  <blockquote key={`${message.name}-${index}`} className="rounded-xl border bg-white p-4 text-sm dark:bg-slate-950">
                    <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">&ldquo;{message.message}&rdquo;</p>
                    <footer className="mt-3 font-medium text-[#835879]">- {message.name}</footer>
                  </blockquote>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Make a Contribution</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={submit}>
                <div className="space-y-1">
                  <Label>Amount ($)</Label>
                  <Input type="number" min="1" step="0.01" value={form.amount} onChange={(event) => update({ amount: event.target.value })} required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="space-y-1">
                    <Label>First name</Label>
                    <Input value={form.first_name} onChange={(event) => update({ first_name: event.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Last name</Label>
                    <Input value={form.last_name} onChange={(event) => update({ last_name: event.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(event) => update({ email: event.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>Donor message</Label>
                  <Textarea value={form.donor_message} onChange={(event) => update({ donor_message: event.target.value })} placeholder="Optional message of support" />
                </div>
                <label className="flex items-start gap-2 rounded-xl border bg-slate-50 p-3 text-sm dark:bg-slate-900">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#835879]" checked={form.anonymous} onChange={(event) => update({ anonymous: event.target.checked })} />
                  <span>
                    <span className="font-medium">Keep my contribution anonymous</span>
                    <span className="mt-0.5 block text-xs text-slate-500">Your message will still be included in internal reports, but not shown publicly.</span>
                  </span>
                </label>
                <Button type="submit" className="w-full bg-[#835879] text-white" disabled={checkout.isPending}>
                  {checkout.isPending ? "Opening Stripe..." : "Contribute with Stripe"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
