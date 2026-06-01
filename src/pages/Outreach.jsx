import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Activity,
  ClipboardList,
  Download,
  FileText,
  Map,
  MapPin,
  Phone,
  Plus,
  Route,
  Search,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api";
import PassportMap from "@/components/passport/PassportMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const campaignDefaults = {
  name: "",
  description: "",
  purpose_type: "",
  workflow_type: "outreach",
  status: "draft",
  start_date: "",
  end_date: "",
  related_event_id: "",
  related_audience_id: "",
  default_instructions: "",
  script_summary: "",
};

const targetListDefaults = {
  name: "",
  description: "",
  source_type: "manual",
  target_type: "places",
  query: "",
  tag: "",
  audience_id: "",
};

const customTargetDefaults = {
  display_name: "",
  target_type: "custom",
  address_text: "",
  phone: "",
  email: "",
  lat: "",
  lng: "",
  notes: "",
};

const questionDefaults = {
  question_text: "",
  question_type: "yes_no",
  options: "",
  is_required: false,
};

const interactionDefaults = {
  interaction_type: "in_person_visit",
  outcome: "completed",
  notes: "",
  follow_up_needed: false,
  follow_up_at: "",
  create_followup_task: false,
  followup_title: "",
};

const workflowLabels = {
  canvass: "Canvass",
  phonebank: "Phonebank",
  hybrid: "Hybrid",
  inspection: "Inspection",
  delivery: "Delivery",
  outreach: "Outreach",
};

const outcomeOptions = [
  "completed",
  "no_answer",
  "left_voicemail",
  "wrong_number",
  "call_back_later",
  "interested",
  "not_interested",
  "needs_follow_up",
  "skipped",
];

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, children }) {
  return (
    <select
      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#835879]/10 text-[#835879]">
          {React.createElement(icon, { className: "h-5 w-5" })}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-2xl font-semibold">{value ?? 0}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OutreachTabs({ active, onChange }) {
  const tabs = [
    ["campaigns", "Campaigns", ClipboardList],
    ["builder", "Builder", Plus],
    ["assignments", "Assignments", Users],
    ["field", "My Work", MapPin],
    ["review", "Review", Activity],
    ["reports", "Reports", Download],
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(([id, label, icon]) => (
        <Button
          key={id}
          type="button"
          variant={active === id ? "default" : "outline"}
          className={active === id ? "bg-[#835879] text-white" : ""}
          onClick={() => onChange(id)}
        >
          {React.createElement(icon, { className: "mr-2 h-4 w-4" })}
          {label}
        </Button>
      ))}
    </div>
  );
}

function OutreachMap({ targets = [], onSelectTarget }) {
  const stops = targets
    .filter((target) => Number.isFinite(Number(target.lat)) && Number.isFinite(Number(target.lng)))
    .map((target) => ({
      ...target,
      name: target.display_name,
      lat: Number(target.lat),
      lng: Number(target.lng),
    }));

  if (!stops.length) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
        No mapped targets yet. Add coordinates or generate targets from CRM records with addresses.
      </div>
    );
  }

  return (
    <PassportMap
      stops={stops}
      stamps={targets.filter((target) => target.status === "completed").map((target) => ({ stop_id: target.id }))}
      mapConfig={{}}
      showControls
      heightClass="h-[360px]"
      onSelectStop={onSelectTarget}
    />
  );
}

function CampaignList({ selectedId, onSelect, onCreate }) {
  const [query, setQuery] = useState("");
  const campaigns = useQuery({
    queryKey: ["outreach", "campaigns", query],
    queryFn: () => apiFetch(`/outreach/campaigns?query=${encodeURIComponent(query)}`),
  });
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignForm onSubmit={onCreate} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Outreach Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search campaigns" />
          </div>
          <div className="space-y-3">
            {(campaigns.data?.rows || []).map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedId === campaign.id ? "border-[#835879] bg-[#835879]/5" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
                onClick={() => onSelect(campaign.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{campaign.name}</p>
                    <p className="text-sm text-slate-500">{campaign.description || "No description yet"}</p>
                  </div>
                  <Badge>{workflowLabels[campaign.workflow_type] || campaign.workflow_type}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{campaign.status}</span>
                  <span>{campaign.target_count || 0} targets</span>
                  <span>{campaign.completed_count || 0} completed</span>
                </div>
              </button>
            ))}
            {!campaigns.isLoading && !(campaigns.data?.rows || []).length && (
              <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
                Start with a practical campaign like poster delivery, sponsor calls, vacancy checks, or business visits.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignForm({ initial = campaignDefaults, onSubmit, compact = false }) {
  const [form, setForm] = useState({ ...campaignDefaults, ...initial });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const events = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch("/events"),
    enabled: !compact,
  });
  const audiences = useQuery({
    queryKey: ["crm", "audiences"],
    queryFn: () => apiFetch("/crm/audiences"),
    enabled: !compact,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...form,
          related_event_id: form.related_event_id || null,
          related_audience_id: form.related_audience_id || null,
        });
      }}
    >
      <Field label="Name">
        <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Downtown poster delivery" />
      </Field>
      {!compact && (
        <Field label="Description">
          <Textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
        </Field>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Workflow">
          <SelectField value={form.workflow_type} onChange={(value) => update("workflow_type", value)}>
            {Object.entries(workflowLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </Field>
        <Field label="Status">
          <SelectField value={form.status} onChange={(value) => update("status", value)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </SelectField>
        </Field>
      </div>
      {!compact && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Start date">
              <Input type="date" value={form.start_date || ""} onChange={(event) => update("start_date", event.target.value)} />
            </Field>
            <Field label="End date">
              <Input type="date" value={form.end_date || ""} onChange={(event) => update("end_date", event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Related event">
              <SelectField value={form.related_event_id || ""} onChange={(value) => update("related_event_id", value)}>
                <option value="">No event</option>
                {(events.data || []).map((event) => (
                  <option key={event.id} value={event.id}>{event.title || event.name}</option>
                ))}
              </SelectField>
            </Field>
            <Field label="Audience / list">
              <SelectField value={form.related_audience_id || ""} onChange={(value) => update("related_audience_id", value)}>
                <option value="">No audience</option>
                {(audiences.data || []).map((audience) => (
                  <option key={audience.id} value={audience.id}>{audience.name}</option>
                ))}
              </SelectField>
            </Field>
          </div>
          <Field label="Default instructions">
            <Textarea value={form.default_instructions} onChange={(event) => update("default_instructions", event.target.value)} />
          </Field>
          <Field label="Script summary">
            <Textarea value={form.script_summary} onChange={(event) => update("script_summary", event.target.value)} />
          </Field>
        </>
      )}
      <Button type="submit" className="bg-[#835879] text-white">
        Save Campaign
      </Button>
    </form>
  );
}

function CampaignBuilder({ campaignId, onSelectCampaign }) {
  const queryClient = useQueryClient();
  const campaign = useQuery({
    queryKey: ["outreach", "campaign", campaignId],
    queryFn: () => apiFetch(`/outreach/campaigns/${campaignId}`),
    enabled: Boolean(campaignId),
  });
  const targets = useQuery({
    queryKey: ["outreach", "campaign-targets", campaignId],
    queryFn: () => apiFetch(`/outreach/campaigns/${campaignId}/targets?limit=250`),
    enabled: Boolean(campaignId),
  });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users"),
  });

  const invalidateCampaign = () => {
    queryClient.invalidateQueries({ queryKey: ["outreach"] });
  };

  const updateCampaign = useMutation({
    mutationFn: (payload) => apiFetch(`/outreach/campaigns/${campaignId}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success("Campaign updated");
      invalidateCampaign();
    },
    onError: (error) => toast.error(error.message),
  });

  if (!campaignId) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-slate-500">
          Select or create a campaign first. The builder will walk through details, targets, survey questions, scripts, turfing, and assignments.
        </CardContent>
      </Card>
    );
  }

  const data = campaign.data;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{data?.name || "Campaign Builder"}</CardTitle>
              <p className="text-sm text-slate-500">
                {workflowLabels[data?.workflow_type] || data?.workflow_type} workflow, {data?.status || "draft"} status
              </p>
            </div>
            <Button variant="outline" onClick={() => onSelectCampaign(null)}>
              Change Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data && <CampaignForm initial={data} onSubmit={(payload) => updateCampaign.mutate(payload)} />}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <TargetListBuilder campaignId={campaignId} onChanged={invalidateCampaign} />
          <SurveyBuilder campaignId={campaignId} surveys={data?.surveys || []} onChanged={invalidateCampaign} />
          <ScriptBuilder campaignId={campaignId} scripts={data?.scripts || []} onChanged={invalidateCampaign} />
          <AssignmentManager campaign={data} targets={targets.data?.rows || []} users={users.data || []} onChanged={invalidateCampaign} />
        </div>
        <div className="space-y-6">
          <MapAndTurfPanel campaignId={campaignId} targets={targets.data?.rows || []} turfs={data?.turfs || []} onChanged={invalidateCampaign} />
          <TargetTable targets={targets.data?.rows || []} onChanged={invalidateCampaign} />
        </div>
      </div>
    </div>
  );
}

function TargetListBuilder({ campaignId, onChanged }) {
  const [listForm, setListForm] = useState(targetListDefaults);
  const [selectedListId, setSelectedListId] = useState("");
  const [customTarget, setCustomTarget] = useState(customTargetDefaults);
  const queryClient = useQueryClient();
  const campaign = useQuery({
    queryKey: ["outreach", "campaign", campaignId],
    queryFn: () => apiFetch(`/outreach/campaigns/${campaignId}`),
    enabled: Boolean(campaignId),
  });

  const createList = useMutation({
    mutationFn: (payload) =>
      apiFetch(`/outreach/campaigns/${campaignId}/target-lists`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (row) => {
      toast.success("Target list created");
      setSelectedListId(row.id);
      setListForm(targetListDefaults);
      onChanged();
    },
    onError: (error) => toast.error(error.message),
  });

  const generateTargets = useMutation({
    mutationFn: ({ listId, filter }) =>
      apiFetch(`/outreach/target-lists/${listId}/generate`, {
        method: "POST",
        body: JSON.stringify({ filter_json: filter }),
      }),
    onSuccess: (result) => {
      toast.success(`Generated ${result.count || 0} targets`);
      queryClient.invalidateQueries({ queryKey: ["outreach"] });
      onChanged();
    },
    onError: (error) => toast.error(error.message),
  });

  const addTarget = useMutation({
    mutationFn: ({ listId, target }) =>
      apiFetch(`/outreach/target-lists/${listId}/targets`, {
        method: "POST",
        body: JSON.stringify(target),
      }),
    onSuccess: () => {
      toast.success("Target added");
      setCustomTarget(customTargetDefaults);
      onChanged();
    },
    onError: (error) => toast.error(error.message),
  });

  const targetLists = campaign.data?.target_lists || [];
  const activeListId = selectedListId || targetLists[0]?.id || "";
  const updateListForm = (key, value) => setListForm((current) => ({ ...current, [key]: value }));
  const updateTarget = (key, value) => setCustomTarget((current) => ({ ...current, [key]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target List Builder</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createList.mutate({
              name: listForm.name,
              description: listForm.description,
              source_type: listForm.source_type,
              filter_json: {
                source_type: listForm.target_type,
                query: listForm.query,
                tag: listForm.tag,
                audience_id: listForm.audience_id || undefined,
              },
            });
          }}
        >
          <Field label="List name">
            <Input value={listForm.name} onChange={(event) => updateListForm("name", event.target.value)} placeholder="Restaurants to visit" />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="CRM source">
              <SelectField value={listForm.target_type} onChange={(value) => updateListForm("target_type", value)}>
                <option value="places">Places/properties</option>
                <option value="organizations">Businesses/organizations</option>
                <option value="contacts">Contacts</option>
              </SelectField>
            </Field>
            <Field label="Tag filter">
              <Input value={listForm.tag} onChange={(event) => updateListForm("tag", event.target.value)} placeholder="vacant, restaurant, sponsor" />
            </Field>
          </div>
          <Field label="Search filter">
            <Input value={listForm.query} onChange={(event) => updateListForm("query", event.target.value)} placeholder="Optional CRM search" />
          </Field>
          <Button type="submit" className="bg-[#835879] text-white">
            Create List
          </Button>
        </form>

        <div className="space-y-3">
          <Field label="Active list">
            <SelectField value={activeListId} onChange={setSelectedListId}>
              <option value="">Select a list</option>
              {targetLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </SelectField>
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={!activeListId}
            onClick={() =>
              generateTargets.mutate({
                listId: activeListId,
                filter: {
                  source_type: listForm.target_type,
                  query: listForm.query,
                  tag: listForm.tag,
                  audience_id: listForm.audience_id || undefined,
                },
              })
            }
          >
            <Route className="mr-2 h-4 w-4" />
            Generate from CRM Filters
          </Button>

          <div className="rounded-xl border p-3">
            <p className="mb-3 text-sm font-medium">Add one-off target</p>
            <div className="space-y-2">
              <Input value={customTarget.display_name} onChange={(event) => updateTarget("display_name", event.target.value)} placeholder="Display name" />
              <Input value={customTarget.address_text} onChange={(event) => updateTarget("address_text", event.target.value)} placeholder="Address" />
              <div className="grid gap-2 md:grid-cols-2">
                <Input value={customTarget.phone} onChange={(event) => updateTarget("phone", event.target.value)} placeholder="Phone" />
                <Input value={customTarget.email} onChange={(event) => updateTarget("email", event.target.value)} placeholder="Email" />
                <Input value={customTarget.lat} onChange={(event) => updateTarget("lat", event.target.value)} placeholder="Latitude" />
                <Input value={customTarget.lng} onChange={(event) => updateTarget("lng", event.target.value)} placeholder="Longitude" />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!activeListId || !customTarget.display_name}
                onClick={() =>
                  addTarget.mutate({
                    listId: activeListId,
                    target: {
                      ...customTarget,
                      lat: customTarget.lat ? Number(customTarget.lat) : null,
                      lng: customTarget.lng ? Number(customTarget.lng) : null,
                      coordinate_source: customTarget.lat && customTarget.lng ? "manual" : null,
                    },
                  })
                }
              >
                Add Target
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SurveyBuilder({ campaignId, surveys, onChanged }) {
  const [surveyName, setSurveyName] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [question, setQuestion] = useState(questionDefaults);
  const activeSurveyId = selectedSurveyId || surveys[0]?.id || "";
  const survey = useQuery({
    queryKey: ["outreach", "survey", activeSurveyId],
    queryFn: () => apiFetch(`/outreach/surveys/${activeSurveyId}`),
    enabled: Boolean(activeSurveyId),
  });
  const createSurvey = useMutation({
    mutationFn: () =>
      apiFetch(`/outreach/campaigns/${campaignId}/surveys`, {
        method: "POST",
        body: JSON.stringify({ name: surveyName }),
      }),
    onSuccess: (row) => {
      toast.success("Survey created");
      setSelectedSurveyId(row.id);
      setSurveyName("");
      onChanged();
    },
    onError: (error) => toast.error(error.message),
  });
  const addQuestion = useMutation({
    mutationFn: () =>
      apiFetch(`/outreach/surveys/${activeSurveyId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          question_text: question.question_text,
          question_type: question.question_type,
          options_json: question.options
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean),
          is_required: question.is_required,
          sort_order: survey.data?.questions?.length || 0,
        }),
      }),
    onSuccess: () => {
      toast.success("Question added");
      setQuestion(questionDefaults);
      survey.refetch();
      onChanged();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Survey / Checklist Builder</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <Field label="Create survey">
            <Input value={surveyName} onChange={(event) => setSurveyName(event.target.value)} placeholder="Field checklist" />
          </Field>
          <Button type="button" variant="outline" disabled={!surveyName} onClick={() => createSurvey.mutate()}>
            Create Survey
          </Button>
          <Field label="Active survey">
            <SelectField value={activeSurveyId} onChange={setSelectedSurveyId}>
              <option value="">Select a survey</option>
              {surveys.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
          </Field>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Question">
                <Input value={question.question_text} onChange={(event) => setQuestion((current) => ({ ...current, question_text: event.target.value }))} />
              </Field>
              <Field label="Type">
                <SelectField value={question.question_type} onChange={(value) => setQuestion((current) => ({ ...current, question_type: value }))}>
                  <option value="yes_no">Yes/no</option>
                  <option value="multiple_choice">Multiple choice</option>
                  <option value="checkbox_list">Checkbox list</option>
                  <option value="short_text">Short text</option>
                  <option value="long_text">Long text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="photo_upload">Photo upload</option>
                  <option value="condition_rating">Condition rating</option>
                  <option value="contact_verification">Contact verification</option>
                </SelectField>
              </Field>
            </div>
            <Field label="Options, one per line">
              <Textarea value={question.options} onChange={(event) => setQuestion((current) => ({ ...current, options: event.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={question.is_required}
                onChange={(event) => setQuestion((current) => ({ ...current, is_required: event.target.checked }))}
              />
              Required
            </label>
            <Button type="button" disabled={!activeSurveyId || !question.question_text} onClick={() => addQuestion.mutate()}>
              Add Question
            </Button>
          </div>
          <div className="space-y-2">
            {(survey.data?.questions || []).map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">{item.question_text}</p>
                  <Badge>{item.question_type}</Badge>
                </div>
                {item.is_required && <p className="mt-1 text-xs text-slate-500">Required</p>}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScriptBuilder({ campaignId, scripts, onChanged }) {
  const [form, setForm] = useState({ title: "", script_type: "general", content: "" });
  const addScript = useMutation({
    mutationFn: () =>
      apiFetch(`/outreach/campaigns/${campaignId}/scripts`, {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast.success("Script saved");
      setForm({ title: "", script_type: "general", content: "" });
      onChanged();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scripts and Talking Points</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Phone script" />
          <SelectField value={form.script_type} onChange={(value) => setForm((current) => ({ ...current, script_type: value }))}>
            <option value="general">General</option>
            <option value="phone">Phone</option>
            <option value="door">Door</option>
            <option value="delivery">Delivery</option>
            <option value="faq">FAQ</option>
          </SelectField>
          <Textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="Talking points" />
          <Button type="button" variant="outline" disabled={!form.title} onClick={() => addScript.mutate()}>
            Save Script
          </Button>
        </div>
        <div className="space-y-2">
          {scripts.map((script) => (
            <div key={script.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{script.title}</p>
                <Badge>{script.script_type}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{script.content}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentManager({ campaign, targets, users, onChanged }) {
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [assignmentCount, setAssignmentCount] = useState(2);
  const createAssignment = useMutation({
    mutationFn: () =>
      apiFetch(`/outreach/campaigns/${campaign.id}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          title,
          user_ids: selectedUsers,
          target_ids: selectedTargets,
          assignment_type: campaign.workflow_type,
          status: "assigned",
        }),
      }),
    onSuccess: () => {
      toast.success("Assignment created");
      setTitle("");
      setSelectedTargets([]);
      onChanged();
    },
    onError: (error) => toast.error(error.message),
  });
  const generateAssignments = useMutation({
    mutationFn: () =>
      apiFetch(`/outreach/campaigns/${campaign.id}/assignments/generate`, {
        method: "POST",
        body: JSON.stringify({
          user_ids: selectedUsers,
          assignment_count: assignmentCount,
          title_prefix: campaign.workflow_type === "phonebank" ? "Call list" : "Field assignment",
        }),
      }),
    onSuccess: (result) => {
      toast.success(`Generated ${result.count || 0} assignments`);
      onChanged();
    },
    onError: (error) => toast.error(error.message),
  });
  const toggle = (id, setter) =>
    setter((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Assignment title">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="North side route" />
            </Field>
            <Field label="Workers">
              <div className="max-h-44 space-y-2 overflow-auto rounded-xl border p-3">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggle(user.id, setSelectedUsers)} />
                    {user.full_name || user.email}
                  </label>
                ))}
              </div>
            </Field>
            <Button type="button" disabled={!title || !selectedTargets.length} onClick={() => createAssignment.mutate()}>
              Create Manual Assignment
            </Button>
          </div>
          <div className="space-y-3">
            <Field label="Auto-generate assignment count">
              <Input type="number" min="1" value={assignmentCount} onChange={(event) => setAssignmentCount(event.target.value)} />
            </Field>
            <p className="text-sm text-slate-500">
              Canvass, inspection, and delivery campaigns are grouped geographically when coordinates exist. Phonebank and outreach campaigns become balanced queues.
            </p>
            <Button type="button" variant="outline" onClick={() => generateAssignments.mutate()}>
              Generate Assignments
            </Button>
          </div>
        </div>
        <div className="max-h-64 overflow-auto rounded-xl border">
          {targets.map((target) => (
            <label key={target.id} className="flex items-start gap-3 border-b p-3 text-sm last:border-b-0">
              <input type="checkbox" checked={selectedTargets.includes(target.id)} onChange={() => toggle(target.id, setSelectedTargets)} />
              <span>
                <span className="font-medium">{target.display_name}</span>
                <span className="block text-xs text-slate-500">{target.address_text || target.phone || target.email || "No contact details"}</span>
              </span>
              <Badge className="ml-auto">{target.assignment_status}</Badge>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MapAndTurfPanel({ campaignId, targets, turfs, onChanged }) {
  const [turfCount, setTurfCount] = useState(2);
  const generateTurfs = useMutation({
    mutationFn: () =>
      apiFetch(`/outreach/campaigns/${campaignId}/turfs/generate`, {
        method: "POST",
        body: JSON.stringify({ turf_count: turfCount }),
      }),
    onSuccess: (result) => {
      toast.success(`Generated ${result.count || 0} turfs`);
      onChanged();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapbox Turfing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <OutreachMap targets={targets} />
        <div className="flex gap-2">
          <Input className="w-28" type="number" min="1" value={turfCount} onChange={(event) => setTurfCount(event.target.value)} />
          <Button type="button" variant="outline" onClick={() => generateTurfs.mutate()}>
            Generate Turfs
          </Button>
        </div>
        <div className="space-y-2">
          {turfs.map((turf) => (
            <div key={turf.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{turf.name}</p>
              <p className="text-slate-500">{turf.target_count} mapped targets</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TargetTable({ targets, onChanged }) {
  const updateTarget = useMutation({
    mutationFn: ({ id, payload }) =>
      apiFetch(`/outreach/targets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: onChanged,
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Targets and Manual Ordering</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[520px] space-y-2 overflow-auto">
        {targets.map((target, index) => (
          <div key={target.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{target.display_name}</p>
                <p className="text-xs text-slate-500">{target.address_text || target.phone || target.email || "No details"}</p>
              </div>
              <Badge>{target.status}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => updateTarget.mutate({ id: target.id, payload: { sort_order: Math.max(index - 1, 0) } })}>
                Move Up
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => updateTarget.mutate({ id: target.id, payload: { sort_order: index + 2 } })}>
                Move Down
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => updateTarget.mutate({ id: target.id, payload: { status: "skipped" } })}>
                Mark Skipped
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WorkerExperience() {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedTarget, setSelectedTarget] = useState(null);
  const assignments = useQuery({
    queryKey: ["outreach", "my-assignments"],
    queryFn: () => apiFetch("/outreach/my-assignments"),
  });
  const assignment = useQuery({
    queryKey: ["outreach", "assignment", selectedAssignmentId],
    queryFn: () => apiFetch(`/outreach/assignments/${selectedAssignmentId}`),
    enabled: Boolean(selectedAssignmentId),
  });
  const activeAssignment = assignment.data;
  const targets = activeAssignment?.targets || [];
  const workflow = activeAssignment?.workflow_type || "outreach";

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>My Outreach Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(assignments.data || []).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`w-full rounded-xl border p-3 text-left ${selectedAssignmentId === item.id ? "border-[#835879] bg-[#835879]/5" : ""}`}
              onClick={() => {
                setSelectedAssignmentId(item.id);
                setSelectedTarget(null);
              }}
            >
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-slate-500">{item.campaign_name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.completed_count || 0}/{item.target_count || 0} complete
              </p>
            </button>
          ))}
          {!assignments.isLoading && !(assignments.data || []).length && (
            <p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No assigned outreach work yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{activeAssignment?.title || "Assignment Workspace"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!activeAssignment && <p className="text-sm text-slate-500">Select an assignment to open the field or phonebank workflow.</p>}
          {activeAssignment && (
            <>
              <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
                <p className="font-medium">{activeAssignment.campaign_name}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                  {activeAssignment.instructions || activeAssignment.default_instructions || "No special instructions."}
                </p>
              </div>
              {activeAssignment.scripts?.length > 0 && (
                <div className="rounded-xl border p-4 text-sm">
                  <p className="mb-2 font-medium">Script / Talking Points</p>
                  {activeAssignment.scripts.map((script) => (
                    <div key={script.id} className="mb-3 last:mb-0">
                      <p className="font-medium">{script.title}</p>
                      <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{script.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {workflow === "phonebank" ? (
                <PhonebankQueue assignment={activeAssignment} targets={targets} onSelectTarget={setSelectedTarget} />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <OutreachMap targets={targets} onSelectTarget={setSelectedTarget} />
                  <StopList targets={targets} onSelectTarget={setSelectedTarget} />
                </div>
              )}
              {selectedTarget && (
                <InteractionForm
                  assignment={activeAssignment}
                  assignmentTarget={selectedTarget}
                  survey={activeAssignment.survey}
                  onSubmitted={() => {
                    assignment.refetch();
                    assignments.refetch();
                    setSelectedTarget(null);
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StopList({ targets, onSelectTarget }) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-xl border">
      {targets.map((target) => (
        <button key={target.id} type="button" className="w-full border-b p-3 text-left text-sm last:border-b-0" onClick={() => onSelectTarget(target)}>
          <div className="flex items-start justify-between gap-2">
            <span>
              <span className="font-medium">{target.display_name}</span>
              <span className="block text-xs text-slate-500">{target.address_text || "No address"}</span>
            </span>
            <Badge>{target.status}</Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

function PhonebankQueue({ assignment, targets, onSelectTarget }) {
  const nextTarget = targets.find((target) => target.status === "pending") || targets[0];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border p-4">
        <p className="text-sm text-slate-500">Next contact</p>
        {nextTarget ? (
          <div className="mt-2 space-y-3">
            <h3 className="text-xl font-semibold">{nextTarget.display_name}</h3>
            <p className="text-sm text-slate-500">{nextTarget.phone || nextTarget.email || "No phone or email on this target"}</p>
            <div className="flex flex-wrap gap-2">
              {nextTarget.phone && (
                <Button asChild className="bg-[#835879] text-white">
                  <a href={`tel:${nextTarget.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </a>
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onSelectTarget(nextTarget)}>
                Log Call
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">This queue has no targets.</p>
        )}
      </div>
      <div className="max-h-72 overflow-auto rounded-xl border">
        {targets.map((target) => (
          <button key={target.id} type="button" className="w-full border-b p-3 text-left text-sm last:border-b-0" onClick={() => onSelectTarget(target)}>
            <p className="font-medium">{target.display_name}</p>
            <p className="text-xs text-slate-500">{target.phone || target.email || assignment.workflow_type}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function InteractionForm({ assignment, assignmentTarget, survey, onSubmitted }) {
  const [form, setForm] = useState({
    ...interactionDefaults,
    interaction_type: assignment.workflow_type === "phonebank" ? "phone_call" : "in_person_visit",
  });
  const [answers, setAnswers] = useState({});
  const submit = useMutation({
    mutationFn: () =>
      apiFetch("/outreach/interactions", {
        method: "POST",
        body: JSON.stringify({
          assignment_id: assignment.id,
          assignment_target_id: assignmentTarget.id,
          target_id: assignmentTarget.target_id,
          survey_id: survey?.id || null,
          ...form,
          answers: Object.entries(answers).map(([questionId, value]) => ({
            question_id: questionId,
            answer_text: Array.isArray(value) ? value.join(", ") : value,
            answer_json: Array.isArray(value) ? value : undefined,
          })),
        }),
      }),
    onSuccess: () => {
      toast.success("Interaction submitted");
      onSubmitted();
    },
    onError: (error) => toast.error(error.message),
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-4">
        <p className="text-sm text-slate-500">Log interaction</p>
        <h3 className="text-lg font-semibold">{assignmentTarget.display_name}</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Interaction type">
          <SelectField value={form.interaction_type} onChange={(value) => update("interaction_type", value)}>
            <option value="in_person_visit">In-person visit</option>
            <option value="phone_call">Phone call</option>
            <option value="voicemail">Voicemail</option>
            <option value="delivery">Delivery</option>
            <option value="inspection">Inspection</option>
            <option value="failed_attempt">Failed attempt</option>
          </SelectField>
        </Field>
        <Field label="Outcome">
          <SelectField value={form.outcome} onChange={(value) => update("outcome", value)}>
            {outcomeOptions.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcome.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
        </Field>
      </div>
      {survey?.questions?.length > 0 && (
        <div className="my-4 space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="font-medium">{survey.name}</p>
          {survey.questions.map((question) => (
            <SurveyAnswer key={question.id} question={question} value={answers[question.id] || ""} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} />
          ))}
        </div>
      )}
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
      </Field>
      <div className="my-3 grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.follow_up_needed} onChange={(event) => update("follow_up_needed", event.target.checked)} />
          Follow-up needed
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.create_followup_task} onChange={(event) => update("create_followup_task", event.target.checked)} />
          Create TaskMaster task
        </label>
      </div>
      {(form.follow_up_needed || form.create_followup_task) && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Follow-up date">
            <Input type="date" value={form.follow_up_at} onChange={(event) => update("follow_up_at", event.target.value)} />
          </Field>
          <Field label="Task title">
            <Input value={form.followup_title} onChange={(event) => update("followup_title", event.target.value)} placeholder="Follow up with business" />
          </Field>
        </div>
      )}
      <Button type="button" className="mt-4 bg-[#835879] text-white" onClick={() => submit.mutate()}>
        <Send className="mr-2 h-4 w-4" />
        Submit Interaction
      </Button>
    </div>
  );
}

function SurveyAnswer({ question, value, onChange }) {
  const options = Array.isArray(question.options_json) ? question.options_json : [];
  if (question.question_type === "yes_no") {
    return (
      <Field label={question.question_text}>
        <SelectField value={value} onChange={onChange}>
          <option value="">Select</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </SelectField>
      </Field>
    );
  }
  if (question.question_type === "multiple_choice") {
    return (
      <Field label={question.question_text}>
        <SelectField value={value} onChange={onChange}>
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
      </Field>
    );
  }
  if (question.question_type === "number") {
    return (
      <Field label={question.question_text}>
        <Input type="number" value={value} onChange={(event) => onChange(event.target.value)} />
      </Field>
    );
  }
  if (question.question_type === "date") {
    return (
      <Field label={question.question_text}>
        <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
      </Field>
    );
  }
  if (question.question_type === "long_text") {
    return (
      <Field label={question.question_text}>
        <Textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </Field>
    );
  }
  return (
    <Field label={question.question_text}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={question.question_type.replaceAll("_", " ")} />
    </Field>
  );
}

function ReviewPanel({ campaignId }) {
  const interactions = useQuery({
    queryKey: ["outreach", "interactions", campaignId],
    queryFn: () => apiFetch(`/outreach/campaigns/${campaignId}/interactions`),
    enabled: Boolean(campaignId),
  });
  const queryClient = useQueryClient();
  const review = useMutation({
    mutationFn: ({ id, status }) =>
      apiFetch(`/outreach/interactions/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast.success("Review saved");
      queryClient.invalidateQueries({ queryKey: ["outreach", "interactions", campaignId] });
    },
    onError: (error) => toast.error(error.message),
  });
  if (!campaignId) {
    return <EmptySelectCard message="Select a campaign to review submitted field and phonebank activity." />;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(interactions.data || []).map((interaction) => (
          <div key={interaction.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{interaction.display_name || "Outreach target"}</p>
                <p className="text-sm text-slate-500">
                  {interaction.interaction_type} - {interaction.outcome || "no outcome"} by {interaction.submitted_by_name || "Unknown"}
                </p>
              </div>
              <Badge>{interaction.status}</Badge>
            </div>
            {interaction.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{interaction.notes}</p>}
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => review.mutate({ id: interaction.id, status: "reviewed" })}>
                Approve
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => review.mutate({ id: interaction.id, status: "reopened" })}>
                Reopen
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReportPanel({ campaignId }) {
  const report = useQuery({
    queryKey: ["outreach", "report", campaignId],
    queryFn: () => apiFetch(`/outreach/campaigns/${campaignId}/report`),
    enabled: Boolean(campaignId),
  });
  const exportCsv = async () => {
    const result = await apiFetch(`/outreach/campaigns/${campaignId}/export`);
    const csv = result?.raw || "";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "outreach-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportSummary = () => {
    const rows = [
      ...(report.data?.outcomes || []).map((row) => ({ category: "Outcome", label: row.outcome, count: row.count })),
      ...(report.data?.volunteers || []).map((row) => ({ category: "Worker", label: row.name, count: row.count })),
      ...(report.data?.followups || []).map((row) => ({ category: "Follow-up", label: row.status, count: row.count })),
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outreach Report");
    XLSX.writeFile(workbook, "outreach-summary.csv");
  };
  if (!campaignId) {
    return <EmptySelectCard message="Select a campaign to view reports, outcomes, follow-ups, and exports." />;
  }
  const data = report.data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={MapPin} label="Targets" value={data?.targets?.total} />
        <StatCard icon={Activity} label="Completed" value={data?.targets?.completed} />
        <StatCard icon={Route} label="Completion" value={`${data?.targets?.completion_rate || 0}%`} />
        <StatCard icon={FileText} label="Skipped" value={data?.targets?.skipped} />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Campaign Report</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={exportCsv}>
                Export Detail CSV
              </Button>
              <Button type="button" variant="outline" onClick={exportSummary}>
                Export Summary
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <ReportList title="Outcomes" rows={data?.outcomes || []} labelKey="outcome" />
          <ReportList title="By worker" rows={data?.volunteers || []} labelKey="name" />
          <ReportList title="Follow-ups" rows={data?.followups || []} labelKey="status" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Question Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.question_results || []).map((row, index) => (
            <div key={`${row.question_text}-${row.answer}-${index}`} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{row.question_text || "Question"}</p>
              <p className="text-slate-500">
                {row.answer || "Blank"} - {row.count} responses
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportList({ title, rows, labelKey }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="mb-3 font-medium">{title}</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row[labelKey]} className="flex justify-between gap-3 text-sm">
            <span>{String(row[labelKey] || "Unknown").replaceAll("_", " ")}</span>
            <span className="font-medium">{row.count}</span>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-slate-500">No data yet.</p>}
      </div>
    </div>
  );
}

function EmptySelectCard({ message }) {
  return (
    <Card>
      <CardContent className="p-8 text-sm text-slate-500">{message}</CardContent>
    </Card>
  );
}

export default function Outreach() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const queryClient = useQueryClient();
  const summary = useQuery({
    queryKey: ["outreach", "summary"],
    queryFn: () => apiFetch("/outreach/summary"),
  });
  const createCampaign = useMutation({
    mutationFn: (payload) =>
      apiFetch("/outreach/campaigns", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (campaign) => {
      toast.success("Outreach campaign created");
      setSelectedCampaignId(campaign.id);
      setActiveTab("builder");
      queryClient.invalidateQueries({ queryKey: ["outreach"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const selectedCampaign = useQuery({
    queryKey: ["outreach", "campaign", selectedCampaignId],
    queryFn: () => apiFetch(`/outreach/campaigns/${selectedCampaignId}`),
    enabled: Boolean(selectedCampaignId),
  });

  const selectedCampaignLabel = useMemo(() => selectedCampaign.data?.name || "No campaign selected", [selectedCampaign.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Outreach / Field Operations</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Shared campaign infrastructure for canvassing, phonebanking, inspections, delivery, business visits, and hybrid outreach.
          </p>
          <p className="mt-1 text-sm text-slate-500">Active campaign: {selectedCampaignLabel}</p>
        </div>
        <OutreachTabs active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={ClipboardList} label="Campaigns" value={summary.data?.campaigns} />
        <StatCard icon={Activity} label="Active" value={summary.data?.active_campaigns} />
        <StatCard icon={MapPin} label="Targets" value={summary.data?.targets} />
        <StatCard icon={Send} label="Interactions" value={summary.data?.interactions} />
        <StatCard icon={FileText} label="Follow-ups" value={summary.data?.open_followups} />
      </div>

      {activeTab === "campaigns" && (
        <CampaignList
          selectedId={selectedCampaignId}
          onSelect={(id) => {
            setSelectedCampaignId(id);
            setActiveTab("builder");
          }}
          onCreate={(payload) => createCampaign.mutate(payload)}
        />
      )}
      {activeTab === "builder" && <CampaignBuilder campaignId={selectedCampaignId} onSelectCampaign={setSelectedCampaignId} />}
      {activeTab === "assignments" && <CampaignBuilder campaignId={selectedCampaignId} onSelectCampaign={setSelectedCampaignId} />}
      {activeTab === "field" && <WorkerExperience />}
      {activeTab === "review" && <ReviewPanel campaignId={selectedCampaignId} />}
      {activeTab === "reports" && <ReportPanel campaignId={selectedCampaignId} />}
    </div>
  );
}
