import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Download, ExternalLink, Plus, Save, Trash2, Upload, X } from "lucide-react";
import {
  closeContest,
  createContest,
  deleteContest,
  exportContestToWheelspin,
  getContest,
  getContests,
  launchContest,
  updateContest
} from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadPublicFile } from "@/lib/uploads";
import { toast } from "sonner";

const EMPTY_CONTEST = {
  name: "",
  description: "",
  image_url: "",
  image_storage_path: "",
  image_file_name: "",
  image_mime_type: "",
  image_size: null,
  status: "draft"
};

const FIELD_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "yes_no", label: "Yes / No" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkboxes" },
  { value: "dropdown", label: "Dropdown" }
];

function newField() {
  return {
    local_id: crypto.randomUUID(),
    label: "",
    field_type: "short_text",
    is_required: false,
    options: [],
    sort_order: 0
  };
}

function fieldNeedsOptions(fieldType) {
  return ["multiple_choice", "checkbox", "dropdown"].includes(fieldType);
}

function toEditableField(field, index) {
  return {
    local_id: field.id || crypto.randomUUID(),
    id: field.id,
    label: field.label || "",
    field_type: field.field_type || "short_text",
    is_required: Boolean(field.is_required),
    options: Array.isArray(field.options) ? field.options : [],
    sort_order: Number(field.sort_order ?? index)
  };
}

function buildContestPayload(contest, fields) {
  return {
    name: contest.name,
    description: contest.description,
    image_url: contest.image_url,
    image_storage_path: contest.image_storage_path || null,
    image_file_name: contest.image_file_name || null,
    image_mime_type: contest.image_mime_type || null,
    image_size: contest.image_size || null,
    fields: fields
      .map((field, index) => ({
        id: field.id,
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        options: fieldNeedsOptions(field.field_type) ? field.options : [],
        sort_order: index
      }))
      .filter((field) => field.label.trim())
  };
}

function statusClass(status) {
  if (status === "launched") return "bg-green-100 text-green-700";
  if (status === "closed") return "bg-slate-200 text-slate-700";
  if (status === "archived") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function csvEscape(value) {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatEntryResponse(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null) return "";
  return String(value);
}

function safeFileName(value) {
  return (
    (value || "contest")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "contest"
  );
}

export default function Contests() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState("");
  const [contest, setContest] = useState(EMPTY_CONTEST);
  const [fields, setFields] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: contests = [], isLoading: listLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: getContests
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["contest", selectedId],
    queryFn: () => getContest(selectedId),
    enabled: Boolean(selectedId)
  });

  useEffect(() => {
    if (!selectedId) {
      setContest(EMPTY_CONTEST);
      setFields([]);
      return;
    }
    if (!detail) return;
    setContest({
      name: detail.name || "",
      description: detail.description || "",
      image_url: detail.image_url || "",
      image_storage_path: detail.image_storage_path || "",
      image_file_name: detail.image_file_name || "",
      image_mime_type: detail.image_mime_type || "",
      image_size: detail.image_size || null,
      status: detail.status || "draft",
      public_slug: detail.public_slug || ""
    });
    setFields((detail.fields || []).map(toEditableField));
  }, [detail, selectedId]);

  const publicLink = contest.public_slug
    ? `${window.location.origin}/contests/${contest.public_slug}`
    : "";

  const entries = useMemo(() => detail?.entries || [], [detail]);
  const savedFields = useMemo(() => detail?.fields || [], [detail]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildContestPayload(contest, fields);
      if (selectedId) return updateContest(selectedId, payload);
      return createContest(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["contest", saved.id] });
      if (!selectedId) setSelectedId(saved.id);
      toast.success("Contest saved");
    },
    onError: (error) => toast.error(error.message)
  });

  const launchMutation = useMutation({
    mutationFn: async () => {
      const saved = await saveMutation.mutateAsync();
      return launchContest(saved.id);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["contest", saved.id] });
      setSelectedId(saved.id);
      toast.success("Contest launched");
    },
    onError: (error) => toast.error(error.message)
  });

  const closeMutation = useMutation({
    mutationFn: () => closeContest(selectedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["contest", selectedId] });
      toast.success("Contest closed");
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContest(selectedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      setSelectedId("");
      toast.success("Contest archived");
    },
    onError: (error) => toast.error(error.message)
  });

  const exportMutation = useMutation({
    mutationFn: () => exportContestToWheelspin(selectedId, {
      name: `${contest.name} Entries`,
      winners_count: 1,
      remove_winner_on_spin: true
    }),
    onSuccess: (result) => {
      toast.success("WheelSpin wheel created");
      if (result?.wheel_id) navigate("/wheelspin");
    },
    onError: (error) => toast.error(error.message)
  });

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadPublicFile({
        bucket: "uploads",
        visibility: "public",
        purpose: "contest-image",
        file
      });
      setContest((current) => ({
        ...current,
        image_url: uploaded.file_url,
        image_storage_path: uploaded.storage_path,
        image_file_name: uploaded.file_name,
        image_mime_type: uploaded.mime_type,
        image_size: uploaded.size
      }));
      toast.success("Contest image uploaded");
    } catch (error) {
      toast.error(error.message || "Image upload failed");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const copyPublicLink = () => {
    if (!publicLink) return;
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    toast.success("Public link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const updateField = (index, updates) => {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...updates } : field
      )
    );
  };

  const removeField = (index) => {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));
  };

  const addOption = (fieldIndex) => {
    const field = fields[fieldIndex];
    updateField(fieldIndex, {
      options: [...(field.options || []), `Option ${(field.options || []).length + 1}`]
    });
  };

  const updateOption = (fieldIndex, optionIndex, value) => {
    const field = fields[fieldIndex];
    const options = [...(field.options || [])];
    options[optionIndex] = value;
    updateField(fieldIndex, { options });
  };

  const removeOption = (fieldIndex, optionIndex) => {
    const field = fields[fieldIndex];
    updateField(fieldIndex, {
      options: (field.options || []).filter((_, index) => index !== optionIndex)
    });
  };

  const startNew = () => {
    setSelectedId("");
    setContest(EMPTY_CONTEST);
    setFields([]);
  };

  const downloadEntriesCsv = () => {
    if (!entries.length) return;
    const headers = [
      "Name",
      "Email",
      "Submitted At",
      "CRM Status",
      ...savedFields.map((field) => field.label)
    ];
    const rows = entries.map((entry) => [
      entry.display_name,
      entry.email,
      entry.submitted_at ? new Date(entry.submitted_at).toISOString() : "",
      entry.crm_contact_id ? "Synced" : "Pending",
      ...savedFields.map((field) => formatEntryResponse(entry.responses?.[field.id]))
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(contest.name)}-entries.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Contests
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Build public entry forms, sync participants to CRM, and export winners to WheelSpin.
            </p>
          </div>
          <Button onClick={startNew} className="bg-[#835879] hover:bg-[#6f4866]">
            <Plus className="w-4 h-4 mr-2" />
            New Contest
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.4fr]">
          <Card className="bg-white/80 dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle>Contest Campaigns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {listLoading ? (
                <p className="text-sm text-slate-500">Loading contests...</p>
              ) : contests.length === 0 ? (
                <p className="text-sm text-slate-500">No contests yet.</p>
              ) : (
                contests.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      selectedId === item.id
                        ? "border-[#835879] bg-[#835879]/10"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {item.entry_count || 0} entries
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-white/80 dark:bg-slate-900/80">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle>{selectedId ? "Contest Builder" : "New Contest"}</CardTitle>
                {contest.status && (
                  <span className={`w-fit rounded-full px-2 py-1 text-xs ${statusClass(contest.status)}`}>
                    {contest.status}
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                {detailLoading ? (
                  <p className="text-sm text-slate-500">Loading contest...</p>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={contest.name}
                          onChange={(event) =>
                            setContest((current) => ({ ...current, name: event.target.value }))
                          }
                          placeholder="Summer Sidewalk Giveaway"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contest Image</Label>
                        <div className="flex gap-2">
                          <Input
                            value={contest.image_url}
                            onChange={(event) =>
                              setContest((current) => ({
                                ...current,
                                image_url: event.target.value
                              }))
                            }
                            placeholder="Upload or paste an image URL"
                          />
                          <Button asChild variant="outline" disabled={isUploading}>
                            <label className="cursor-pointer">
                              <Upload className="w-4 h-4" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                              />
                            </label>
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                          Recommended image size: 1200 x 630 px.
                        </p>
                      </div>
                    </div>

                    {contest.image_url && (
                      <img
                        src={contest.image_url}
                        alt={contest.name || "Contest"}
                        className="max-h-64 w-full rounded-xl object-cover border border-slate-200"
                      />
                    )}

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={4}
                        value={contest.description}
                        onChange={(event) =>
                          setContest((current) => ({
                            ...current,
                            description: event.target.value
                          }))
                        }
                        placeholder="Describe the prize, eligibility, and how participants enter."
                      />
                    </div>

                    {publicLink && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Public link
                        </div>
                        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                          <Input readOnly value={publicLink} />
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={copyPublicLink}>
                              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                              Copy
                            </Button>
                            <Button variant="outline" asChild>
                              <Link to={`/contests/${contest.public_slug}`} target="_blank">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                            Entry Fields
                          </h2>
                          <p className="text-sm text-slate-500">
                            Name and email are always collected. Add any extra fields below.
                          </p>
                        </div>
                        <Button variant="outline" onClick={() => setFields((current) => [...current, newField()])}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Field
                        </Button>
                      </div>

                      {fields.map((field, index) => (
                        <div key={field.local_id} className="rounded-xl border border-slate-200 p-4 space-y-4 dark:border-slate-800">
                          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                            <Input
                              value={field.label}
                              onChange={(event) => updateField(index, { label: event.target.value })}
                              placeholder="Field label"
                            />
                            <Select
                              value={field.field_type}
                              onValueChange={(value) =>
                                updateField(index, {
                                  field_type: value,
                                  options: fieldNeedsOptions(value) ? field.options : []
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => removeField(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={field.is_required}
                              onChange={(event) =>
                                updateField(index, { is_required: event.target.checked })
                              }
                            />
                            Required
                          </label>

                          {fieldNeedsOptions(field.field_type) && (
                            <div className="space-y-2">
                              <Label>Options</Label>
                              {(field.options || []).map((option, optionIndex) => (
                                <div key={`${field.local_id}-${optionIndex}`} className="flex gap-2">
                                  <Input
                                    value={option}
                                    onChange={(event) =>
                                      updateOption(index, optionIndex, event.target.value)
                                    }
                                  />
                                  <Button variant="ghost" size="icon" onClick={() => removeOption(index, optionIndex)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button variant="outline" size="sm" onClick={() => addOption(index)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Option
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="bg-[#835879] hover:bg-[#6f4866]"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => launchMutation.mutate()}
                        disabled={launchMutation.isPending || contest.status !== "draft"}
                      >
                        Launch
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => closeMutation.mutate()}
                        disabled={!selectedId || closeMutation.isPending || contest.status !== "launched"}
                      >
                        Close
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => exportMutation.mutate()}
                        disabled={!selectedId || contest.status !== "closed" || entries.length === 0 || exportMutation.isPending}
                      >
                        Export to WheelSpin
                      </Button>
                      {selectedId && (
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm("Archive this contest?")) deleteMutation.mutate();
                          }}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {selectedId && (
              <Card className="bg-white/80 dark:bg-slate-900/80">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Entries ({entries.length})</CardTitle>
                  <Button
                    variant="outline"
                    onClick={downloadEntriesCsv}
                    disabled={entries.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {entries.length === 0 ? (
                    <p className="text-sm text-slate-500">No entries yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-slate-500">
                            <th className="py-2 pr-4">Name</th>
                            <th className="py-2 pr-4">Email</th>
                            <th className="py-2 pr-4">Submitted</th>
                            <th className="py-2 pr-4">CRM</th>
                            {savedFields.map((field) => (
                              <th key={field.id} className="py-2 pr-4">
                                {field.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry) => (
                            <tr key={entry.id} className="border-b last:border-b-0">
                              <td className="py-2 pr-4">{entry.display_name}</td>
                              <td className="py-2 pr-4">{entry.email}</td>
                              <td className="py-2 pr-4">
                                {entry.submitted_at ? new Date(entry.submitted_at).toLocaleString() : ""}
                              </td>
                              <td className="py-2 pr-4">
                                {entry.crm_contact_id ? "Synced" : "Pending"}
                              </td>
                              {savedFields.map((field) => (
                                <td key={field.id} className="py-2 pr-4">
                                  {formatEntryResponse(entry.responses?.[field.id]) || "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
