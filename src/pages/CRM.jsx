import React, { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Activity,
  Building2,
  CopyCheck,
  Download,
  FileSpreadsheet,
  GitMerge,
  MapPin,
  Plus,
  Search,
  Tags,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const emptyContact = {
  first_name: "",
  last_name: "",
  preferred_name: "",
  email: "",
  phone: "",
  notes: "",
  source: "manual",
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
    ["touchpoints", "Activity", Activity],
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
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={(e) => setField("email", e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
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
          <Button
            disabled={isSaving}
            onClick={() => {
              onSubmit({
                first_name: form.first_name,
                last_name: form.last_name,
                preferred_name: form.preferred_name,
                emails: form.email ? [{ email: form.email, is_primary: true }] : [],
                phones: form.phone ? [{ phone: form.phone, is_primary: true }] : [],
                notes: form.notes,
                source: form.source,
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
  const mutation = useMutation({
    mutationFn: (payload) =>
      apiFetch("/crm/touchpoints", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Touchpoint saved");
      setForm((prev) => ({ ...prev, subject: "", body: "", follow_up_at: "" }));
      onSaved?.();
    },
    onError: (error) => toast.error(error.message),
  });
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
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate(form)}>
          Save Touchpoint
        </Button>
      </CardContent>
    </Card>
  );
}

function ContactsSection() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const contacts = useQuery({
    queryKey: ["crm", "contacts", query],
    queryFn: () => apiFetch(`/crm/contacts?query=${encodeURIComponent(query)}`),
  });
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
          <SearchBox value={query} onChange={setQuery} placeholder="Search by name or email" />
          <div className="divide-y">
            {(contacts.data?.rows || []).map((contact) => (
              <Link key={contact.id} to={`/crm/contacts/${contact.id}`} className="block py-3 hover:bg-slate-50 rounded-lg px-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{contact.display_name}</p>
                    <p className="text-sm text-slate-500">{contact.primary_email || contact.primary_phone || "No contact method yet"}</p>
                  </div>
                  <Badge variant="outline">{contact.status}</Badge>
                </div>
              </Link>
            ))}
            {!contacts.isLoading && !(contacts.data?.rows || []).length ? (
              <p className="text-sm text-slate-500 py-8 text-center">No contacts found.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <ContactForm onSubmit={(payload) => createContact.mutate(payload)} isSaving={createContact.isPending} />
    </div>
  );
}

function EntitiesSection() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const entities = useQuery({
    queryKey: ["crm", "entities", query],
    queryFn: () => apiFetch(`/crm/entities?query=${encodeURIComponent(query)}`),
  });
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
          <SearchBox value={query} onChange={setQuery} placeholder="Search by name, category, or email" />
          <div className="divide-y">
            {(entities.data?.rows || []).map((entity) => (
              <Link key={entity.id} to={`/crm/entities/${entity.id}`} className="block py-3 hover:bg-slate-50 rounded-lg px-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{entity.name}</p>
                    <p className="text-sm text-slate-500">{[entity.entity_type, entity.category, entity.general_email].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Badge variant="outline">{entity.status}</Badge>
                </div>
              </Link>
            ))}
            {!entities.isLoading && !(entities.data?.rows || []).length ? (
              <p className="text-sm text-slate-500 py-8 text-center">No businesses found.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <EntityForm onSubmit={(payload) => createEntity.mutate(payload)} isSaving={createEntity.isPending} />
    </div>
  );
}

function PlacesSection() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const places = useQuery({
    queryKey: ["crm", "places", query],
    queryFn: () => apiFetch(`/crm/places?query=${encodeURIComponent(query)}`),
  });
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
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Places and Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search by place, address, or parcel ID" />
          <div className="divide-y">
            {(places.data?.rows || []).map((place) => (
              <Link key={place.id} to={`/crm/places/${place.id}`} className="block py-3 hover:bg-slate-50 rounded-lg px-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{place.place_name || place.line1 || "Unnamed place"}</p>
                    <p className="text-sm text-slate-500">{[place.line1, place.city, place.state, place.occupancy_status].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Badge variant="outline">{place.use_type || "place"}</Badge>
                </div>
              </Link>
            ))}
            {!places.isLoading && !(places.data?.rows || []).length ? (
              <p className="text-sm text-slate-500 py-8 text-center">No places found.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <PlaceForm onSubmit={(payload) => createPlace.mutate(payload)} isSaving={createPlace.isPending} />
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
      <TouchpointComposer />
    </div>
  );
}

function ImportsSection() {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState("contacts");
  const imports = useQuery({
    queryKey: ["crm", "imports"],
    queryFn: () => apiFetch("/crm/imports"),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "imports"] });
      toast.success("Import uploaded");
    },
    onError: (error) => toast.error(error.message),
  });
  const commit = useMutation({
    mutationFn: (id) => apiFetch(`/crm/imports/${id}/commit`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Import committed");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
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
            <select className="w-full border rounded-md h-10 px-3 bg-white" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              <option value="contacts">Contacts</option>
              <option value="entities">Businesses</option>
            </select>
          </div>
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
          <p className="text-sm text-slate-500">CSV and Excel files are previewed into repeatable import batches before commit.</p>
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
                <p className="text-sm text-slate-500">{batch.target_type} · {batch.row_count} rows · {batch.status}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => commit.mutate(batch.id)}>Commit</Button>
                <Button variant="outline" onClick={() => apiFetch(`/crm/imports/${batch.id}/validate`, { method: "POST" }).then(() => toast.success("Validated"))}>Validate</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
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
            <Input value={form.tag} onChange={(e) => setForm((p) => ({ ...p, tag: e.target.value }))} />
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

function ProfileShell({ type, id }) {
  const endpoint = type === "contact" ? `/crm/contacts/${id}` : type === "entity" ? `/crm/entities/${id}` : `/crm/places/${id}`;
  const detail = useQuery({
    queryKey: ["crm", type, id],
    queryFn: () => apiFetch(endpoint),
  });
  const title = detail.data?.display_name || detail.data?.name || detail.data?.place_name || detail.data?.line1 || "CRM Profile";
  const touchpointDefaults = {
    related_contact_id: type === "contact" ? id : undefined,
    related_entity_id: type === "entity" ? id : undefined,
    related_place_id: type === "place" ? id : undefined,
  };
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
                    <div className="mt-4 rounded-xl border bg-slate-100 p-6 text-center text-slate-500">
                      <MapPin className="w-8 h-8 mx-auto mb-2" />
                      GIS map placeholder. Parcel geometry, district overlays, and canvassing layers can attach here.
                    </div>
                  </>
                ) : null}
                {detail.data.notes ? <p className="pt-2 whitespace-pre-wrap">{detail.data.notes}</p> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Related Records</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(detail.data.relationships || detail.data.people || detail.data.entities || []).map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <p className="font-medium">{item.entity_name || item.display_name || item.name || item.relationship_type}</p>
                    <p className="text-sm text-slate-500">{[item.relationship_type, item.role_title].filter(Boolean).join(" · ")}</p>
                  </div>
                ))}
                {(detail.data.places || []).map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <p className="font-medium">{item.place_name || item.line1}</p>
                    <p className="text-sm text-slate-500">{item.relationship_type}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(detail.data.touchpoints || []).map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <p className="font-medium">{item.subject || item.touchpoint_type}</p>
                    <p className="text-xs text-slate-500">{item.occurred_at ? new Date(item.occurred_at).toLocaleString() : ""}</p>
                    {item.body ? <p className="text-sm mt-2 whitespace-pre-wrap">{item.body}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <TouchpointComposer defaults={touchpointDefaults} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="w-5 h-5" />
                  Tags and Duplicate Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(detail.data.tags || []).map((tag) => (
                  <Badge key={tag.id} variant="outline">{tag.name}</Badge>
                ))}
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
        <SectionTabs active={active} setActive={setActive} />
        {active === "contacts" ? <ContactsSection /> : null}
        {active === "entities" ? <EntitiesSection /> : null}
        {active === "places" ? <PlacesSection /> : null}
        {active === "touchpoints" ? <ActivitySection /> : null}
        {active === "imports" ? <ImportsSection /> : null}
        {active === "duplicates" ? <DuplicatesSection /> : null}
        {active === "audiences" ? <AudiencesSection /> : null}
      </div>
    </div>
  );
}
