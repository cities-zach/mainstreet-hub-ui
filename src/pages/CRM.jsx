import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  Check,
  Clock,
  CopyCheck,
  Download,
  FileSpreadsheet,
  GitMerge,
  Mail,
  MapPin,
  Network,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Tags,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PassportMap from "@/components/passport/PassportMap";

const emptyContact = {
  first_name: "",
  last_name: "",
  preferred_name: "",
  emails: [{ value: "", label: "" }],
  phones: [{ value: "", label: "" }],
  notes: "",
  source: "manual",
  tags: [],
};

const emptyEntity = {
  name: "",
  entity_type: "business",
  category: "",
  general_email: "",
  general_phone: "",
  website: "",
  notes: "",
  source: "manual",
};

const emptyPlace = {
  place_name: "",
  line1: "",
  city: "",
  state: "",
  postal_code: "",
  occupancy_status: "",
  use_type: "",
  parcel_id: "",
  notes: "",
  source: "manual",
};

const starterTags = {
  contact: ["donor", "sponsor", "volunteer", "media", "board member"],
  entity: ["sponsor", "restaurant", "retail", "nonprofit", "government", "vendor"],
  place: ["property owner", "vacant property", "restaurant space", "upper floor", "needs follow-up"],
};

const touchpointTemplates = [
  { label: "Phone call", touchpoint_type: "phone_call", subject: "Phone call" },
  { label: "Email", touchpoint_type: "email", subject: "Email follow-up" },
  { label: "Site visit", touchpoint_type: "site_visit", subject: "Site visit" },
  { label: "Canvassing note", touchpoint_type: "canvassing", subject: "Canvassing note" },
  { label: "Sponsorship ask", touchpoint_type: "sponsorship_ask", subject: "Sponsorship ask", follow_up_status: "needed" },
  { label: "Volunteer follow-up", touchpoint_type: "volunteer_follow_up", subject: "Volunteer follow-up", follow_up_status: "needed" },
];

function StatCard({ icon, label, value }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#835879]/10 text-[#835879] flex items-center justify-center">
          {React.createElement(icon, { className: "w-5 h-5" })}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-2xl font-semibold">{value ?? 0}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTabs({ active, setActive }) {
  const tabs = [
    ["contacts", "People", Users],
    ["entities", "Businesses", Building2],
    ["places", "Places", MapPin],
    ["districts", "Districts", Network],
    ["touchpoints", "Activity", Activity],
    ["reports", "Reports", BarChart3],
    ["tags", "Tags", Tags],
    ["imports", "Imports", Upload],
    ["duplicates", "Duplicates", GitMerge],
    ["audiences", "Audiences", CopyCheck],
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(([id, label, icon]) => (
        <Button
          key={id}
          type="button"
          variant={active === id ? "default" : "outline"}
          className={active === id ? "bg-[#835879] text-white" : ""}
          onClick={() => setActive(id)}
        >
          {React.createElement(icon, { className: "w-4 h-4 mr-2" })}
          {label}
        </Button>
      ))}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

function TagFilter({ type, value, onChange }) {
  const tags = useQuery({
    queryKey: ["crm", "tags", type],
    queryFn: () => apiFetch(`/crm/tags?type=${type}`),
  });
  return (
    <select
      className="w-full md:w-56 border rounded-md h-10 px-3 bg-white dark:bg-slate-950"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">All tags</option>
      {(tags.data || []).map((tag) => (
        <option key={tag.id} value={tag.name}>
          {tag.name}
        </option>
      ))}
    </select>
  );
}

function audienceTagType(targetType) {
  if (targetType === "entities") return "entity";
  if (targetType === "places") return "place";
  return "contact";
}

function formatCrmDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function CrmWidget({ title, icon, children, emptyText }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {React.createElement(icon, { className: "w-4 h-4 text-[#835879]" })}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {children || <p className="text-sm text-slate-500">{emptyText}</p>}
      </CardContent>
    </Card>
  );
}

function CrmRecordLink({ to, title, subtitle, meta }) {
  const content = (
    <div className="rounded-xl border p-3 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title || "Untitled"}</p>
          {subtitle ? <p className="text-xs text-slate-500 mt-1">{subtitle}</p> : null}
        </div>
        {meta ? <Badge variant="outline" className="shrink-0">{meta}</Badge> : null}
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function CrmDashboardWidgets({ data }) {
  const queryClient = useQueryClient();
  const followUps = data?.follow_ups || [];
  const vacantPlaces = data?.vacant_places || [];
  const recentActivity = data?.recent_activity || [];
  const openTasks = data?.open_tasks || [];
  const markDone = useMutation({
    mutationFn: (id) =>
      apiFetch(`/crm/touchpoints/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ follow_up_status: "done" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Follow-up marked done");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-4">
      <CrmWidget title="Follow-Ups Due" icon={Clock} emptyText="No upcoming or overdue follow-ups.">
        {followUps.length
          ? followUps.map((item) => {
              const targetTitle = item.contact_name || item.entity_name || item.place_name || item.place_address;
              const targetPath = item.related_contact_id
                ? `/crm/contacts/${item.related_contact_id}`
                : item.related_entity_id
                  ? `/crm/entities/${item.related_entity_id}`
                  : item.related_place_id
                    ? `/crm/places/${item.related_place_id}`
                    : null;
              return (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CrmRecordLink
                      to={targetPath}
                      title={item.subject || targetTitle || item.touchpoint_type}
                      subtitle={targetTitle}
                      meta={formatCrmDate(item.follow_up_at)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    disabled={markDone.isPending}
                    onClick={() => markDone.mutate(item.id)}
                  >
                    Done
                  </Button>
                </div>
              );
            })
          : null}
      </CrmWidget>
      <CrmWidget title="Vacant Places" icon={MapPin} emptyText="No vacant or available places are flagged.">
        {vacantPlaces.length
          ? vacantPlaces.map((place) => (
              <CrmRecordLink
                key={place.id}
                to={`/crm/places/${place.id}`}
                title={place.place_name || place.line1 || "Unnamed place"}
                subtitle={[place.line1, place.city, place.state, place.use_type].filter(Boolean).join(" · ")}
                meta={place.occupancy_status || "Vacant"}
              />
            ))
          : null}
      </CrmWidget>
      <CrmWidget title="Recent CRM Activity" icon={Activity} emptyText="No CRM activity yet.">
        {recentActivity.length
          ? recentActivity.map((item) => {
              const targetTitle = item.contact_name || item.entity_name || item.place_name;
              return (
                <CrmRecordLink
                  key={item.id}
                  title={item.subject || item.touchpoint_type}
                  subtitle={[targetTitle, item.body?.slice(0, 60)].filter(Boolean).join(" · ")}
                  meta={formatCrmDate(item.occurred_at)}
                />
              );
            })
          : null}
      </CrmWidget>
      <CrmWidget title="Open Tasks" icon={Clock} emptyText="No open CRM-linked tasks.">
        {openTasks.length
          ? openTasks.map((task) => {
              const targetTitle = task.contact_name || task.entity_name || task.place_name;
              const targetPath = task.contact_id
                ? `/crm/contacts/${task.contact_id}`
                : task.entity_id
                  ? `/crm/entities/${task.entity_id}`
                  : task.place_id
                    ? `/crm/places/${task.place_id}`
                    : null;
              return (
                <CrmRecordLink
                  key={task.id}
                  to={targetPath}
                  title={task.title}
                  subtitle={[targetTitle, task.assigned_to_name].filter(Boolean).join(" · ")}
                  meta={task.due_date ? formatCrmDate(task.due_date) : "No due date"}
                />
              );
            })
          : null}
      </CrmWidget>
    </div>
  );
}

function CrmGettingStarted({ summary }) {
  const hasRecords = Boolean(
    Number(summary?.contacts || 0) ||
      Number(summary?.entities || 0) ||
      Number(summary?.places || 0)
  );
  if (hasRecords) return null;
  return (
    <Card className="border-[#835879]/20 bg-[#835879]/5">
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#2d4650] dark:text-slate-100">
              Start with the relationship map you already know
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Add a few people, businesses, and places, then connect them with roles and log the first touchpoints. The CRM gets useful fastest when place records and relationship history grow together.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-white dark:bg-slate-950 border p-3">
              <p className="font-medium">1. Add records</p>
              <p className="text-slate-500">People, businesses, and places.</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-950 border p-3">
              <p className="font-medium">2. Connect them</p>
              <p className="text-slate-500">Owners, tenants, managers, contacts.</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-950 border p-3">
              <p className="font-medium">3. Log activity</p>
              <p className="text-slate-500">Calls, visits, asks, canvassing notes.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickTouchpointButtons({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {touchpointTemplates.map((template) => (
        <Button key={template.touchpoint_type} type="button" size="sm" variant="outline" onClick={() => onSelect(template)}>
          {template.label}
        </Button>
      ))}
    </div>
  );
}

function QuickTouchpointPanel({ title = "Log Touchpoint", defaults, onCancel }) {
  if (!defaults) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <TouchpointComposer key={JSON.stringify(defaults)} defaults={defaults} onSaved={onCancel} />
    </div>
  );
}

const DISTRICT_OVERLAY_COLORS = ["#835879", "#1d4ed8", "#0f766e", "#b45309", "#9333ea", "#be123c"];

function normalizeGeoJson(value) {
  if (!value) return null;
  let geo = value;
  if (typeof geo === "string") {
    try {
      geo = JSON.parse(geo);
    } catch {
      return null;
    }
  }
  if (geo.type === "FeatureCollection" || geo.type === "Feature") return geo;
  if (geo.type && geo.coordinates) return { type: "Feature", properties: {}, geometry: geo };
  return null;
}

function buildDistrictOverlays(districts = []) {
  return districts
    .map((district, index) => {
      const geojson = normalizeGeoJson(district.geometry_geojson);
      if (!geojson) return null;
      return { id: district.id, geojson, color: DISTRICT_OVERLAY_COLORS[index % DISTRICT_OVERLAY_COLORS.length] };
    })
    .filter(Boolean);
}

function PlaceMapView({ places = [], onLogCanvassing, overlays = [] }) {
  const mappedPlaces = places
    .filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng)))
    .map((place) => ({
      ...place,
      name: place.place_name || place.line1 || "Unnamed place",
      address_text: [place.line1, place.city, place.state].filter(Boolean).join(", "),
      lat: Number(place.lat),
      lng: Number(place.lng),
    }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Place Map / Canvassing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PassportMap
          stops={mappedPlaces}
          stamps={[]}
          mapConfig={{}}
          showControls
          heightClass="h-[360px]"
          onSelectStop={(place) => onLogCanvassing?.(place)}
          overlays={overlays}
        />
        <p className="text-sm text-slate-500">
          Click a mapped place to start a canvassing note. Places need latitude and longitude to appear on the map.
        </p>
      </CardContent>
    </Card>
  );
}

function TagSelectField({ type = "contact", value = [], onChange }) {
  const [draft, setDraft] = useState("");
  const tagList = useQuery({
    queryKey: ["crm", "tags", type],
    queryFn: () => apiFetch(`/crm/tags?type=${type}`),
  });
  const selectedLower = new Set(value.map((name) => name.toLowerCase()));
  const addTag = (raw) => {
    const name = (raw || "").trim();
    if (!name) return;
    if (selectedLower.has(name.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, name]);
    setDraft("");
  };
  const removeTag = (name) => onChange(value.filter((tag) => tag !== name));
  const suggestions = (tagList.data || []).filter((tag) => !selectedLower.has(tag.name.toLowerCase()));
  const curated = suggestions.filter((tag) => tag.is_curated);
  const others = suggestions.filter((tag) => !tag.is_curated);
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Tags className="w-4 h-4" />
        Tags
      </Label>
      {value.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((name) => (
            <button
              key={name}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm bg-white hover:bg-red-50 hover:text-red-700 dark:bg-slate-950"
              onClick={() => removeTag(name)}
              title="Remove tag"
            >
              {name}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(draft);
            }
          }}
          placeholder="Type a tag and press Enter"
        />
        <Button type="button" variant="outline" disabled={!draft.trim()} onClick={() => addTag(draft)}>
          Add
        </Button>
      </div>
      {curated.length ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Key tags</p>
          <div className="flex flex-wrap gap-2">
            {curated.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#835879]/40 bg-[#835879]/10 px-3 py-1 text-xs text-[#835879] hover:bg-[#835879]/20"
                onClick={() => addTag(tag.name)}
              >
                <Star className="w-3 h-3" />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {others.length ? (
        <div className="flex flex-wrap gap-2">
          {others.slice(0, 16).map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => addTag(tag.name)}
            >
              <Plus className="w-3 h-3" />
              {tag.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MultiContactField({ label, items, onChange, type = "text", placeholder }) {
  const list = items.length ? items : [{ value: "", label: "" }];
  const update = (index, key, value) =>
    onChange(list.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  const remove = (index) => {
    const next = list.filter((_, i) => i !== index);
    onChange(next.length ? next : [{ value: "", label: "" }]);
  };
  const add = () => onChange([...list, { value: "", label: "" }]);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {list.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            type={type}
            className="flex-1"
            value={item.value}
            onChange={(e) => update(index, "value", e.target.value)}
            placeholder={placeholder}
          />
          <Input
            className="w-28"
            value={item.label}
            onChange={(e) => update(index, "label", e.target.value)}
            placeholder="Label"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} title="Remove">
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="w-4 h-4 mr-1" /> Add another
      </Button>
      {list.filter((item) => item.value.trim()).length > 1 ? (
        <p className="text-xs text-slate-500">The first entry is saved as the primary.</p>
      ) : null}
    </div>
  );
}

function ContactForm({ onSubmit, isSaving }) {
  const [form, setForm] = useState(emptyContact);
  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Person
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>First name</Label>
          <Input value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} />
        </div>
        <div>
          <Label>Last name</Label>
          <Input value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} />
        </div>
        <div>
          <Label>Preferred name</Label>
          <Input value={form.preferred_name} onChange={(e) => setField("preferred_name", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <MultiContactField
            label="Emails"
            type="email"
            placeholder="name@example.com"
            items={form.emails}
            onChange={(emails) => setField("emails", emails)}
          />
        </div>
        <div className="md:col-span-2">
          <MultiContactField
            label="Phones"
            type="tel"
            placeholder="(555) 555-5555"
            items={form.phones}
            onChange={(phones) => setField("phones", phones)}
          />
        </div>
        <div>
          <Label>Source</Label>
          <Input value={form.source} onChange={(e) => setField("source", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <TagSelectField type="contact" value={form.tags} onChange={(tags) => setField("tags", tags)} />
        </div>
        <div className="md:col-span-2">
          <Button
            disabled={isSaving}
            onClick={() => {
              onSubmit({
                first_name: form.first_name,
                last_name: form.last_name,
                preferred_name: form.preferred_name,
                emails: form.emails
                  .filter((item) => item.value.trim())
                  .map((item, index) => ({
                    email: item.value.trim(),
                    label: item.label.trim() || null,
                    is_primary: index === 0,
                  })),
                phones: form.phones
                  .filter((item) => item.value.trim())
                  .map((item, index) => ({
                    phone: item.value.trim(),
                    label: item.label.trim() || null,
                    is_primary: index === 0,
                  })),
                notes: form.notes,
                source: form.source,
                tags: form.tags,
              });
              setForm(emptyContact);
            }}
          >
            Save Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EntityForm({ onSubmit, isSaving }) {
  const [form, setForm] = useState(emptyEntity);
  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Business or Organization
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </div>
        <div>
          <Label>Type</Label>
          <Input value={form.entity_type} onChange={(e) => setField("entity_type", e.target.value)} />
        </div>
        <div>
          <Label>Category</Label>
          <Input value={form.category} onChange={(e) => setField("category", e.target.value)} />
        </div>
        <div>
          <Label>Website</Label>
          <Input value={form.website} onChange={(e) => setField("website", e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.general_email} onChange={(e) => setField("general_email", e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.general_phone} onChange={(e) => setField("general_phone", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Button
            disabled={isSaving}
            onClick={() => {
              onSubmit(form);
              setForm(emptyEntity);
            }}
          >
            Save Business
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlaceForm({ onSubmit, isSaving }) {
  const [form, setForm] = useState(emptyPlace);
  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Place or Property
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Place name</Label>
          <Input value={form.place_name} onChange={(e) => setField("place_name", e.target.value)} />
        </div>
        <div>
          <Label>Parcel ID</Label>
          <Input value={form.parcel_id} onChange={(e) => setField("parcel_id", e.target.value)} />
        </div>
        <div>
          <Label>Address</Label>
          <Input value={form.line1} onChange={(e) => setField("line1", e.target.value)} />
        </div>
        <div>
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
        </div>
        <div>
          <Label>State</Label>
          <Input value={form.state} onChange={(e) => setField("state", e.target.value)} />
        </div>
        <div>
          <Label>Postal code</Label>
          <Input value={form.postal_code} onChange={(e) => setField("postal_code", e.target.value)} />
        </div>
        <div>
          <Label>Occupancy status</Label>
          <Input value={form.occupancy_status} onChange={(e) => setField("occupancy_status", e.target.value)} />
        </div>
        <div>
          <Label>Use type</Label>
          <Input value={form.use_type} onChange={(e) => setField("use_type", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Canvassing / property notes</Label>
          <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Button
            disabled={isSaving}
            onClick={() => {
              onSubmit({
                place_name: form.place_name,
                occupancy_status: form.occupancy_status,
                use_type: form.use_type,
                parcel_id: form.parcel_id,
                notes: form.notes,
                source: form.source,
                address: {
                  line1: form.line1,
                  city: form.city,
                  state: form.state,
                  postal_code: form.postal_code,
                },
              });
              setForm(emptyPlace);
            }}
          >
            Save Place
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TouchpointComposer({ defaults = {}, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    subject: "",
    body: "",
    touchpoint_type: "note",
    follow_up_at: "",
    follow_up_status: "none",
    ...defaults,
  });
  const [reminder, setReminder] = useState({ enabled: false, assigned_to_id: "", due: "", title: "" });
  const users = useQuery({
    queryKey: ["crm", "users"],
    queryFn: () => apiFetch("/users"),
    staleTime: 5 * 60 * 1000,
  });
  const mutation = useMutation({
    mutationFn: (payload) =>
      apiFetch("/crm/touchpoints", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success(result?.reminder_task ? "Touchpoint saved and reminder created" : "Touchpoint saved");
      setForm((prev) => ({ ...prev, subject: "", body: "", follow_up_at: "" }));
      setReminder({ enabled: false, assigned_to_id: "", due: "", title: "" });
      onSaved?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const submit = () => {
    const payload = { ...form };
    if (reminder.enabled) {
      payload.create_task = true;
      payload.task_assigned_to_id = reminder.assigned_to_id || undefined;
      payload.task_due_date = reminder.due || form.follow_up_at || undefined;
      payload.task_title = reminder.title || form.subject || undefined;
      if (payload.follow_up_status === "none") payload.follow_up_status = "needed";
    }
    mutation.mutate(payload);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Add Touchpoint
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Input value={form.touchpoint_type} onChange={(e) => setForm((p) => ({ ...p, touchpoint_type: e.target.value }))} />
          </div>
          <div>
            <Label>Follow-up date</Label>
            <Input type="datetime-local" value={form.follow_up_at} onChange={(e) => setForm((p) => ({ ...p, follow_up_at: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label>Subject</Label>
          <Input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} />
        </div>
        <div className="rounded-xl border p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={reminder.enabled}
              onChange={(e) => setReminder((p) => ({ ...p, enabled: e.target.checked }))}
            />
            Set a reminder (creates a task)
          </label>
          {reminder.enabled ? (
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Assign to</Label>
                <select
                  className="w-full border rounded-md h-10 px-3 bg-white dark:bg-slate-950"
                  value={reminder.assigned_to_id}
                  onChange={(e) => setReminder((p) => ({ ...p, assigned_to_id: e.target.value }))}
                >
                  <option value="">Me</option>
                  {(users.data || []).map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={reminder.due}
                  onChange={(e) => setReminder((p) => ({ ...p, due: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Reminder title</Label>
                <Input
                  placeholder={form.subject || "Follow up"}
                  value={reminder.title}
                  onChange={(e) => setReminder((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
            </div>
          ) : null}
        </div>
        <Button disabled={mutation.isPending} onClick={submit}>
          {reminder.enabled ? "Save & create reminder" : "Save Touchpoint"}
        </Button>
      </CardContent>
    </Card>
  );
}

function getRelationshipTargets(type) {
  if (type === "contact") {
    return [
      {
        id: "entity",
        label: "Business / organization",
        searchPath: "/crm/entities",
        postPath: "/crm/contact-entity-relationships",
        endpoint: "contact-entity-relationships",
        idField: "entity_id",
        defaultRelationship: "owner",
        defaultRole: "",
        placeholder: "Search businesses",
      },
      {
        id: "place",
        label: "Place / property",
        searchPath: "/crm/places",
        postPath: "/crm/place-contact-relationships",
        endpoint: "place-contact-relationships",
        idField: "place_id",
        defaultRelationship: "property contact",
        defaultRole: "",
        placeholder: "Search places",
      },
    ];
  }
  if (type === "entity") {
    return [
      {
        id: "contact",
        label: "Person",
        searchPath: "/crm/contacts",
        postPath: "/crm/contact-entity-relationships",
        endpoint: "contact-entity-relationships",
        idField: "contact_id",
        defaultRelationship: "contact",
        defaultRole: "",
        placeholder: "Search people",
      },
      {
        id: "place",
        label: "Place / property",
        searchPath: "/crm/places",
        postPath: "/crm/place-entity-relationships",
        endpoint: "place-entity-relationships",
        idField: "place_id",
        defaultRelationship: "occupant",
        defaultRole: "",
        placeholder: "Search places",
      },
    ];
  }
  return [
    {
      id: "entity",
      label: "Business / organization",
      searchPath: "/crm/entities",
      postPath: "/crm/place-entity-relationships",
      endpoint: "place-entity-relationships",
      idField: "entity_id",
      defaultRelationship: "occupant",
      defaultRole: "",
      placeholder: "Search businesses",
    },
    {
      id: "contact",
      label: "Person",
      searchPath: "/crm/contacts",
      postPath: "/crm/place-contact-relationships",
      endpoint: "place-contact-relationships",
      idField: "contact_id",
      defaultRelationship: "property contact",
      defaultRole: "",
      placeholder: "Search people",
    },
  ];
}

function getRecordLabel(record) {
  return record?.display_name || record?.name || record?.place_name || record?.line1 || "Unnamed record";
}

function getRecordSubLabel(record) {
  return [
    record?.primary_email,
    record?.general_email,
    record?.entity_type,
    record?.category,
    record?.line1,
    record?.city,
    record?.state,
    record?.occupancy_status,
  ]
    .filter(Boolean)
    .join(" · ");
}

function RelationshipEditor({ type, recordId }) {
  const queryClient = useQueryClient();
  const targets = getRelationshipTargets(type);
  const [targetType, setTargetType] = useState(targets[0].id);
  const target = targets.find((item) => item.id === targetType) || targets[0];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    relationship_type: target.defaultRelationship,
    role_title: target.defaultRole,
    notes: "",
  });

  const search = useQuery({
    queryKey: ["crm", "relationship-search", target.searchPath, query],
    queryFn: () => apiFetch(`${target.searchPath}?query=${encodeURIComponent(query)}`),
  });

  const createRelationship = useMutation({
    mutationFn: () => {
      if (!selected?.id) throw new Error(`Select a ${target.label.toLowerCase()} first`);
      const payload = {
        relationship_type: form.relationship_type || target.defaultRelationship,
        notes: form.notes || null,
        [target.idField]: selected.id,
      };
      if (type === "contact" || target.id === "contact") payload.contact_id = type === "contact" ? recordId : selected.id;
      if (type === "entity" || target.id === "entity") payload.entity_id = type === "entity" ? recordId : selected.id;
      if (type === "place" || target.id === "place") payload.place_id = type === "place" ? recordId : selected.id;
      if (target.endpoint === "contact-entity-relationships") {
        payload.role_title = form.role_title || null;
        payload.is_primary_contact = Boolean(form.is_primary_contact);
      }
      if (target.endpoint === "place-entity-relationships") {
        payload.is_primary_location = Boolean(form.is_primary_location);
      }
      return apiFetch(target.postPath, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", type, recordId] });
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Relationship added");
      setSelected(null);
      setQuery("");
      setForm({
        relationship_type: target.defaultRelationship,
        role_title: target.defaultRole,
        notes: "",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleTargetChange = (nextType) => {
    const nextTarget = targets.find((item) => item.id === nextType) || targets[0];
    setTargetType(nextType);
    setSelected(null);
    setQuery("");
    setForm({
      relationship_type: nextTarget.defaultRelationship,
      role_title: nextTarget.defaultRole,
      notes: "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Relationship
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Connect to</Label>
          <select
            className="w-full border rounded-md h-10 px-3 bg-white dark:bg-slate-950"
            value={targetType}
            onChange={(event) => handleTargetChange(event.target.value)}
          >
            {targets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder={target.placeholder} />
        <div className="max-h-44 overflow-auto border rounded-xl divide-y">
          {(search.data?.rows || []).map((record) => (
            <button
              key={record.id}
              type="button"
              className={`w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-900 ${
                selected?.id === record.id ? "bg-[#835879]/10" : ""
              }`}
              onClick={() => setSelected(record)}
            >
              <p className="text-sm font-medium">{getRecordLabel(record)}</p>
              <p className="text-xs text-slate-500">{getRecordSubLabel(record) || "No summary details"}</p>
            </button>
          ))}
          {!search.isLoading && !(search.data?.rows || []).length ? (
            <p className="p-3 text-sm text-slate-500">No matching records.</p>
          ) : null}
        </div>
        <div>
          <Label>Relationship type</Label>
          <Input
            value={form.relationship_type}
            onChange={(event) => setForm((prev) => ({ ...prev, relationship_type: event.target.value }))}
            placeholder="owner, manager, occupant, property contact"
          />
        </div>
        {target.endpoint === "contact-entity-relationships" ? (
          <div>
            <Label>Role / title</Label>
            <Input
              value={form.role_title}
              onChange={(event) => setForm((prev) => ({ ...prev, role_title: event.target.value }))}
              placeholder="Executive Director, Store Manager, Board Chair"
            />
          </div>
        ) : null}
        <div>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        {selected ? (
          <p className="text-sm text-slate-500">
            Selected: <span className="font-medium text-slate-700 dark:text-slate-200">{getRecordLabel(selected)}</span>
          </p>
        ) : null}
        <Button className="w-full bg-[#835879] text-white" disabled={createRelationship.isPending} onClick={() => createRelationship.mutate()}>
          Link Record
        </Button>
      </CardContent>
    </Card>
  );
}

function RelationshipRow({ item, label, subLabel, endpoint, onRemove }) {
  return (
    <div className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-slate-500">
          {[item.relationship_type, item.role_title, subLabel].filter(Boolean).join(" · ")}
        </p>
        {item.notes ? <p className="text-sm mt-1 whitespace-pre-wrap">{item.notes}</p> : null}
      </div>
      <Button variant="outline" size="sm" className="w-fit text-red-600" onClick={() => onRemove({ id: item.id, endpoint })}>
        <Trash2 className="w-4 h-4 mr-2" />
        Remove
      </Button>
    </div>
  );
}

function RelatedRecordsCard({ type, detail }) {
  const queryClient = useQueryClient();
  const removeRelationship = useMutation({
    mutationFn: ({ id, endpoint }) => apiFetch(`/crm/${endpoint}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", type, detail.id] });
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Relationship removed");
    },
    onError: (error) => toast.error(error.message),
  });

  const rows = [];
  if (type === "contact") {
    rows.push(
      ...(detail.relationships || []).map((item) => ({
        item,
        label: item.entity_name,
        subLabel: item.entity_type,
        endpoint: "contact-entity-relationships",
      })),
      ...(detail.places || []).map((item) => ({
        item,
        label: item.place_name || item.line1,
        subLabel: [item.line1, item.city, item.state].filter(Boolean).join(", "),
        endpoint: "place-contact-relationships",
      }))
    );
  } else if (type === "entity") {
    rows.push(
      ...(detail.people || []).map((item) => ({
        item,
        label: item.display_name,
        subLabel: [item.first_name, item.last_name].filter(Boolean).join(" "),
        endpoint: "contact-entity-relationships",
      })),
      ...(detail.places || []).map((item) => ({
        item,
        label: item.place_name || item.line1,
        subLabel: [item.line1, item.city, item.state].filter(Boolean).join(", "),
        endpoint: "place-entity-relationships",
      }))
    );
  } else {
    rows.push(
      ...(detail.entities || []).map((item) => ({
        item,
        label: item.name,
        subLabel: item.entity_type,
        endpoint: "place-entity-relationships",
      })),
      ...(detail.contacts || []).map((item) => ({
        item,
        label: item.display_name,
        subLabel: null,
        endpoint: "place-contact-relationships",
      }))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <RelationshipRow
            key={`${row.endpoint}-${row.item.id}`}
            item={row.item}
            label={row.label || "Related record"}
            subLabel={row.subLabel}
            endpoint={row.endpoint}
            onRemove={(payload) => removeRelationship.mutate(payload)}
          />
        ))}
        {!rows.length ? <p className="text-sm text-slate-500">No relationships yet. Use Add Relationship to connect this profile.</p> : null}
      </CardContent>
    </Card>
  );
}

function TagManager({ type, recordId, tags = [] }) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const tagList = useQuery({
    queryKey: ["crm", "tags", type],
    queryFn: () => apiFetch(`/crm/tags?type=${type}`),
  });
  const assignedIds = new Set(tags.map((tag) => tag.id));
  const availableTags = (tagList.data || []).filter((tag) => !assignedIds.has(tag.id));

  const assignTag = useMutation({
    mutationFn: (tagId) =>
      apiFetch("/crm/taggings", {
        method: "POST",
        body: JSON.stringify({
          tag_id: tagId,
          entity_type: type,
          entity_id: recordId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", type, recordId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "tags", type] });
      toast.success("Tag added");
      setSelectedTagId("");
    },
    onError: (error) => toast.error(error.message),
  });

  const createTag = useMutation({
    mutationFn: async (name) => {
      const tag = await apiFetch("/crm/tags", {
        method: "POST",
        body: JSON.stringify({ name, tag_type: type }),
      });
      await apiFetch("/crm/taggings", {
        method: "POST",
        body: JSON.stringify({
          tag_id: tag.id,
          entity_type: type,
          entity_id: recordId,
        }),
      });
      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", type, recordId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "tags", type] });
      toast.success("Tag created");
      setNewTagName("");
    },
    onError: (error) => toast.error(error.message),
  });

  const createStarterTags = useMutation({
    mutationFn: async () => {
      const names = starterTags[type] || [];
      const existingNames = new Set((tagList.data || []).map((tag) => tag.name.toLowerCase()));
      const missing = names.filter((name) => !existingNames.has(name.toLowerCase()));
      for (const name of missing) {
        await apiFetch("/crm/tags", {
          method: "POST",
          body: JSON.stringify({ name, tag_type: type }),
        });
      }
      return missing.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "tags", type] });
      toast.success(count ? "Starter tags created" : "Starter tags already exist");
    },
    onError: (error) => toast.error(error.message),
  });

  const removeTag = useMutation({
    mutationFn: (taggingId) => apiFetch(`/crm/taggings/${taggingId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", type, recordId] });
      toast.success("Tag removed");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="w-5 h-5" />
          Tags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.tagging_id || tag.id}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-white hover:bg-red-50 hover:text-red-700 dark:bg-slate-950"
              onClick={() => tag.tagging_id && removeTag.mutate(tag.tagging_id)}
              title="Remove tag"
            >
              {tag.name}
              <Trash2 className="w-3 h-3" />
            </button>
          ))}
          {!tags.length ? <p className="text-sm text-slate-500">No tags yet.</p> : null}
        </div>
        <div className="space-y-2">
          <Label>Add existing tag</Label>
          <div className="flex gap-2">
            <select
              className="flex-1 border rounded-md h-10 px-3 bg-white dark:bg-slate-950"
              value={selectedTagId}
              onChange={(event) => setSelectedTagId(event.target.value)}
            >
              <option value="">Choose a tag</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <Button variant="outline" disabled={!selectedTagId || assignTag.isPending} onClick={() => assignTag.mutate(selectedTagId)}>
              Add
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Create tag</Label>
          <div className="flex gap-2">
            <Input value={newTagName} onChange={(event) => setNewTagName(event.target.value)} placeholder="donor, restaurant, vacant property" />
            <Button
              variant="outline"
              disabled={!newTagName.trim() || createTag.isPending}
              onClick={() => createTag.mutate(newTagName.trim())}
            >
              Create
            </Button>
          </div>
        </div>
        <Button variant="outline" className="w-full" disabled={createStarterTags.isPending} onClick={() => createStarterTags.mutate()}>
          Create Starter Tags
        </Button>
      </CardContent>
    </Card>
  );
}

function useCrmUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users"),
    staleTime: 5 * 60 * 1000,
  });
}

function OwnerPicker({ recordType, id, ownerUserId }) {
  const queryClient = useQueryClient();
  const users = useCrmUsers();
  const mutation = useMutation({
    mutationFn: (value) =>
      apiFetch("/crm/bulk", {
        method: "POST",
        body: JSON.stringify(
          value
            ? { record_type: recordType, ids: [id], action: "assign_owner", owner_user_id: value }
            : { record_type: recordType, ids: [id], action: "remove_owner" }
        ),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Owner updated");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <select
      className="border rounded-md h-9 px-2 text-sm bg-white dark:bg-slate-950"
      value={ownerUserId || ""}
      onChange={(e) => mutation.mutate(e.target.value)}
    >
      <option value="">Unassigned</option>
      {(users.data || []).map((u) => (
        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
      ))}
    </select>
  );
}

function OwnerFilter({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm whitespace-nowrap">
      <input type="checkbox" checked={value === "me"} onChange={(e) => onChange(e.target.checked ? "me" : "")} />
      Owned by me
    </label>
  );
}

function BulkBar({ recordType, selectedIds, onCleared }) {
  const queryClient = useQueryClient();
  const users = useCrmUsers();
  const [owner, setOwner] = useState("");
  const [tag, setTag] = useState("");
  const bulk = useMutation({
    mutationFn: (payload) =>
      apiFetch("/crm/bulk", {
        method: "POST",
        body: JSON.stringify({ record_type: recordType, ids: selectedIds, ...payload }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success(`Updated ${res.updated ?? res.tagged ?? 0} record(s)`);
      setOwner("");
      setTag("");
      onCleared?.();
    },
    onError: (error) => toast.error(error.message),
  });
  if (!selectedIds.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 dark:bg-slate-900 p-2">
      <span className="text-sm font-medium">{selectedIds.length} selected</span>
      <select
        className="border rounded-md h-8 px-2 text-sm bg-white dark:bg-slate-950"
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
      >
        <option value="">Set owner…</option>
        <option value="__none">Unassign owner</option>
        {(users.data || []).map((u) => (
          <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!owner || bulk.isPending}
        onClick={() => (owner === "__none" ? bulk.mutate({ action: "remove_owner" }) : bulk.mutate({ action: "assign_owner", owner_user_id: owner }))}
      >
        Apply owner
      </Button>
      <Input className="h-8 w-40" placeholder="Add tag" value={tag} onChange={(e) => setTag(e.target.value)} />
      <Button size="sm" disabled={!tag.trim() || bulk.isPending} onClick={() => bulk.mutate({ action: "add_tag", tag })}>
        Add tag
      </Button>
      <Button size="sm" variant="ghost" onClick={onCleared}>Clear</Button>
    </div>
  );
}

function ContactsSection() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [owner, setOwner] = useState("");
  const [selected, setSelected] = useState([]);
  const [quickTouchpoint, setQuickTouchpoint] = useState(null);
  const contacts = useQuery({
    queryKey: ["crm", "contacts", query, tag, owner],
    queryFn: () => apiFetch(`/crm/contacts?query=${encodeURIComponent(query)}&tag=${encodeURIComponent(tag)}&owner=${encodeURIComponent(owner)}`),
  });
  const toggleSelected = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const createContact = useMutation({
    mutationFn: (payload) =>
      apiFetch("/crm/contacts", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Contact created");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <SearchBox value={query} onChange={setQuery} placeholder="Search by name or email" />
            </div>
            <OwnerFilter value={owner} onChange={setOwner} />
            <TagFilter type="contact" value={tag} onChange={setTag} />
          </div>
          <BulkBar recordType="contact" selectedIds={selected} onCleared={() => setSelected([])} />
          <div className="divide-y">
            {(contacts.data?.rows || []).map((contact) => (
              <div key={contact.id} className="py-3 hover:bg-slate-50 rounded-lg px-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <input type="checkbox" className="mt-1" checked={selected.includes(contact.id)} onChange={() => toggleSelected(contact.id)} />
                    <Link to={`/crm/contacts/${contact.id}`} className="flex-1">
                      <div>
                        <p className="font-medium">{contact.display_name}</p>
                        <p className="text-sm text-slate-500">{[contact.primary_email || contact.primary_phone || "No contact method yet", contact.owner_name ? `Owner: ${contact.owner_name}` : null].filter(Boolean).join(" · ")}</p>
                      </div>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setQuickTouchpoint({
                          related_contact_id: contact.id,
                          subject: `Touchpoint with ${contact.display_name}`,
                          touchpoint_type: "note",
                        })
                      }
                    >
                      Log Touchpoint
                    </Button>
                    <Badge variant="outline">{contact.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
            {!contacts.isLoading && !(contacts.data?.rows || []).length ? (
              <p className="text-sm text-slate-500 py-8 text-center">No contacts found.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <QuickTouchpointPanel defaults={quickTouchpoint} onCancel={() => setQuickTouchpoint(null)} />
        <ContactForm onSubmit={(payload) => createContact.mutate(payload)} isSaving={createContact.isPending} />
      </div>
    </div>
  );
}

function EntitiesSection() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [owner, setOwner] = useState("");
  const [selected, setSelected] = useState([]);
  const [quickTouchpoint, setQuickTouchpoint] = useState(null);
  const entities = useQuery({
    queryKey: ["crm", "entities", query, tag, owner],
    queryFn: () => apiFetch(`/crm/entities?query=${encodeURIComponent(query)}&tag=${encodeURIComponent(tag)}&owner=${encodeURIComponent(owner)}`),
  });
  const toggleSelected = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const createEntity = useMutation({
    mutationFn: (payload) =>
      apiFetch("/crm/entities", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Business created");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Businesses and Organizations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <SearchBox value={query} onChange={setQuery} placeholder="Search by name, category, or email" />
            </div>
            <OwnerFilter value={owner} onChange={setOwner} />
            <TagFilter type="entity" value={tag} onChange={setTag} />
          </div>
          <BulkBar recordType="entity" selectedIds={selected} onCleared={() => setSelected([])} />
          <div className="divide-y">
            {(entities.data?.rows || []).map((entity) => (
              <div key={entity.id} className="py-3 hover:bg-slate-50 rounded-lg px-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <input type="checkbox" className="mt-1" checked={selected.includes(entity.id)} onChange={() => toggleSelected(entity.id)} />
                    <Link to={`/crm/entities/${entity.id}`} className="flex-1">
                      <p className="font-medium">{entity.name}</p>
                      <p className="text-sm text-slate-500">{[entity.entity_type, entity.category, entity.general_email, entity.owner_name ? `Owner: ${entity.owner_name}` : null].filter(Boolean).join(" · ")}</p>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setQuickTouchpoint({
                          related_entity_id: entity.id,
                          subject: `Touchpoint with ${entity.name}`,
                          touchpoint_type: "note",
                        })
                      }
                    >
                      Log Touchpoint
                    </Button>
                    <Badge variant="outline">{entity.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
            {!entities.isLoading && !(entities.data?.rows || []).length ? (
              <p className="text-sm text-slate-500 py-8 text-center">No businesses found.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <QuickTouchpointPanel defaults={quickTouchpoint} onCancel={() => setQuickTouchpoint(null)} />
        <EntityForm onSubmit={(payload) => createEntity.mutate(payload)} isSaving={createEntity.isPending} />
      </div>
    </div>
  );
}

function PlacesSection() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [owner, setOwner] = useState("");
  const [selected, setSelected] = useState([]);
  const [quickTouchpoint, setQuickTouchpoint] = useState(null);
  const districts = useQuery({
    queryKey: ["crm", "districts"],
    queryFn: () => apiFetch("/crm/districts"),
  });
  const places = useQuery({
    queryKey: ["crm", "places", query, tag, districtId, owner],
    queryFn: () =>
      apiFetch(
        `/crm/places?query=${encodeURIComponent(query)}&tag=${encodeURIComponent(tag)}&district_id=${encodeURIComponent(districtId)}&owner=${encodeURIComponent(owner)}`
      ),
  });
  const toggleSelected = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const overlayDistricts = districtId
    ? (districts.data || []).filter((d) => d.id === districtId)
    : (districts.data || []).filter((d) => d.is_active);
  const overlays = useMemo(() => buildDistrictOverlays(overlayDistricts), [overlayDistricts]);
  const createPlace = useMutation({
    mutationFn: (payload) =>
      apiFetch("/crm/places", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Place created");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="space-y-6">
      <PlaceMapView
        places={places.data?.rows || []}
        overlays={overlays}
        onLogCanvassing={(place) =>
          setQuickTouchpoint({
            related_place_id: place.id,
            touchpoint_type: "canvassing",
            subject: `Canvassing note: ${place.name || place.place_name || place.line1 || "Place"}`,
          })
        }
      />
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Places and Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <SearchBox value={query} onChange={setQuery} placeholder="Search by place, address, or parcel ID" />
              </div>
              <select
                className="border rounded-md h-10 px-3 bg-white dark:bg-slate-950 text-sm"
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
              >
                <option value="">All districts</option>
                {(districts.data || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <OwnerFilter value={owner} onChange={setOwner} />
              <TagFilter type="place" value={tag} onChange={setTag} />
            </div>
            <BulkBar recordType="place" selectedIds={selected} onCleared={() => setSelected([])} />
            <div className="divide-y">
              {(places.data?.rows || []).map((place) => (
                <div key={place.id} className="py-3 hover:bg-slate-50 rounded-lg px-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                    <input type="checkbox" className="mt-1" checked={selected.includes(place.id)} onChange={() => toggleSelected(place.id)} />
                    <Link to={`/crm/places/${place.id}`} className="flex-1">
                    <p className="font-medium">{place.place_name || place.line1 || "Unnamed place"}</p>
                    <p className="text-sm text-slate-500">{[place.line1, place.city, place.state, place.occupancy_status, place.district_name, place.owner_name ? `Owner: ${place.owner_name}` : null].filter(Boolean).join(" · ")}</p>
                    </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setQuickTouchpoint({
                            related_place_id: place.id,
                            subject: `Canvassing note: ${place.place_name || place.line1 || "Place"}`,
                            touchpoint_type: "canvassing",
                          })
                        }
                      >
                        Log Visit
                      </Button>
                      <Badge variant="outline">{place.use_type || "place"}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              {!places.isLoading && !(places.data?.rows || []).length ? (
                <p className="text-sm text-slate-500 py-8 text-center">No places found.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <QuickTouchpointPanel defaults={quickTouchpoint} onCancel={() => setQuickTouchpoint(null)} />
          <PlaceForm onSubmit={(payload) => createPlace.mutate(payload)} isSaving={createPlace.isPending} />
        </div>
      </div>
    </div>
  );
}

function ReportBars({ title, rows, labelKey, valueKey }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length ? (
          rows.map((row, idx) => (
            <div key={`${row[labelKey]}-${idx}`} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{row[labelKey] || "—"}</span>
                <span className="text-slate-500">{row[valueKey]}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-[#835879]" style={{ width: `${((Number(row[valueKey]) || 0) / max) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

const tagTypeMeta = [
  { type: "contact", label: "People", icon: Users },
  { type: "entity", label: "Businesses", icon: Building2 },
  { type: "place", label: "Places", icon: MapPin },
  { type: "general", label: "General", icon: Tags },
];

function TagLibraryRow({ tag, siblings = [] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm", "tags"] });
  const update = useMutation({
    mutationFn: (body) => apiFetch(`/crm/tags/${tag.id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
    onError: (error) => {
      if (/already exists/i.test(error.message)) {
        const target = siblings.find(
          (other) => other.id !== tag.id && other.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (target) {
          offerMerge(target);
          return;
        }
      }
      toast.error(error.message);
    },
  });
  const mergeInto = useMutation({
    mutationFn: (targetId) =>
      apiFetch(`/crm/tags/${tag.id}/merge`, { method: "POST", body: JSON.stringify({ target_tag_id: targetId }) }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      toast.success("Tags merged");
    },
    onError: (error) => toast.error(error.message),
  });
  const offerMerge = (target) => {
    if (
      window.confirm(
        `A tag named "${target.name}" already exists. Merge "${tag.name}" into it?\n\n` +
          `All ${tag.usage_count || 0} record(s) tagged "${tag.name}" will be tagged "${target.name}", and "${tag.name}" will be removed.`
      )
    ) {
      mergeInto.mutate(target.id);
    }
  };
  const submitRename = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === tag.name.toLowerCase()) {
      setEditing(false);
      return;
    }
    const target = siblings.find(
      (other) => other.id !== tag.id && other.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (target) {
      offerMerge(target);
      return;
    }
    update.mutate({ name: trimmed });
  };
  const remove = useMutation({
    mutationFn: () => apiFetch(`/crm/tags/${tag.id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Tag deleted");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-white dark:bg-slate-950">
      <button
        type="button"
        title={tag.is_curated ? "Key tag — click to unmark" : "Mark as key tag"}
        className={tag.is_curated ? "text-[#835879]" : "text-slate-300 hover:text-slate-400"}
        onClick={() => update.mutate({ is_curated: !tag.is_curated })}
      >
        <Star className={`w-4 h-4 ${tag.is_curated ? "fill-[#835879]" : ""}`} />
      </button>
      {editing ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitRename();
            }
          }}
          className="h-8 flex-1"
        />
      ) : (
        <span className="flex-1 text-sm font-medium">{tag.name}</span>
      )}
      <Badge variant="outline" className="shrink-0">{tag.usage_count || 0} uses</Badge>
      {editing ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!name.trim() || update.isPending || mergeInto.isPending}
            onClick={submitRename}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setName(tag.name); setEditing(false); }}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)} title="Rename">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              if (window.confirm(`Delete "${tag.name}"? This removes it from ${tag.usage_count || 0} record(s).`)) {
                remove.mutate();
              }
            }}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}

function TagLibraryGroup({ type, label, icon }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState(true);
  const tagList = useQuery({
    queryKey: ["crm", "tags", type],
    queryFn: () => apiFetch(`/crm/tags?type=${type}`),
  });
  const tags = tagList.data || [];
  const createTag = useMutation({
    mutationFn: (body) => apiFetch("/crm/tags", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "tags", type] });
      setNewName("");
      toast.success("Tag saved");
    },
    onError: (error) => toast.error(error.message),
  });
  const seedStarters = useMutation({
    mutationFn: async () => {
      const names = starterTags[type] || [];
      const existing = new Set(tags.map((tag) => tag.name.toLowerCase()));
      const missing = names.filter((name) => !existing.has(name.toLowerCase()));
      for (const name of missing) {
        await apiFetch("/crm/tags", {
          method: "POST",
          body: JSON.stringify({ name, tag_type: type, is_curated: true }),
        });
      }
      return missing.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "tags", type] });
      toast.success(count ? "Starter key tags added" : "Starter tags already exist");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {React.createElement(icon, { className: "w-4 h-4 text-[#835879]" })}
          {label} tags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {tags.length ? (
            tags.map((tag) => <TagLibraryRow key={tag.id} tag={tag} siblings={tags} />)
          ) : (
            <p className="text-sm text-slate-500">No tags yet.</p>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t pt-3">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  e.preventDefault();
                  createTag.mutate({ name: newName.trim(), tag_type: type, is_curated: newKey });
                }
              }}
              placeholder="Add a tag"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!newName.trim() || createTag.isPending}
              onClick={() => createTag.mutate({ name: newName.trim(), tag_type: type, is_curated: newKey })}
            >
              Add
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={newKey} onChange={(e) => setNewKey(e.target.checked)} />
            Mark as key tag (shown as a suggestion on forms)
          </label>
          <Button type="button" variant="ghost" className="self-start" disabled={seedStarters.isPending} onClick={() => seedStarters.mutate()}>
            <Plus className="w-4 h-4 mr-2" />
            Add starter key tags
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TagLibrarySection() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Define a consistent set of <span className="font-medium">key tags</span> your team uses across records — for
            example, use one "donor" tag instead of "donor", "contributor", and "giver". Key tags (★) appear as
            suggestions when tagging records. Anyone can still add custom tags where needed.
          </p>
        </CardContent>
      </Card>
      <div className="grid lg:grid-cols-2 gap-4">
        {tagTypeMeta.map((meta) => (
          <TagLibraryGroup key={meta.type} type={meta.type} label={meta.label} icon={meta.icon} />
        ))}
      </div>
    </div>
  );
}

function ReportsSection() {
  const reports = useQuery({
    queryKey: ["crm", "reports"],
    queryFn: () => apiFetch("/crm/reports"),
  });
  if (reports.isLoading) return <p className="text-sm text-slate-500">Loading reports…</p>;
  const data = reports.data || {};
  const totals = data.totals || {};
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="People" value={totals.contacts} />
        <StatCard icon={Building2} label="Businesses" value={totals.entities} />
        <StatCard icon={MapPin} label="Places" value={totals.places} />
        <StatCard icon={Activity} label="Touchpoints" value={totals.touchpoints} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-8">
            <div>
              <p className="text-3xl font-bold text-[#2d4650] dark:text-slate-100">{data.follow_ups?.open || 0}</p>
              <p className="text-sm text-slate-500">Open</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">{data.follow_ups?.overdue || 0}</p>
              <p className="text-sm text-slate-500">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <ReportBars title="Records by owner" rows={data.owners || []} labelKey="owner" valueKey="count" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <ReportBars title="Touchpoints by type" rows={data.touchpoints_by_type || []} labelKey="touchpoint_type" valueKey="count" />
        <ReportBars title="Touchpoints by week (last 8)" rows={data.touchpoints_by_week || []} labelKey="week" valueKey="count" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <ReportBars title="People by status" rows={data.status?.contacts || []} labelKey="status" valueKey="count" />
        <ReportBars title="Businesses by status" rows={data.status?.entities || []} labelKey="status" valueKey="count" />
        <ReportBars title="Places by occupancy" rows={data.status?.places || []} labelKey="status" valueKey="count" />
      </div>
    </div>
  );
}

function DistrictsSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", district_type: "", geometry: "" });
  const [editing, setEditing] = useState(null);
  const districts = useQuery({
    queryKey: ["crm", "districts"],
    queryFn: () => apiFetch("/crm/districts"),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm", "districts"] });
  const parseGeometry = (text) => {
    if (!text || !text.trim()) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      toast.error("Geometry must be valid GeoJSON");
      throw new Error("Invalid GeoJSON");
    }
  };
  const createDistrict = useMutation({
    mutationFn: (payload) => apiFetch("/crm/districts", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      invalidate();
      toast.success("District created");
      setForm({ name: "", district_type: "", geometry: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const updateDistrict = useMutation({
    mutationFn: ({ id, payload }) => apiFetch(`/crm/districts/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      invalidate();
      toast.success("District updated");
      setEditing(null);
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteDistrict = useMutation({
    mutationFn: (id) => apiFetch(`/crm/districts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("District deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  const submitCreate = () => {
    if (!form.name.trim()) {
      toast.error("District name is required");
      return;
    }
    let geometry;
    try {
      geometry = parseGeometry(form.geometry);
    } catch {
      return;
    }
    createDistrict.mutate({
      name: form.name,
      district_type: form.district_type || undefined,
      geometry_geojson: geometry,
    });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Districts</CardTitle>
          <p className="text-sm text-slate-500">Group places into neighborhoods, BIDs, wards, or service areas. Districts with geometry render as map overlays.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(districts.data || []).map((district) => (
            <div key={district.id} className="border rounded-xl p-3">
              {editing?.id === district.id ? (
                <div className="space-y-2">
                  <Input value={editing.name} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} />
                  <Input
                    placeholder="Type (e.g. BID, ward)"
                    value={editing.district_type || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, district_type: e.target.value }))}
                  />
                  <Textarea
                    placeholder="GeoJSON geometry (optional)"
                    value={editing.geometry || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, geometry: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={updateDistrict.isPending}
                      onClick={() => {
                        let geometry;
                        try {
                          geometry = parseGeometry(editing.geometry);
                        } catch {
                          return;
                        }
                        updateDistrict.mutate({
                          id: district.id,
                          payload: {
                            name: editing.name,
                            district_type: editing.district_type || null,
                            geometry_geojson: geometry,
                          },
                        });
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{district.name}</p>
                    <p className="text-sm text-slate-500">
                      {[district.district_type, `${district.place_count} place${district.place_count === 1 ? "" : "s"}`, district.geometry_geojson ? "Has map overlay" : "No overlay"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!district.is_active ? <Badge variant="outline">Inactive</Badge> : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateDistrict.mutate({ id: district.id, payload: { is_active: !district.is_active } })}
                    >
                      {district.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditing({
                          id: district.id,
                          name: district.name,
                          district_type: district.district_type || "",
                          geometry: district.geometry_geojson ? JSON.stringify(district.geometry_geojson, null, 2) : "",
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteDistrict.mutate(district.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!districts.isLoading && !(districts.data || []).length ? (
            <p className="text-sm text-slate-500 py-8 text-center">No districts yet. Create one to organize places.</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add District
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label>Type</Label>
            <Input placeholder="BID, ward, neighborhood…" value={form.district_type} onChange={(e) => setForm((p) => ({ ...p, district_type: e.target.value }))} />
          </div>
          <div>
            <Label>Boundary GeoJSON (optional)</Label>
            <Textarea
              placeholder='{"type":"Polygon","coordinates":[...]}'
              value={form.geometry}
              onChange={(e) => setForm((p) => ({ ...p, geometry: e.target.value }))}
            />
            <p className="text-xs text-slate-500 mt-1">Paste a Polygon, Feature, or FeatureCollection to draw this district on place maps.</p>
          </div>
          <Button disabled={createDistrict.isPending} onClick={submitCreate}>Save District</Button>
        </CardContent>
      </Card>
    </div>
  );
}

const ACTIVITY_RECORD_TYPES = [
  { id: "contact", label: "Person", searchPath: "/crm/contacts", idField: "related_contact_id", placeholder: "Search people" },
  { id: "entity", label: "Business", searchPath: "/crm/entities", idField: "related_entity_id", placeholder: "Search businesses" },
  { id: "place", label: "Place", searchPath: "/crm/places", idField: "related_place_id", placeholder: "Search places" },
];

function ActivityComposer() {
  const [recordType, setRecordType] = useState("contact");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const config = ACTIVITY_RECORD_TYPES.find((entry) => entry.id === recordType) || ACTIVITY_RECORD_TYPES[0];
  const results = useQuery({
    queryKey: ["crm", "activity-picker", recordType, query],
    queryFn: () => apiFetch(`${config.searchPath}?query=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 1,
  });
  const composerDefaults = selected ? { [config.idField]: selected.id } : {};
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Log activity</CardTitle>
          <p className="text-sm text-slate-500">Attach this touchpoint to a person, business, or place.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {ACTIVITY_RECORD_TYPES.map((entry) => (
              <Button
                key={entry.id}
                variant={recordType === entry.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setRecordType(entry.id);
                  setSelected(null);
                }}
              >
                {entry.label}
              </Button>
            ))}
          </div>
          {selected ? (
            <div className="flex items-center justify-between rounded-xl border p-2 text-sm">
              <span className="font-medium">{getRecordLabel(selected)}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Change</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <SearchBox value={query} onChange={setQuery} placeholder={config.placeholder} />
              {query.trim().length > 1 ? (
                <div className="max-h-40 overflow-auto rounded-xl border divide-y">
                  {(results.data || []).map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                      onClick={() => {
                        setSelected(record);
                        setQuery("");
                      }}
                    >
                      <p className="text-sm font-medium">{getRecordLabel(record)}</p>
                      <p className="text-xs text-slate-500">{getRecordSubLabel(record)}</p>
                    </button>
                  ))}
                  {!(results.data || []).length ? <p className="p-2 text-xs text-slate-500">No matches.</p> : null}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
      <TouchpointComposer key={selected?.id || "none"} defaults={composerDefaults} onSaved={() => setSelected(null)} />
    </div>
  );
}

function ActivitySection() {
  const touchpoints = useQuery({
    queryKey: ["crm", "touchpoints"],
    queryFn: () => apiFetch("/crm/touchpoints"),
  });
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(touchpoints.data || []).map((item) => (
            <div key={item.id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{item.subject || item.touchpoint_type}</p>
                <Badge variant="outline">{item.touchpoint_type}</Badge>
              </div>
              <p className="text-sm text-slate-500">{[item.contact_name, item.entity_name, item.place_name].filter(Boolean).join(" · ")}</p>
              {item.body ? <p className="text-sm mt-2 whitespace-pre-wrap">{item.body}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
      <ActivityComposer />
    </div>
  );
}

const IMPORT_TARGET_LABELS = { contacts: "Contacts", entities: "Businesses", places: "Places" };

function downloadCsvFile(filename, sheet) {
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function suggestImportField(header, fields) {
  const key = String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!key) return "ignore";
  for (const field of fields) {
    const fieldKey = field.key.replace(/_/g, " ");
    const label = field.label.toLowerCase();
    if (key === fieldKey || key === field.key) return field.key;
    if (label.includes(key) || key.includes(fieldKey)) return field.key;
  }
  return "ignore";
}

function ImportMappingPanel({ batch, onClose }) {
  const queryClient = useQueryClient();
  const [overrides, setOverrides] = useState({});
  const [saveAs, setSaveAs] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);
  const [geocode, setGeocode] = useState(batch.target_type === "places");
  const [importTag, setImportTag] = useState("");

  const preview = useQuery({
    queryKey: ["crm", "imports", batch.id, "preview"],
    queryFn: () => apiFetch(`/crm/imports/${batch.id}/preview`),
  });
  const fieldsQuery = useQuery({
    queryKey: ["crm", "import-fields", batch.target_type],
    queryFn: () => apiFetch(`/crm/import-fields?target_type=${batch.target_type}`),
  });
  const errorsQuery = useQuery({
    queryKey: ["crm", "imports", batch.id, "errors"],
    queryFn: () => apiFetch(`/crm/imports/${batch.id}/errors`),
  });

  const fields = useMemo(() => fieldsQuery.data?.fields || [], [fieldsQuery.data]);
  const rows = useMemo(() => preview.data?.rows || [], [preview.data]);
  const headers = useMemo(() => {
    const first = rows.find((row) => row.raw_json && typeof row.raw_json === "object");
    if (!first) return [];
    return Object.keys(first.raw_json).filter((key) => key !== "_mapping");
  }, [rows]);
  const autoMapping = useMemo(() => {
    const map = {};
    for (const header of headers) map[header] = suggestImportField(header, fields);
    return map;
  }, [headers, fields]);
  const mapping = { ...autoMapping, ...overrides };

  const saveMapping = useMutation({
    mutationFn: () =>
      apiFetch(`/crm/imports/${batch.id}/map`, {
        method: "POST",
        body: JSON.stringify({ mapping, save_as: saveAs || undefined }),
      }),
    onSuccess: () => toast.success("Column mapping saved"),
    onError: (error) => toast.error(error.message),
  });
  const validate = useMutation({
    mutationFn: () => apiFetch(`/crm/imports/${batch.id}/validate`, { method: "POST" }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "imports", batch.id, "errors"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "imports"] });
      if (result.valid) toast.success("All rows valid");
      else toast.warning(`${result.error_rows} row(s) need attention`);
    },
    onError: (error) => toast.error(error.message),
  });
  const commit = useMutation({
    mutationFn: () =>
      apiFetch(`/crm/imports/${batch.id}/commit`, {
        method: "POST",
        body: JSON.stringify({ skip_existing: skipExisting, geocode, import_tag: importTag || undefined }),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success(`Imported ${result.created}, skipped ${result.skipped}, errors ${result.errors}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const aiMap = useMutation({
    mutationFn: () => apiFetch(`/crm/imports/${batch.id}/ai-map`, { method: "POST" }),
    onSuccess: (result) => {
      const suggested = result?.mapping || {};
      setOverrides((prev) => ({ ...prev, ...suggested }));
      const matched = Object.values(suggested).filter((value) => value && value !== "ignore").length;
      toast.success(matched ? `AI matched ${matched} column(s)` : "AI couldn't confidently match any columns");
    },
    onError: (error) => toast.error(error.message),
  });

  const runMapThenValidate = async () => {
    await saveMapping.mutateAsync();
    await validate.mutateAsync();
  };
  const downloadFailedRows = () => {
    const errorRows = errorsQuery.data || [];
    if (!errorRows.length) {
      toast.info("No failed rows to download");
      return;
    }
    const data = errorRows.map((err) => ({
      row_number: err.row_number,
      field: err.field_name,
      problem: err.message,
      ...(err.raw_json || {}),
    }));
    downloadCsvFile(`import-errors-${batch.id}.csv`, XLSX.utils.json_to_sheet(data));
  };

  const sampleFor = (header) => {
    const first = rows.find((row) => row.raw_json && row.raw_json[header]);
    return first ? String(first.raw_json[header]).slice(0, 40) : "";
  };
  const errorRows = errorsQuery.data || [];
  const isImporting = batch.status === "importing";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Map columns &middot; {batch.source_filename || "import"}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </CardTitle>
        <p className="text-sm text-slate-500">
          Match each spreadsheet column to a {IMPORT_TARGET_LABELS[batch.target_type] || batch.target_type} field. Unmatched columns are ignored.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {preview.isLoading ? <p className="text-sm text-slate-500">Loading preview...</p> : null}
        {headers.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              We pre-match columns automatically. Use AI to match unusual or differently named columns, then review below.
            </p>
            <Button variant="outline" size="sm" onClick={() => aiMap.mutate()} disabled={aiMap.isPending || isImporting}>
              <Sparkles className="w-4 h-4 mr-1" />
              {aiMap.isPending ? "Matching..." : "Auto-map with AI"}
            </Button>
          </div>
        ) : null}
        {headers.length ? (
          <div className="overflow-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="text-left p-2 font-medium">Spreadsheet column</th>
                  <th className="text-left p-2 font-medium">Sample</th>
                  <th className="text-left p-2 font-medium">Import as</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((header) => (
                  <tr key={header} className="border-t">
                    <td className="p-2 font-medium">{header}</td>
                    <td className="p-2 text-slate-500">{sampleFor(header)}</td>
                    <td className="p-2">
                      <select
                        className="w-full border rounded-md h-9 px-2 bg-white dark:bg-slate-950"
                        value={mapping[header] || "ignore"}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, [header]: e.target.value }))}
                      >
                        <option value="ignore">(do not import)</option>
                        {fields.map((field) => (
                          <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !preview.isLoading && <p className="text-sm text-slate-500">No rows detected in this file.</p>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Save mapping as (optional)</Label>
            <Input value={saveAs} onChange={(e) => setSaveAs(e.target.value)} placeholder="e.g. Mailchimp export" />
          </div>
          <div>
            <Label>Tag every imported record (optional)</Label>
            <Input value={importTag} onChange={(e) => setImportTag(e.target.value)} placeholder="e.g. 2026 migration" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)} />
            Skip records that already exist (match by email / name / parcel)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={geocode} onChange={(e) => setGeocode(e.target.checked)} />
            Geocode addresses for the map
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => saveMapping.mutate()} disabled={saveMapping.isPending || isImporting}>Save mapping</Button>
          <Button variant="outline" onClick={runMapThenValidate} disabled={validate.isPending || saveMapping.isPending || isImporting}>Save &amp; validate</Button>
          <Button className="bg-[#835879] text-white" onClick={() => commit.mutate()} disabled={commit.isPending || isImporting}>
            {commit.isPending || isImporting ? "Importing..." : "Commit import"}
          </Button>
        </div>
        {isImporting ? (
          <div className="rounded-xl border border-[#835879]/30 bg-[#835879]/5 p-3">
            <p className="text-sm font-medium text-[#835879]">
              Importing… {batch.processed_count || 0}
              {batch.row_count ? ` / ${batch.row_count}` : ""} rows processed
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {batch.created_count || 0} created · {batch.skipped_count || 0} skipped · {batch.error_count || 0} errors.
              This runs in the background — you can leave this page and check back.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Commit uses the last saved mapping. Click &quot;Save mapping&quot; or &quot;Save &amp; validate&quot; before committing.</p>
        )}

        {errorRows.length ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4" /> {errorRows.length} validation issue(s)
              </p>
              <Button variant="outline" size="sm" onClick={downloadFailedRows}>
                <Download className="w-4 h-4 mr-1" /> Download failed rows
              </Button>
            </div>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 max-h-48 overflow-auto">
              {errorRows.slice(0, 25).map((err) => (
                <li key={err.id}>Row {err.row_number}: {err.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ImportsSection() {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState("contacts");
  const [activeBatchId, setActiveBatchId] = useState(null);
  const imports = useQuery({
    queryKey: ["crm", "imports"],
    queryFn: () => apiFetch("/crm/imports"),
    refetchInterval: (query) =>
      (query.state.data || []).some((batch) => batch.status === "importing") ? 2500 : false,
  });
  const templateFields = useQuery({
    queryKey: ["crm", "import-fields", targetType],
    queryFn: () => apiFetch(`/crm/import-fields?target_type=${targetType}`),
  });
  const upload = useMutation({
    mutationFn: async (file) => {
      let uploadFile = file;
      if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        uploadFile = new File([csv], `${file.name}.csv`, { type: "text/csv" });
      }
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("target_type", targetType);
      formData.append("source_system", "spreadsheet");
      return apiFetch("/crm/imports/upload", { method: "POST", body: formData });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "imports"] });
      toast.success("Import uploaded - map the columns next");
      if (result?.batch?.id) setActiveBatchId(result.batch.id);
    },
    onError: (error) => toast.error(error.message),
  });
  const rollback = useMutation({
    mutationFn: (id) => apiFetch(`/crm/imports/${id}/rollback`, { method: "POST" }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success(`Rolled back ${result.count} record(s)`);
    },
    onError: (error) => toast.error(error.message),
  });

  const downloadTemplate = () => {
    const labels = (templateFields.data?.fields || []).map((field) => field.label);
    if (!labels.length) return;
    downloadCsvFile(`${targetType}-import-template.csv`, XLSX.utils.aoa_to_sheet([labels]));
  };

  const activeBatch = (imports.data || []).find((batch) => batch.id === activeBatchId) || null;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Upload Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Target type</Label>
              <select className="w-full border rounded-md h-10 px-3 bg-white dark:bg-slate-950" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
                <option value="contacts">Contacts</option>
                <option value="entities">Businesses</option>
                <option value="places">Places / properties</option>
              </select>
            </div>
            <Button variant="outline" className="w-full" onClick={downloadTemplate} disabled={!templateFields.data}>
              <Download className="w-4 h-4 mr-1" /> Download {IMPORT_TARGET_LABELS[targetType]} template
            </Button>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
            <p className="text-sm text-slate-500">Upload a CSV or Excel file, map its columns to CRM fields, validate, then commit. Imports can be tagged and rolled back as a batch.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Import Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(imports.data || []).map((batch) => (
              <div key={batch.id} className="border rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-medium">{batch.source_filename || batch.source_system}</p>
                  <p className="text-sm text-slate-500">{IMPORT_TARGET_LABELS[batch.target_type] || batch.target_type} &middot; {batch.row_count} rows &middot; {batch.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={activeBatchId === batch.id ? "default" : "outline"} onClick={() => setActiveBatchId(batch.id)}>
                    {batch.status === "completed" ? "Review" : "Map & import"}
                  </Button>
                  {batch.status === "completed" ? (
                    <Button variant="outline" onClick={() => rollback.mutate(batch.id)}>Roll back</Button>
                  ) : null}
                </div>
              </div>
            ))}
            {!(imports.data || []).length ? <p className="text-sm text-slate-500">No imports yet. Upload a file to get started.</p> : null}
          </CardContent>
        </Card>
      </div>
      {activeBatch ? <ImportMappingPanel key={activeBatch.id} batch={activeBatch} onClose={() => setActiveBatchId(null)} /> : null}
    </div>
  );
}

function DuplicatesSection() {
  const queryClient = useQueryClient();
  const duplicates = useQuery({
    queryKey: ["crm", "duplicates"],
    queryFn: () => apiFetch("/crm/duplicates"),
  });
  const ignore = useMutation({
    mutationFn: (id) => apiFetch(`/crm/duplicates/${id}/ignore`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "duplicates"] });
      toast.success("Duplicate ignored");
    },
  });
  const merge = useMutation({
    mutationFn: (id) => apiFetch(`/crm/duplicates/${id}/merge`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Records merged");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Duplicate Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(duplicates.data || []).map((candidate) => (
          <div key={candidate.id} className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="font-medium">{candidate.record_type} match</p>
              <p className="text-sm text-slate-500">Score {candidate.score} · {candidate.record_id} ↔ {candidate.candidate_record_id}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => ignore.mutate(candidate.id)}>Ignore</Button>
              <Button className="bg-[#835879] text-white" onClick={() => merge.mutate(candidate.id)}>Merge</Button>
            </div>
          </div>
        ))}
        {!(duplicates.data || []).length ? <p className="text-sm text-slate-500">No pending duplicate candidates.</p> : null}
      </CardContent>
    </Card>
  );
}

function AudiencesSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", target_type: "contacts", query: "", tag: "" });
  const [preview, setPreview] = useState(null);
  const audiences = useQuery({
    queryKey: ["crm", "audiences"],
    queryFn: () => apiFetch("/crm/audiences"),
  });
  const create = useMutation({
    mutationFn: () =>
      apiFetch("/crm/audiences", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          target_type: form.target_type,
          filter_json: { query: form.query, tag: form.tag },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "audiences"] });
      toast.success("Audience saved");
      setForm({ name: "", target_type: "contacts", query: "", tag: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const exportRows = (rows) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audience");
    XLSX.writeFile(workbook, "crm-audience.csv");
  };
  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Saved Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label>Target</Label>
            <select className="w-full border rounded-md h-10 px-3 bg-white" value={form.target_type} onChange={(e) => setForm((p) => ({ ...p, target_type: e.target.value }))}>
              <option value="contacts">Contacts</option>
              <option value="entities">Businesses</option>
              <option value="places">Places</option>
            </select>
          </div>
          <div>
            <Label>Search filter</Label>
            <Input value={form.query} onChange={(e) => setForm((p) => ({ ...p, query: e.target.value }))} />
          </div>
          <div>
            <Label>Tag filter</Label>
            <TagFilter
              type={audienceTagType(form.target_type)}
              value={form.tag}
              onChange={(tag) => setForm((p) => ({ ...p, tag }))}
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Save Audience</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Audiences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(audiences.data || []).map((audience) => (
            <div key={audience.id} className="border rounded-xl p-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-medium">{audience.name}</p>
                  <p className="text-sm text-slate-500">{audience.target_type}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => apiFetch(`/crm/audiences/${audience.id}/preview`).then(setPreview)}>Preview</Button>
                  <Button variant="outline" onClick={() => apiFetch(`/crm/audiences/${audience.id}/snapshot`, { method: "POST" }).then(() => toast.success("Snapshot saved"))}>Snapshot</Button>
                </div>
              </div>
            </div>
          ))}
          {preview ? (
            <div className="border rounded-xl p-3 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium">Preview: {preview.count} records</p>
                <Button variant="outline" onClick={() => exportRows(preview.rows)}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              <div className="max-h-64 overflow-auto text-sm space-y-2">
                {(preview.rows || []).slice(0, 50).map((row) => (
                  <div key={row.id} className="border rounded-lg p-2 bg-white">
                    {row.display_name || row.name || row.place_name || row.id}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

const GRAPH_TYPE_PATH = { contact: "contacts", entity: "entities", place: "places" };
const GRAPH_TYPE_COLOR = { contact: "#2d4650", entity: "#835879", place: "#1d4ed8" };

function truncateLabel(text, max = 16) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function RelationshipGraph({ type, id }) {
  const navigate = useNavigate();
  const plural = GRAPH_TYPE_PATH[type];
  const graph = useQuery({
    queryKey: ["crm", type, id, "graph"],
    queryFn: () => apiFetch(`/crm/${plural}/${id}/graph`),
  });
  const data = graph.data;
  const layout = useMemo(() => {
    if (!data || !data.nodes?.length) return null;
    const W = 640;
    const H = 440;
    const cx = W / 2;
    const cy = H / 2;
    const others = data.nodes.filter((n) => `${n.type}:${n.id}` !== data.center);
    const R = Math.min(180, 110 + others.length * 6);
    const pos = new Map();
    pos.set(data.center, { x: cx, y: cy });
    others.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(others.length, 1) - Math.PI / 2;
      pos.set(`${n.type}:${n.id}`, { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) });
    });
    return { W, H, pos, others };
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          Relationship Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        {graph.isLoading ? (
          <p className="text-sm text-slate-500">Building relationship map…</p>
        ) : !layout || !layout.others.length ? (
          <p className="text-sm text-slate-500">No connected records yet. Add relationships to see the map.</p>
        ) : (
          <>
            <svg viewBox={`0 0 ${layout.W} ${layout.H}`} className="w-full h-auto" role="img">
              {data.edges.map((edge) => {
                const s = layout.pos.get(edge.source);
                const t = layout.pos.get(edge.target);
                if (!s || !t) return null;
                return <line key={edge.id} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#cbd5e1" strokeWidth={1.5} />;
              })}
              {data.nodes.map((node) => {
                const key = `${node.type}:${node.id}`;
                const p = layout.pos.get(key);
                if (!p) return null;
                const isCenter = key === data.center;
                const color = GRAPH_TYPE_COLOR[node.type] || "#475569";
                return (
                  <g
                    key={key}
                    transform={`translate(${p.x}, ${p.y})`}
                    style={{ cursor: isCenter ? "default" : "pointer" }}
                    onClick={() => {
                      if (!isCenter) navigate(`/crm/${GRAPH_TYPE_PATH[node.type]}/${node.id}`);
                    }}
                  >
                    <circle r={isCenter ? 30 : 22} fill={color} opacity={isCenter ? 1 : 0.85} />
                    <text textAnchor="middle" dy={isCenter ? 46 : 38} fontSize="11" fill="#334155">
                      {truncateLabel(node.label)}
                    </text>
                    {node.sublabel ? (
                      <text textAnchor="middle" dy={isCenter ? 58 : 50} fontSize="9" fill="#94a3b8">
                        {truncateLabel(node.sublabel, 20)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: GRAPH_TYPE_COLOR.contact }} /> Person</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: GRAPH_TYPE_COLOR.entity }} /> Business</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: GRAPH_TYPE_COLOR.place }} /> Place</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PlaceProfileMap({ place }) {
  const districts = useQuery({
    queryKey: ["crm", "districts"],
    queryFn: () => apiFetch("/crm/districts"),
  });
  const lat = Number(place.lat);
  const lng = Number(place.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const district = (districts.data || []).find((d) => d.id === place.district_id);
  const overlays = useMemo(() => buildDistrictOverlays(district ? [district] : []), [district]);
  if (!hasCoords && !overlays.length) {
    return (
      <div className="mt-4 rounded-xl border bg-slate-100 p-6 text-center text-slate-500">
        <MapPin className="w-8 h-8 mx-auto mb-2" />
        Add an address (for coordinates) or assign a district with a boundary to see this place on the map.
      </div>
    );
  }
  const stops = hasCoords
    ? [{
        id: place.id,
        name: place.place_name || place.line1 || "Place",
        address_text: [place.line1, place.city, place.state].filter(Boolean).join(", "),
        lat,
        lng,
      }]
    : [];
  return (
    <div className="mt-4">
      <PassportMap stops={stops} stamps={[]} mapConfig={{}} showControls={false} heightClass="h-[280px]" overlays={overlays} />
      {district ? <p className="text-xs text-slate-500 mt-2">District: {district.name}</p> : null}
    </div>
  );
}

function ProfileTasksCard({ type, id }) {
  const queryClient = useQueryClient();
  const plural = type === "contact" ? "contacts" : type === "entity" ? "entities" : "places";
  const tasks = useQuery({
    queryKey: ["crm", type, id, "tasks"],
    queryFn: () => apiFetch(`/crm/${plural}/${id}/tasks`),
  });
  const complete = useMutation({
    mutationFn: (taskId) =>
      apiFetch(`/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", type, id] });
      toast.success("Task completed");
    },
    onError: (error) => toast.error(error.message),
  });
  const openTasks = (tasks.data || []).filter((task) => task.status !== "completed" && task.status !== "cancelled");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Tasks & Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {openTasks.map((task) => (
          <div key={task.id} className="flex items-start justify-between gap-2 border rounded-lg p-3">
            <div className="min-w-0">
              <p className="font-medium">{task.title}</p>
              <p className="text-xs text-slate-500">
                {[task.due_date ? `Due ${formatCrmDate(task.due_date)}` : "No due date", task.assigned_to_name].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button variant="ghost" size="sm" disabled={complete.isPending} onClick={() => complete.mutate(task.id)}>
              Done
            </Button>
          </div>
        ))}
        {!openTasks.length ? <p className="text-sm text-slate-500">No open tasks. Use a touchpoint reminder to add one.</p> : null}
      </CardContent>
    </Card>
  );
}

function ContactInfoManager({ contactId, emails = [], phones = [] }) {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState({ value: "", label: "" });
  const [newPhone, setNewPhone] = useState({ value: "", label: "" });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm", "contact", contactId] });

  const addEmail = useMutation({
    mutationFn: () =>
      apiFetch(`/crm/contacts/${contactId}/emails`, {
        method: "POST",
        body: JSON.stringify({
          email: newEmail.value.trim(),
          label: newEmail.label.trim() || null,
          is_primary: emails.length === 0,
        }),
      }),
    onSuccess: () => {
      invalidate();
      setNewEmail({ value: "", label: "" });
      toast.success("Email added");
    },
    onError: (error) => toast.error(error.message),
  });
  const patchEmail = useMutation({
    mutationFn: ({ id, body }) => apiFetch(`/crm/contact-emails/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });
  const removeEmail = useMutation({
    mutationFn: (id) => apiFetch(`/crm/contact-emails/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Email removed");
    },
    onError: (error) => toast.error(error.message),
  });
  const addPhone = useMutation({
    mutationFn: () =>
      apiFetch(`/crm/contacts/${contactId}/phones`, {
        method: "POST",
        body: JSON.stringify({
          phone: newPhone.value.trim(),
          label: newPhone.label.trim() || null,
          is_primary: phones.length === 0,
        }),
      }),
    onSuccess: () => {
      invalidate();
      setNewPhone({ value: "", label: "" });
      toast.success("Phone added");
    },
    onError: (error) => toast.error(error.message),
  });
  const patchPhone = useMutation({
    mutationFn: ({ id, body }) => apiFetch(`/crm/contact-phones/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });
  const removePhone = useMutation({
    mutationFn: (id) => apiFetch(`/crm/contact-phones/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Phone removed");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Contact Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Emails</p>
          {emails.map((email) => (
            <div key={email.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
              <button
                type="button"
                title={email.is_primary ? "Primary email" : "Set as primary"}
                className={email.is_primary ? "text-[#835879]" : "text-slate-300 hover:text-slate-400"}
                onClick={() => !email.is_primary && patchEmail.mutate({ id: email.id, body: { is_primary: true } })}
              >
                <Star className={`w-4 h-4 ${email.is_primary ? "fill-[#835879]" : ""}`} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{email.email}</p>
                {email.label ? <p className="text-xs text-slate-500">{email.label}</p> : null}
              </div>
              <button
                type="button"
                title={email.is_verified ? "Verified" : "Mark verified"}
                className={email.is_verified ? "text-emerald-600" : "text-slate-300 hover:text-slate-400"}
                onClick={() => patchEmail.mutate({ id: email.id, body: { is_verified: !email.is_verified } })}
              >
                <Check className="w-4 h-4" />
              </button>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeEmail.mutate(email.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {!emails.length ? <p className="text-sm text-slate-500">No emails yet.</p> : null}
          <div className="flex gap-2">
            <Input
              type="email"
              className="flex-1"
              value={newEmail.value}
              onChange={(e) => setNewEmail((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="name@example.com"
            />
            <Input
              className="w-24"
              value={newEmail.label}
              onChange={(e) => setNewEmail((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Label"
            />
            <Button variant="outline" disabled={!newEmail.value.trim() || addEmail.isPending} onClick={() => addEmail.mutate()}>
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Phones</p>
          {phones.map((phone) => (
            <div key={phone.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
              <button
                type="button"
                title={phone.is_primary ? "Primary phone" : "Set as primary"}
                className={phone.is_primary ? "text-[#835879]" : "text-slate-300 hover:text-slate-400"}
                onClick={() => !phone.is_primary && patchPhone.mutate({ id: phone.id, body: { is_primary: true } })}
              >
                <Star className={`w-4 h-4 ${phone.is_primary ? "fill-[#835879]" : ""}`} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{phone.phone}</p>
                {phone.label ? <p className="text-xs text-slate-500">{phone.label}</p> : null}
              </div>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removePhone.mutate(phone.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {!phones.length ? <p className="text-sm text-slate-500">No phones yet.</p> : null}
          <div className="flex gap-2">
            <Input
              type="tel"
              className="flex-1"
              value={newPhone.value}
              onChange={(e) => setNewPhone((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="(555) 555-5555"
            />
            <Input
              className="w-24"
              value={newPhone.label}
              onChange={(e) => setNewPhone((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Label"
            />
            <Button variant="outline" disabled={!newPhone.value.trim() || addPhone.isPending} onClick={() => addPhone.mutate()}>
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileShell({ type, id }) {
  const endpoint = type === "contact" ? `/crm/contacts/${id}` : type === "entity" ? `/crm/entities/${id}` : `/crm/places/${id}`;
  const [profileTouchpoint, setProfileTouchpoint] = useState(null);
  const detail = useQuery({
    queryKey: ["crm", type, id],
    queryFn: () => apiFetch(endpoint),
  });
  const timeline = useQuery({
    queryKey: ["crm", type, id, "timeline"],
    queryFn: () => apiFetch(`/crm/${type === "contact" ? "contacts" : type === "entity" ? "entities" : "places"}/${id}/timeline`),
  });
  const title = detail.data?.display_name || detail.data?.name || detail.data?.place_name || detail.data?.line1 || "CRM Profile";
  const touchpointDefaults = {
    related_contact_id: type === "contact" ? id : undefined,
    related_entity_id: type === "entity" ? id : undefined,
    related_place_id: type === "place" ? id : undefined,
  };
  const applyTemplate = (template) =>
    setProfileTouchpoint({
      ...touchpointDefaults,
      ...template,
    });
  if (detail.isLoading) return <p className="p-8 text-slate-500">Loading profile…</p>;
  if (!detail.data) return <p className="p-8 text-slate-500">Profile not found.</p>;
  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Link to="/crm" className="text-sm text-[#835879]">Back to Relationship Manager</Link>
            <h1 className="text-3xl font-bold text-[#2d4650] dark:text-slate-100">{title}</h1>
            <p className="text-slate-500">{type === "contact" ? "Person profile" : type === "entity" ? "Business / organization profile" : "Place / property profile"}</p>
          </div>
          <Badge className="w-fit">{detail.data.status || detail.data.occupancy_status || "active"}</Badge>
        </div>
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <span className="text-slate-500">Owner</span>
                  <OwnerPicker recordType={type} id={id} ownerUserId={detail.data.owner_user_id} />
                </div>
                {type === "contact" ? (
                  <>
                    <p>Email: {detail.data.emails?.[0]?.email || "None"}</p>
                    <p>Phone: {detail.data.phones?.[0]?.phone || "None"}</p>
                    <p>Address: {[detail.data.address?.line1, detail.data.address?.city, detail.data.address?.state].filter(Boolean).join(", ") || "None"}</p>
                  </>
                ) : null}
                {type === "entity" ? (
                  <>
                    <p>Type: {detail.data.entity_type}</p>
                    <p>Category: {detail.data.category || "None"}</p>
                    <p>Email: {detail.data.general_email || "None"}</p>
                    <p>Phone: {detail.data.general_phone || "None"}</p>
                  </>
                ) : null}
                {type === "place" ? (
                  <>
                    <p>Address: {[detail.data.line1, detail.data.city, detail.data.state, detail.data.postal_code].filter(Boolean).join(", ") || "None"}</p>
                    <p>Occupancy: {detail.data.occupancy_status || "Unknown"}</p>
                    <p>Use type: {detail.data.use_type || "Unknown"}</p>
                    <PlaceProfileMap place={detail.data} />
                  </>
                ) : null}
                {detail.data.notes ? <p className="pt-2 whitespace-pre-wrap">{detail.data.notes}</p> : null}
              </CardContent>
            </Card>
            {type === "contact" ? (
              <ContactInfoManager
                contactId={id}
                emails={detail.data.emails || []}
                phones={detail.data.phones || []}
              />
            ) : null}
            <RelatedRecordsCard type={type} detail={detail.data} />
            <RelationshipGraph type={type} id={id} />
            <ProfileTasksCard type={type} id={id} />
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(timeline.data || detail.data.touchpoints || []).map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.title || item.subject || item.touchpoint_type}</p>
                        <p className="text-xs text-slate-500">
                          {item.happened_at || item.occurred_at ? new Date(item.happened_at || item.occurred_at).toLocaleString() : ""}
                        </p>
                      </div>
                      <Badge variant="outline">{item.type || item.touchpoint_type}</Badge>
                    </div>
                    {item.description || item.body ? <p className="text-sm mt-2 whitespace-pre-wrap">{item.description || item.body}</p> : null}
                  </div>
                ))}
                {!(timeline.data || detail.data.touchpoints || []).length ? (
                  <p className="text-sm text-slate-500">No timeline activity yet.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <RelationshipEditor type={type} recordId={id} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickTouchpointButtons onSelect={applyTemplate} />
              </CardContent>
            </Card>
            <TouchpointComposer key={JSON.stringify(profileTouchpoint || touchpointDefaults)} defaults={profileTouchpoint || touchpointDefaults} />
            <TagManager type={type} recordId={id} tags={detail.data.tags || []} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitMerge className="w-5 h-5" />
                  Duplicate Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(detail.data.duplicate_candidates || []).length ? (
                  <p className="text-sm text-amber-700">Possible duplicate records need review.</p>
                ) : (
                  <p className="text-sm text-slate-500">No duplicate warnings.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CRM() {
  const params = useParams();
  const location = useLocation();
  const defaultTab = useMemo(() => {
    if (location.pathname.includes("/imports")) return "imports";
    if (location.pathname.includes("/audiences")) return "audiences";
    if (location.pathname.includes("/touchpoints")) return "touchpoints";
    return "contacts";
  }, [location.pathname]);
  const [active, setActive] = useState(defaultTab);
  const summary = useQuery({
    queryKey: ["crm", "summary"],
    queryFn: () => apiFetch("/crm/summary"),
  });
  const dashboard = useQuery({
    queryKey: ["crm", "dashboard"],
    queryFn: () => apiFetch("/crm/dashboard"),
  });

  if (params.contactId) return <ProfileShell type="contact" id={params.contactId} />;
  if (params.entityId) return <ProfileShell type="entity" id={params.entityId} />;
  if (params.placeId) return <ProfileShell type="place" id={params.placeId} />;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 text-[#2d4650] dark:text-slate-100">
              <Users className="w-10 h-10" />
              Relationship Manager
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Manage people, businesses, places, relationships, communication history, imports, audiences, and GIS-ready property records.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="People" value={summary.data?.contacts} />
          <StatCard icon={Building2} label="Businesses" value={summary.data?.entities} />
          <StatCard icon={MapPin} label="Places" value={summary.data?.places} />
          <StatCard icon={Activity} label="Touchpoints" value={summary.data?.touchpoints} />
        </div>
        <CrmGettingStarted summary={summary.data} />
        <CrmDashboardWidgets data={dashboard.data} />
        <SectionTabs active={active} setActive={setActive} />
        {active === "contacts" ? <ContactsSection /> : null}
        {active === "entities" ? <EntitiesSection /> : null}
        {active === "places" ? <PlacesSection /> : null}
        {active === "districts" ? <DistrictsSection /> : null}
        {active === "reports" ? <ReportsSection /> : null}
        {active === "tags" ? <TagLibrarySection /> : null}
        {active === "touchpoints" ? <ActivitySection /> : null}
        {active === "imports" ? <ImportsSection /> : null}
        {active === "duplicates" ? <DuplicatesSection /> : null}
        {active === "audiences" ? <AudiencesSection /> : null}
      </div>
    </div>
  );
}
