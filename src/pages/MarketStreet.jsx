import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import {
  Archive, ArchiveRestore, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  CircleAlert, Clock3, ExternalLink, FileText, FolderKanban, LayoutDashboard,
  Link2, Megaphone, Pencil, Plus, Send, Settings2, Store, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import CampaignWizard from "@/components/marketstreet/CampaignWizard";
import PublicationPlanner from "@/components/marketstreet/PublicationPlanner";

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  not_started: "border-slate-200 bg-slate-50 text-slate-700",
  idea: "border-violet-200 bg-violet-50 text-violet-800",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  review: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  approved: "border-teal-200 bg-teal-50 text-teal-800",
  ready: "border-cyan-200 bg-cyan-50 text-cyan-800",
  planned: "border-violet-200 bg-violet-50 text-violet-800",
  scheduled: "border-blue-200 bg-blue-50 text-blue-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
};

const EMPTY_CONTENT = {
  title: "", body: "", campaign_id: "none", content_type: "social_post", status: "idea",
  publications: [], removed_publication_ids: [], default_date: "",
  resource: { provider: "canva", title: "", url: "" },
};
const EMPTY_SCHEDULE = { publications: [], default_date: "" };
const EMPTY_RESOURCE = { provider: "canva", title: "", url: "" };

function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] || "bg-slate-50 text-slate-700"}>
      {String(status || "unknown").replaceAll("_", " ")}
    </Badge>
  );
}

function safeDate(value, pattern = "MMM d") {
  if (!value) return "Not set";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : format(date, pattern);
}

function EmptyState({ icon: Icon = FileText, title, detail, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
      {React.createElement(Icon, { className: "mx-auto mb-3 h-9 w-9 text-slate-400" })}
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{detail}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note, accent = "violet" }) {
  const accents = {
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  };
  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardContent className="flex items-start justify-between p-5">
        <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{value ?? 0}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>
        <span className={`rounded-xl p-2.5 ${accents[accent]}`}>{React.createElement(Icon, { className: "h-5 w-5" })}</span>
      </CardContent>
    </Card>
  );
}

export default function MarketStreet() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [requestView, setRequestView] = useState("active");
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [contentForm, setContentForm] = useState(EMPTY_CONTENT);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE);
  const [resourceTarget, setResourceTarget] = useState(null);
  const [resourceForm, setResourceForm] = useState(EMPTY_RESOURCE);
  const [channelOpen, setChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState("");

  const calendarRange = useMemo(() => ({
    from: format(startOfWeek(startOfMonth(month)), "yyyy-MM-dd"),
    to: format(endOfWeek(endOfMonth(month)), "yyyy-MM-dd"),
  }), [month]);

  const overview = useQuery({ queryKey: ["marketstreet-overview"], queryFn: () => apiFetch("/marketstreet/overview") });
  const channels = useQuery({ queryKey: ["marketstreet-channels"], queryFn: () => apiFetch("/marketstreet/channels") });
  const campaigns = useQuery({ queryKey: ["marketstreet-campaigns"], queryFn: () => apiFetch("/marketstreet/campaigns") });
  const content = useQuery({ queryKey: ["marketstreet-content"], queryFn: () => apiFetch("/marketstreet/content") });
  const resources = useQuery({ queryKey: ["marketstreet-resources"], queryFn: () => apiFetch("/marketstreet/resources") });
  const requests = useQuery({
    queryKey: ["marketing_requests", requestView],
    queryFn: () => apiFetch(`/marketing-requests?view=${requestView}`),
  });
  const legacy = useQuery({ queryKey: ["marketstreet-legacy"], queryFn: () => apiFetch("/marketstreet/legacy-reconciliation") });
  const calendar = useQuery({
    queryKey: ["marketstreet-calendar", calendarRange.from, calendarRange.to],
    queryFn: () => apiFetch(`/marketstreet/calendar?from=${calendarRange.from}&to=${calendarRange.to}`),
  });

  const refresh = () => {
    for (const key of ["marketstreet-overview", "marketstreet-campaigns", "marketstreet-content", "marketstreet-calendar", "marketstreet-resources", "marketstreet-legacy", "marketing_requests"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const createCampaign = useMutation({
    mutationFn: (payload) => apiFetch("/marketstreet/campaign-builder", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (result) => {
      refresh();
      setCampaignOpen(false);
      setActiveTab("campaigns");
      const placements = (result.content_items || []).reduce((total, item) => total + (item.publications?.length || 0), 0);
      toast.success(`Campaign created with ${result.content_items?.length || 0} content item${result.content_items?.length === 1 ? "" : "s"}${placements ? ` and ${placements} scheduled placement${placements === 1 ? "" : "s"}` : ""}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const createContent = useMutation({
    mutationFn: () => apiFetch(editTarget ? `/marketstreet/content/${editTarget.id}/plan` : "/marketstreet/content-plan", {
      method: editTarget ? "PATCH" : "POST", body: JSON.stringify({
        ...contentForm,
        campaign_id: contentForm.campaign_id === "none" ? null : contentForm.campaign_id,
        publications: contentForm.publications.map((publication) => ({
          id: publication.id || undefined,
          channel_id: publication.channel_id,
          planned_at: publication.planned_at,
          status: publication.status,
        })),
        resource: !editTarget && contentForm.resource.url.trim()
          ? { ...contentForm.resource, title: contentForm.resource.title.trim() || contentForm.title.trim() }
          : undefined,
      }),
    }),
    onSuccess: (result) => { refresh(); setContentOpen(false); setEditTarget(null); setContentForm(EMPTY_CONTENT); toast.success(editTarget ? "Content and publication schedule updated" : `Content created${result.publications?.length ? ` with ${result.publications.length} publication${result.publications.length === 1 ? "" : "s"}` : ""}`); },
    onError: (error) => toast.error(error.message),
  });
  const createPublication = useMutation({
    mutationFn: () => apiFetch("/marketstreet/publications/bulk", {
      method: "POST", body: JSON.stringify({ ...scheduleForm, content_item_id: scheduleTarget.id }),
    }),
    onSuccess: (result) => { refresh(); setScheduleTarget(null); setScheduleForm(EMPTY_SCHEDULE); toast.success(`${result.length} channel${result.length === 1 ? "" : "s"} added to the calendar`); },
    onError: (error) => toast.error(error.message),
  });
  const updatePublication = useMutation({
    mutationFn: ({ id, ...body }) => apiFetch(`/marketstreet/publications/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { refresh(); toast.success("Publication status updated"); },
    onError: (error) => toast.error(error.message),
  });
  const lifecycle = useMutation({
    mutationFn: ({ action, ids }) => apiFetch(`/marketstreet/requests/${action}`, { method: "POST", body: JSON.stringify({ ids }) }),
    onSuccess: (_, variables) => { refresh(); setSelectedRequestIds([]); toast.success(variables.action === "archive" ? "Requests archived" : "Requests restored"); },
    onError: (error) => toast.error(error.message),
  });
  const trashRequest = useMutation({
    mutationFn: (id) => apiFetch(`/marketing-requests/${id}`, { method: "DELETE" }),
    onSuccess: () => { refresh(); toast.success("Request moved to trash"); },
    onError: (error) => toast.error(error.message),
  });
  const convertRequest = useMutation({
    mutationFn: (id) => apiFetch(`/marketstreet/requests/${id}/convert`, { method: "POST" }),
    onSuccess: () => { refresh(); toast.success("Request converted to a campaign"); setActiveTab("campaigns"); },
    onError: (error) => toast.error(error.message),
  });
  const updateChannel = useMutation({
    mutationFn: ({ id, ...body }) => apiFetch(`/marketstreet/channels/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketstreet-channels"] }); toast.success("Channel updated"); },
    onError: (error) => toast.error(error.message),
  });
  const createChannel = useMutation({
    mutationFn: () => apiFetch("/marketstreet/channels", { method: "POST", body: JSON.stringify({ name: channelName, slug: channelName, channel_type: "social" }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketstreet-channels"] }); setChannelName(""); setChannelOpen(false); toast.success("Channel added"); },
    onError: (error) => toast.error(error.message),
  });
  const addResource = useMutation({
    mutationFn: () => apiFetch("/marketstreet/resources", {
      method: "POST", body: JSON.stringify({ ...resourceForm, content_item_id: resourceTarget.id }),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketstreet-resources"] }); setResourceTarget(null); setResourceForm(EMPTY_RESOURCE); toast.success("Resource linked"); },
    onError: (error) => toast.error(error.message),
  });

  const enabledChannels = (channels.data || []).filter((channel) => channel.is_enabled);
  const publicationCount = (content.data || []).reduce((total, item) => total + (item.publications?.length || 0), 0);
  const activeRequests = requests.data || [];
  const selectedDayItems = (calendar.data || []).filter((item) => isSameDay(new Date(item.starts_at), selectedDay));
  const openContentComposer = (day = null) => {
    setEditTarget(null);
    setContentForm({
      ...EMPTY_CONTENT,
      resource: { ...EMPTY_CONTENT.resource },
      publications: [],
      removed_publication_ids: [],
      default_date: format(day || new Date(), "yyyy-MM-dd"),
    });
    setContentOpen(true);
  };
  const openContentEditor = (item) => {
    setEditTarget(item);
    const editablePublications = (item.publications || []).filter((publication) => publication.status !== "published").map((publication) => ({
      id: publication.id,
      client_id: publication.id,
      channel_id: publication.channel_id,
      planned_at: format(new Date(publication.planned_at), "yyyy-MM-dd'T'HH:mm"),
      status: ["planned", "ready", "scheduled", "failed"].includes(publication.status) ? publication.status : "planned",
    }));
    setContentForm({
      ...EMPTY_CONTENT,
      title: item.title || "",
      body: item.body || "",
      campaign_id: item.campaign_id || "none",
      content_type: item.content_type || "social_post",
      status: item.status || "idea",
      publications: editablePublications,
      removed_publication_ids: [],
      default_date: editablePublications[0]?.planned_at?.slice(0, 10) || format(new Date(), "yyyy-MM-dd"),
      resource: { ...EMPTY_CONTENT.resource },
    });
    setContentOpen(true);
  };
  const updateContentPublications = (publications) => setContentForm((current) => {
    const nextIds = new Set(publications.map((publication) => publication.id).filter(Boolean));
    const newlyRemoved = current.publications
      .filter((publication) => publication.id && !nextIds.has(publication.id))
      .map((publication) => publication.id);
    return {
      ...current,
      publications,
      removed_publication_ids: [...new Set([...current.removed_publication_ids, ...newlyRemoved])],
    };
  });

  return (
    <div className="min-h-screen bg-[#f5f4f1] px-4 py-5 dark:bg-slate-950 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl bg-[#2d4650] text-white shadow-xl">
          <div className="relative px-6 py-7 md:px-9 md:py-9">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#835879]/50 blur-2xl" />
            <div className="absolute bottom-0 right-40 h-28 w-28 rounded-full bg-amber-300/10 blur-xl" />
            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-200"><Store className="h-4 w-4" /> MarketStreet</div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Marketing Hub</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">Plan and manage Main Street&apos;s marketing in one place.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" className="bg-white text-[#2d4650] hover:bg-slate-100" onClick={() => openContentComposer()}><Plus /> New content</Button>
                <Button className="bg-[#835879] text-white hover:bg-[#704a67]" onClick={() => setCampaignOpen(true)}><Megaphone /> New campaign</Button>
                <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link to="/marketstreet/new"><FileText /> New request</Link></Button>
              </div>
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 max-w-full">
          <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" />Calendar</TabsTrigger>
            <TabsTrigger value="campaigns"><FolderKanban className="mr-2 h-4 w-4" />Campaigns</TabsTrigger>
            <TabsTrigger value="content"><Send className="mr-2 h-4 w-4" />Content <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{publicationCount}</span></TabsTrigger>
            <TabsTrigger value="requests"><FileText className="mr-2 h-4 w-4" />Requests <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">{overview.data?.requests?.pending || 0}</span></TabsTrigger>
            <TabsTrigger value="channels"><Settings2 className="mr-2 h-4 w-4" />Channels</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={FolderKanban} label="Active campaigns" value={overview.data?.campaigns?.active} note={`${overview.data?.campaigns?.draft || 0} draft campaigns`} accent="violet" />
              <MetricCard icon={FileText} label="Pending requests" value={overview.data?.requests?.pending} note={`${overview.data?.requests?.active || 0} in the active queue`} accent="amber" />
              <MetricCard icon={Clock3} label="Open deliverables" value={overview.data?.deliverables?.open} note={`${overview.data?.deliverables?.overdue || 0} overdue`} accent="blue" />
              <MetricCard icon={CheckCircle2} label="Published this month" value={overview.data?.publications?.published_this_month} note={`${overview.data?.publications?.scheduled || 0} confirmed scheduled`} accent="emerald" />
            </div>
            {(overview.data?.deliverables?.overdue || 0) > 0 && (
              <button onClick={() => setActiveTab("calendar")} className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-left text-amber-950 hover:bg-amber-100">
                <span className="flex items-center gap-3"><CircleAlert className="h-5 w-5" /><span><strong>{overview.data.deliverables.overdue} marketing deadline{overview.data.deliverables.overdue === 1 ? " is" : "s are"} overdue.</strong><span className="ml-2 text-sm text-amber-800">Open the calendar to rebalance the work.</span></span></span>
                <ChevronRight />
              </button>
            )}
            <div className="min-w-0">
              <Card className="min-w-0 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <CardHeader><CardTitle>Next on the calendar</CardTitle><CardDescription>Planned posts awaiting production or scheduling confirmation.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {(overview.data?.upcoming || []).length === 0 ? <EmptyState icon={CalendarDays} title="Nothing scheduled yet" detail="Create content and choose its channels and planned time together." action={<Button onClick={() => openContentComposer()}><Plus /> Create content</Button>} /> :
                    overview.data.upcoming.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex min-w-0 items-center gap-3"><span className="h-10 w-1 rounded-full" style={{ backgroundColor: item.color }} /><div className="min-w-0"><p className="truncate font-semibold text-slate-900 dark:text-white">{item.title}</p><p className="truncate text-sm text-slate-500">{item.channel_name}{item.campaign_title ? ` · ${item.campaign_title}` : ""}</p></div></div>
                        <div className="shrink-0 text-right"><p className="text-sm font-semibold">{safeDate(item.planned_at)}</p><StatusBadge status={item.status} /></div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_340px]">
              <Card className="min-w-0 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>{format(month, "MMMM yyyy")}</CardTitle><CardDescription>Posts, deliverable deadlines, and request due dates in one view.</CardDescription></div><div className="flex gap-2"><Button size="icon" variant="outline" aria-label="Previous month" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft /></Button><Button variant="outline" onClick={() => { setMonth(startOfMonth(new Date())); setSelectedDay(new Date()); }}>Today</Button><Button size="icon" variant="outline" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button></div></CardHeader>
                <CardContent className="overflow-x-auto">
                  <div className="grid min-w-[700px] grid-cols-7 border-l border-t border-slate-200 dark:border-slate-800">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950">{day}</div>)}
                    {eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }).map((day) => {
                      const items = (calendar.data || []).filter((item) => isSameDay(new Date(item.starts_at), day));
                      return <button key={day.toISOString()} onClick={() => setSelectedDay(day)} className={`min-h-28 border-b border-r border-slate-200 p-2 text-left align-top transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950 ${isSameDay(day, selectedDay) ? "bg-violet-50 ring-1 ring-inset ring-[#835879] dark:bg-violet-950/30" : ""}`}><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${!isSameMonth(day, month) ? "text-slate-300" : isSameDay(day, new Date()) ? "bg-[#2d4650] text-white" : "text-slate-700 dark:text-slate-200"}`}>{format(day, "d")}</span><div className="mt-1 space-y-1">{items.slice(0, 3).map((item) => <div key={`${item.item_type}-${item.id}`} className="truncate rounded px-1.5 py-1 text-[11px] font-medium text-white" style={{ backgroundColor: item.color || "#64748B" }}>{item.item_type === "deadline" ? "Due · " : item.item_type === "request_deadline" ? "Request · " : ""}{item.title}</div>)}{items.length > 3 && <p className="px-1 text-[10px] font-semibold text-slate-500">+{items.length - 3} more</p>}</div></button>;
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card className="h-fit min-w-0 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <CardHeader><CardTitle>{format(selectedDay, "EEEE, MMMM d")}</CardTitle><CardDescription>{selectedDayItems.length} item{selectedDayItems.length === 1 ? "" : "s"} planned.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {selectedDayItems.length === 0 ? <EmptyState icon={CalendarDays} title="Open day" detail="Create content with this date already selected." action={<Button onClick={() => openContentComposer(selectedDay)}><Plus /> Add content for this day</Button>} /> : selectedDayItems.map((item) => (
                    <div key={`${item.item_type}-${item.id}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div className="mb-2 flex items-start justify-between gap-3"><p className="font-semibold">{item.title}</p><StatusBadge status={item.status} /></div><p className="text-sm text-slate-500">{item.channel_name}{item.campaign_title ? ` · ${item.campaign_title}` : ""}</p>{item.item_type === "publication" && item.status !== "published" && <div className="mt-3 flex flex-wrap gap-2">{item.status !== "scheduled" && <Button size="sm" variant="outline" onClick={() => updatePublication.mutate({ id: item.id, status: "scheduled", scheduled_at: item.starts_at })}>Confirm scheduled</Button>}<Button size="sm" onClick={() => updatePublication.mutate({ id: item.id, status: "published", published_at: new Date().toISOString() })}>Mark published</Button></div>}</div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6 space-y-4">
            <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Campaigns</h2><p className="text-sm text-slate-500">The umbrella for requests, deliverables, content, and channel plans.</p></div><Button onClick={() => setCampaignOpen(true)}><Plus /> New campaign</Button></div>
            {(campaigns.data || []).length === 0 ? <EmptyState icon={FolderKanban} title="No campaigns yet" detail="Create one from scratch or convert an incoming request." action={<Button onClick={() => setCampaignOpen(true)}><Plus /> Create campaign</Button>} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{campaigns.data.map((campaign) => <Card key={campaign.id} className="border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="leading-6">{campaign.title}</CardTitle><StatusBadge status={campaign.status} /></div><CardDescription>{campaign.description || campaign.objective || "No campaign brief yet."}</CardDescription></CardHeader><CardContent><div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-950"><div><p className="text-lg font-bold">{campaign.deliverable_count}</p><p className="text-[11px] text-slate-500">Deliverables</p></div><div><p className="text-lg font-bold">{campaign.publication_count}</p><p className="text-[11px] text-slate-500">Posts</p></div><div><p className="text-lg font-bold text-blue-700">{campaign.scheduled_count}</p><p className="text-[11px] text-slate-500">Scheduled</p></div></div><div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>{campaign.owner_name || "Unassigned"}</span><span>{campaign.start_date ? `${safeDate(campaign.start_date)}${campaign.end_date ? ` – ${safeDate(campaign.end_date)}` : ""}` : "Dates not set"}</span></div></CardContent></Card>)}</div>}
          </TabsContent>

          <TabsContent value="content" className="mt-6 space-y-4">
            <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Content studio</h2><p className="text-sm text-slate-500">Create, edit, and repeat content across channels with a publication time for every post.</p></div><Button onClick={() => openContentComposer()}><Plus /> New content</Button></div>
            {(content.data || []).length === 0 ? <EmptyState icon={Send} title="Your content pipeline is empty" detail="Start with an idea, draft the copy, and schedule it to one or more channels." action={<Button onClick={() => openContentComposer()}><Plus /> Add an idea</Button>} /> : <div className="space-y-4">{content.data.map((item) => {
              const linked = (resources.data || []).filter((resource) => resource.content_item_id === item.id);
              return <Card key={item.id} className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.title}</h3><StatusBadge status={item.status} />{item.campaign_title && <Badge variant="secondary">{item.campaign_title}</Badge>}</div>{item.body && <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>}<div className="mt-3 flex flex-wrap gap-2">{linked.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"><Link2 className="h-3 w-3" />{resource.provider.replaceAll("_", " ")} · {resource.title}<ExternalLink className="h-3 w-3" /></a>)}</div></div><div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" onClick={() => openContentEditor(item)}><Pencil /> Edit</Button><Button variant="outline" onClick={() => { setResourceTarget(item); setResourceForm({ ...EMPTY_RESOURCE, title: item.title }); }}><Link2 /> Attach source</Button><Button onClick={() => { setScheduleTarget(item); setScheduleForm({ ...EMPTY_SCHEDULE, publications: [], default_date: format(new Date(), "yyyy-MM-dd") }); }}><CalendarDays /> Add publication</Button></div></div><div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">{(item.publications || []).length === 0 ? <span className="text-sm text-slate-400">Not on the calendar yet.</span> : item.publications.map((publication) => <span key={publication.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: publication.channel_color }} /><strong>{publication.channel_name}</strong><span className="text-slate-500">{safeDate(publication.planned_at, "MMM d · h:mm a")}</span><StatusBadge status={publication.status} /></span>)}</div></CardContent></Card>;
            })}</div>}
          </TabsContent>

          <TabsContent value="requests" className="mt-6 space-y-4">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Request inbox</h2><p className="text-sm text-slate-500">Triage new work without letting old event-plan imports overwhelm the queue.</p></div><div className="flex flex-wrap gap-2"><Select value={requestView} onValueChange={(value) => { setRequestView(value); setSelectedRequestIds([]); }}><SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="trash">Trash</SelectItem></SelectContent></Select>{selectedRequestIds.length > 0 && requestView === "active" && <Button variant="outline" onClick={() => lifecycle.mutate({ action: "archive", ids: selectedRequestIds })}><Archive /> Archive {selectedRequestIds.length}</Button>}{selectedRequestIds.length > 0 && requestView !== "active" && <Button variant="outline" onClick={() => lifecycle.mutate({ action: "restore", ids: selectedRequestIds })}><ArchiveRestore /> Restore {selectedRequestIds.length}</Button>}<Button asChild><Link to="/marketstreet/new"><Plus /> New request</Link></Button></div></div>
            {requestView === "active" && (legacy.data?.duplicate_groups?.length > 0 || legacy.data?.older_than_180_days > 0) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><div className="flex gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Legacy cleanup is ready</p><p className="mt-1 text-sm text-amber-800">{legacy.data.older_than_180_days || 0} active requests are older than 180 days and {legacy.data.duplicate_groups?.length || 0} duplicate event groups need review. Select confirmed old records below and archive them in one recoverable action.</p></div></div></div>}
            {activeRequests.length === 0 ? <EmptyState icon={FileText} title={`No ${requestView} requests`} detail={requestView === "active" ? "The intake queue is clear." : "Nothing is stored in this view."} /> : <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-0"><div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800"><Checkbox checked={selectedRequestIds.length === activeRequests.length && activeRequests.length > 0} onCheckedChange={(checked) => setSelectedRequestIds(checked ? activeRequests.map((item) => item.id) : [])} /><span className="text-sm font-semibold text-slate-600">Select all {activeRequests.length}</span></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{activeRequests.map((item) => <div key={item.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center"><Checkbox checked={selectedRequestIds.includes(item.id)} onCheckedChange={(checked) => setSelectedRequestIds((current) => checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link to={`/marketstreet/request?id=${item.id}`} className="font-semibold text-slate-900 hover:text-[#835879] dark:text-white">{item.event_name || "Untitled request"}</Link><StatusBadge status={item.status} />{item.source_type === "event_plan" && <Badge variant="secondary">Event plan</Badge>}</div><p className="mt-1 line-clamp-1 text-sm text-slate-500">{item.content_description || "No description"}</p></div><div className="grid grid-cols-2 gap-4 text-sm lg:w-72"><div><p className="text-xs uppercase text-slate-400">Event</p><p className="font-medium">{safeDate(item.event_start_date)}</p></div><div><p className="text-xs uppercase text-slate-400">Requested by</p><p className="truncate font-medium">{item.requested_by_name}</p></div></div><div className="flex shrink-0 gap-2">{requestView === "active" && <><Button size="sm" onClick={() => convertRequest.mutate(item.id)}>Convert</Button><Button size="icon" variant="outline" aria-label="Archive request" onClick={() => lifecycle.mutate({ action: "archive", ids: [item.id] })}><Archive /></Button><Button size="icon" variant="outline" aria-label="Move request to trash" onClick={() => trashRequest.mutate(item.id)}><Trash2 /></Button></>}{requestView !== "active" && <Button size="sm" variant="outline" onClick={() => lifecycle.mutate({ action: "restore", ids: [item.id] })}><ArchiveRestore /> Restore</Button>}</div></div>)}</div></CardContent></Card>}
          </TabsContent>

          <TabsContent value="channels" className="mt-6 space-y-4">
            <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Channels</h2><p className="text-sm text-slate-500">Choose the platforms MarketStreet plans and reports against.</p></div><Button onClick={() => setChannelOpen(true)}><Plus /> Add channel</Button></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(channels.data || []).map((channel) => <Card key={channel.id} className={`border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${channel.is_enabled ? "" : "opacity-60"}`}><CardContent className="flex items-center justify-between gap-4 p-5"><div className="flex items-center gap-3"><span className="h-11 w-2 rounded-full" style={{ backgroundColor: channel.color }} /><div><p className="font-bold text-slate-900 dark:text-white">{channel.name}</p><p className="text-sm capitalize text-slate-500">{channel.channel_type}{channel.platform ? ` · ${channel.platform}` : ""}</p></div></div><div className="text-right"><Switch aria-label={`Enable ${channel.name}`} checked={channel.is_enabled} onCheckedChange={(checked) => updateChannel.mutate({ id: channel.id, is_enabled: checked })} /><p className="mt-1 text-[11px] text-slate-400">{channel.is_enabled ? "Enabled" : "Paused"}</p></div></CardContent></Card>)}</div>
            <Card className="border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30"><CardContent className="flex gap-3 p-5"><Link2 className="mt-0.5 h-5 w-5 text-violet-700" /><div><p className="font-semibold text-violet-950 dark:text-violet-100">Connections are intentionally link-first</p><p className="mt-1 text-sm leading-6 text-violet-800 dark:text-violet-300">Canva, Google Drive, and Document Center items can be attached to content today. Direct publishing credentials can be added later without changing the planning workflow or exposing them in spreadsheets.</p></div></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {campaignOpen && <CampaignWizard open={campaignOpen} onOpenChange={setCampaignOpen} channels={enabledChannels} onSubmit={(payload) => createCampaign.mutate(payload)} isPending={createCampaign.isPending} />}

      <Dialog open={contentOpen} onOpenChange={(open) => { setContentOpen(open); if (!open) { setEditTarget(null); setContentForm(EMPTY_CONTENT); } }}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editTarget ? "Edit content" : "New content"}</DialogTitle><DialogDescription>{editTarget ? "Update the copy and every upcoming publication in one place." : "Write the content, attach its source, and plan each publication."}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="content-title">Title</Label><Input id="content-title" className="mt-1" value={contentForm.title} onChange={(event) => setContentForm({ ...contentForm, title: event.target.value })} placeholder="Volunteer spotlight: August" /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="content-campaign">Campaign</Label><Select value={contentForm.campaign_id} onValueChange={(value) => setContentForm({ ...contentForm, campaign_id: value })}><SelectTrigger id="content-campaign" className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No campaign</SelectItem>{(campaigns.data || []).map((campaign) => <SelectItem key={campaign.id} value={campaign.id}>{campaign.title}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="content-status">Content status</Label><Select value={contentForm.status} onValueChange={(value) => setContentForm({ ...contentForm, status: value })}><SelectTrigger id="content-status" className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="idea">Idea</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="retired">Retired</SelectItem></SelectContent></Select></div></div>
            <div><Label htmlFor="content-copy">Working copy</Label><Textarea id="content-copy" className="mt-1 min-h-28" value={contentForm.body} onChange={(event) => setContentForm({ ...contentForm, body: event.target.value })} placeholder="Draft the shared message here…" /></div>
            {!editTarget && <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center gap-2"><Link2 className="h-4 w-4 text-[#835879]" /><p className="text-sm font-semibold">Working source <span className="font-normal text-slate-400">(optional)</span></p></div>
              <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="content-source-provider">Provider</Label><Select value={contentForm.resource.provider} onValueChange={(value) => setContentForm({ ...contentForm, resource: { ...contentForm.resource, provider: value } })}><SelectTrigger id="content-source-provider" className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="canva">Canva</SelectItem><SelectItem value="google_drive">Google Drive</SelectItem><SelectItem value="document_center">Document Center</SelectItem><SelectItem value="web">Web link</SelectItem></SelectContent></Select></div><div><Label htmlFor="content-source-url">Source URL</Label><Input id="content-source-url" className="mt-1" type="url" value={contentForm.resource.url} onChange={(event) => setContentForm({ ...contentForm, resource: { ...contentForm.resource, url: event.target.value } })} placeholder="https://…" /></div></div>
            </div>}
            {editTarget && (editTarget.publications || []).some((publication) => publication.status === "published") && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Published posts remain in the history and cannot be rescheduled here.</div>}
            <PublicationPlanner channels={enabledChannels} value={contentForm.publications} onChange={updateContentPublications} defaultDate={contentForm.default_date} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setContentOpen(false)}>Cancel</Button><Button disabled={!contentForm.title.trim() || contentForm.publications.some((publication) => !publication.channel_id || !publication.planned_at) || createContent.isPending} onClick={() => createContent.mutate()}>{editTarget ? "Save changes" : contentForm.publications.length ? "Create & schedule" : "Save content"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(scheduleTarget)} onOpenChange={(open) => !open && setScheduleTarget(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Add publications</DialogTitle><DialogDescription>Add one or more publication times for {scheduleTarget?.title}. A channel can be added more than once.</DialogDescription></DialogHeader>
          <PublicationPlanner channels={enabledChannels} value={scheduleForm.publications} onChange={(publications) => setScheduleForm({ ...scheduleForm, publications })} defaultDate={scheduleForm.default_date} />
          <DialogFooter><Button variant="outline" onClick={() => setScheduleTarget(null)}>Cancel</Button><Button disabled={!scheduleForm.publications.length || scheduleForm.publications.some((publication) => !publication.channel_id || !publication.planned_at) || createPublication.isPending} onClick={() => createPublication.mutate()}>Add {scheduleForm.publications.length || ""} publication{scheduleForm.publications.length === 1 ? "" : "s"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resourceTarget)} onOpenChange={(open) => !open && setResourceTarget(null)}><DialogContent><DialogHeader><DialogTitle>Attach a source</DialogTitle><DialogDescription>Link the working Canva design, Drive file, Document Center record, or another web resource.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Provider</Label><Select value={resourceForm.provider} onValueChange={(value) => setResourceForm({ ...resourceForm, provider: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="canva">Canva</SelectItem><SelectItem value="google_drive">Google Drive</SelectItem><SelectItem value="document_center">Document Center</SelectItem><SelectItem value="web">Web link</SelectItem></SelectContent></Select></div><div><Label>Link title</Label><Input className="mt-1" value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} /></div><div><Label>URL</Label><Input className="mt-1" type="url" value={resourceForm.url} onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })} placeholder="https://…" /></div></div><DialogFooter><Button variant="outline" onClick={() => setResourceTarget(null)}>Cancel</Button><Button disabled={!resourceForm.title || !resourceForm.url || addResource.isPending} onClick={() => addResource.mutate()}>Attach source</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={channelOpen} onOpenChange={setChannelOpen}><DialogContent><DialogHeader><DialogTitle>Add channel</DialogTitle><DialogDescription>Add another social platform or planning destination.</DialogDescription></DialogHeader><div><Label>Channel name</Label><Input className="mt-1" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="LinkedIn" /></div><DialogFooter><Button variant="outline" onClick={() => setChannelOpen(false)}>Cancel</Button><Button disabled={!channelName || createChannel.isPending} onClick={() => createChannel.mutate()}>Add channel</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
