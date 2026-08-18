import { createElement, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, Check, CheckCircle2, ClipboardCheck, Inbox, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function isOverdue(value) {
  if (!value) return false;
  const due = new Date(`${String(value).slice(0, 10)}T23:59:59.999`);
  return !Number.isNaN(due.getTime()) && due < new Date();
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric",
  }).format(date);
}

const KIND_LABELS = { task: "Task", review: "Needs review", update: "Update" };

function SummaryCard({ label, value, icon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>
        {createElement(icon, { className: `h-6 w-6 ${label === "Overdue" && value ? "text-red-500" : "text-[#835879]"}` })}
      </CardContent>
    </Card>
  );
}

export default function ActionCenter() {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();
  const actionQuery = useQuery({
    queryKey: ["action-center"],
    queryFn: () => apiFetch("/action-center"),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["action-center"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["marketstreet-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["marketstreet-campaign"] });
    queryClient.invalidateQueries({ queryKey: ["marketstreet-calendar"] });
  };

  const completeMutation = useMutation({
    mutationFn: (item) => item.entity_type === "marketing_deliverable"
      ? apiFetch(`/marketstreet/deliverables/${item.entity_id}`, {
        method: "PATCH", body: JSON.stringify({ status: "complete" }),
      })
      : apiFetch(`/tasks/${item.entity_id}/status`, {
        method: "PATCH", body: JSON.stringify({ status: "completed" }),
      }),
    onSuccess: (_, item) => { refresh(); toast.success(item.entity_type === "marketing_deliverable" ? "Marketing work completed" : "Task completed"); },
    onError: (error) => toast.error(error.message || "Task update failed"),
  });

  const readMutation = useMutation({
    mutationFn: (item) => apiFetch(`/notifications/${item.context.notification_id}/read`, { method: "POST" }),
    onSuccess: refresh,
    onError: (error) => toast.error(error.message || "Notification update failed"),
  });

  const summary = actionQuery.data?.summary || { total: 0, tasks: 0, reviews: 0, updates: 0, overdue: 0 };
  const visibleItems = useMemo(() => {
    const items = actionQuery.data?.items || [];
    return filter === "all" ? items : items.filter((item) => item.kind === filter);
  }, [actionQuery.data?.items, filter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-bold text-[#2d4650] dark:text-slate-100"><Inbox className="h-10 w-10" /> Action Center</h1>
            <p className="mt-2 text-slate-500">Your prioritized tasks, reviews, approvals, and updates.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => actionQuery.refetch()} disabled={actionQuery.isFetching}><RefreshCw className={`h-4 w-4 ${actionQuery.isFetching ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Total", summary.total, Inbox], ["Tasks", summary.tasks, CheckCircle2],
            ["Reviews", summary.reviews, ClipboardCheck], ["Updates", summary.updates, Bell],
            ["Overdue", summary.overdue, AlertTriangle],
          ].map(([label, value, icon]) => <SummaryCard key={label} label={label} value={value} icon={icon} />)}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <CardTitle>What needs attention</CardTitle>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="task">Tasks</TabsTrigger><TabsTrigger value="review">Reviews</TabsTrigger><TabsTrigger value="update">Updates</TabsTrigger></TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionQuery.isError ? (
              <div className="py-12 text-center"><AlertTriangle className="mx-auto mb-3 h-9 w-9 text-red-500" /><p className="font-medium">Action Center could not be loaded.</p><Button className="mt-4" variant="outline" onClick={() => actionQuery.refetch()}>Try again</Button></div>
            ) : actionQuery.isLoading ? (
              <p className="py-12 text-center text-slate-500">Loading actions…</p>
            ) : visibleItems.length === 0 ? (
              <div className="py-14 text-center"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" /><p className="font-medium">You’re all caught up.</p><p className="text-sm text-slate-500">No items match this view.</p></div>
            ) : visibleItems.map((item) => {
              const overdue = isOverdue(item.due_at);
              return (
                <div key={item.key} className={`flex flex-col gap-4 rounded-xl border bg-white p-4 dark:bg-slate-900 md:flex-row md:items-center ${overdue ? "border-red-300" : "border-slate-200 dark:border-slate-800"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Badge variant={item.kind === "review" ? "default" : "secondary"}>{KIND_LABELS[item.kind]}</Badge>{overdue && <Badge variant="destructive">Overdue</Badge>}{item.due_at && <span className="text-xs text-slate-500">Due {formatDate(item.due_at)}</span>}</div>
                    <h2 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{item.title}</h2>
                    {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
                    {item.context?.event_title && <p className="mt-1 text-xs text-slate-400">Event: {item.context.event_title}</p>}
                    {item.context?.campaign_title && <p className="mt-1 text-xs text-slate-400">Campaign: {item.context.campaign_title}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {item.kind === "task" && <Button size="sm" className="gap-2" onClick={() => completeMutation.mutate(item)} disabled={completeMutation.isPending}><Check className="h-4 w-4" /> Complete</Button>}
                    {item.kind === "update" && <Button size="sm" variant="outline" onClick={() => readMutation.mutate(item)} disabled={readMutation.isPending}>Mark read</Button>}
                    <Button asChild size="sm" variant={item.kind === "review" ? "default" : "outline"}><Link to={item.link || "/"}>Open</Link></Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
