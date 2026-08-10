import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Download, MapPin, Tags, Upload } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function downloadTemplate() {
  const content = "name,tracking_type,quantity,category,location,condition,asset_code,barcode,description,notes\nFolding Chair,quantity,100,Furniture,Warehouse,Good,MS-CHAIRS-01,,,\n";
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  link.download = "supplystop-import-template.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function AdminTools() {
  const queryClient = useQueryClient();
  const [csvFile, setCsvFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [newValues, setNewValues] = useState({ category: "", location: "", condition: "" });
  const [locationParentId, setLocationParentId] = useState("");
  const [checklistName, setChecklistName] = useState("");
  const [checklistTemplateId, setChecklistTemplateId] = useState("");
  const [checklistSteps, setChecklistSteps] = useState([""]);
  const { data: setup = {} } = useQuery({ queryKey: ["supply-setup"], queryFn: () => apiFetch("/supply/setup") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["supply-setup"] });
  const vocabularyMutation = useMutation({
    mutationFn: ({ type, name }) => apiFetch(`/supply/${type}`, { method: "POST", body: JSON.stringify({ name, ...(type === "locations" && locationParentId ? { parent_id: locationParentId } : {}) }) }),
    onSuccess: (_, variables) => { invalidate(); setNewValues((current) => ({ ...current, [variables.key]: "" })); if (variables.type === "locations") setLocationParentId(""); toast.success("Controlled value added"); },
    onError: (error) => toast.error(error.message || "Value could not be added"),
  });
  const checklistMutation = useMutation({
    mutationFn: () => apiFetch(checklistTemplateId ? `/supply/checklist-templates/${checklistTemplateId}/versions` : "/supply/checklist-templates", {
      method: "POST", body: JSON.stringify({ name: checklistName, items: checklistSteps.filter((label) => label.trim()).map((label) => ({ label, response_type: "pass_fail", required: true })) }),
    }),
    onSuccess: () => { invalidate(); setChecklistName(""); setChecklistTemplateId(""); setChecklistSteps([""]); toast.success("Return checklist version published"); },
    onError: (error) => toast.error(error.message || "Checklist could not be created"),
  });
  const importMutation = useMutation({
    mutationFn: async (dryRun) => {
      const body = new FormData();
      body.append("dry_run", dryRun ? "true" : "false");
      body.append("file", csvFile, csvFile.name);
      return apiFetch("/supply/import", { method: "POST", body });
    },
    onSuccess: (result) => {
      setImportResult(result);
      if (!result.dry_run) { queryClient.invalidateQueries({ queryKey: ["supply_items"] }); invalidate(); toast.success("Inventory import complete"); }
    },
    onError: (error) => toast.error(error.message || "CSV could not be imported"),
  });

  const configs = [
    ["categories", "category", "Category", <Tags key="category-icon" className="h-4 w-4" />],
    ["locations", "location", "Top-level location", <MapPin key="location-icon" className="h-4 w-4" />],
    ["conditions", "condition", "Condition", <ClipboardCheck key="condition-icon" className="h-4 w-4" />],
  ];

  return <Card><CardHeader><CardTitle>Inventory setup tools</CardTitle></CardHeader><CardContent className="space-y-6">
    <div className="grid gap-4 lg:grid-cols-3">{configs.map(([endpoint, key, label, icon]) => <div key={endpoint} className="space-y-2 rounded-lg border p-4"><Label htmlFor={`new-${key}`} className="flex items-center gap-2">{icon} Add {label.toLowerCase()}</Label>{key === "location" && <select aria-label="Parent location" className="w-full rounded-md border px-3 py-2 text-sm" value={locationParentId} onChange={(event) => setLocationParentId(event.target.value)}><option value="">No parent (top level)</option>{(setup.locations || []).map((location) => <option key={location.id} value={location.id}>{location.parent_name ? `${location.parent_name} / ` : ""}{location.name}</option>)}</select>}<div className="flex gap-2"><Input id={`new-${key}`} value={newValues[key]} onChange={(event) => setNewValues((current) => ({ ...current, [key]: event.target.value }))} /><Button size="sm" disabled={!newValues[key].trim() || vocabularyMutation.isPending} onClick={() => vocabularyMutation.mutate({ type: endpoint, key, name: newValues[key] })}>Add</Button></div></div>)}</div>

    <div className="rounded-lg border p-4"><div className="mb-3 flex items-center gap-2 font-medium"><ClipboardCheck className="h-4 w-4" /> Create a versioned return checklist</div><div className="space-y-3"><select aria-label="Checklist version target" className="w-full rounded-md border px-3 py-2 text-sm" value={checklistTemplateId} onChange={(event) => { const id = event.target.value; setChecklistTemplateId(id); const selected = (setup.checklists || []).find((item) => item.id === id); if (selected) { setChecklistName(selected.name); setChecklistSteps((selected.items || []).map((item) => item.label)); } }}><option value="">Create a new checklist</option>{(setup.checklists || []).map((checklist) => <option key={checklist.id} value={checklist.id}>New version of {checklist.name} (currently v{checklist.version_number})</option>)}</select><Input aria-label="Checklist name" value={checklistName} disabled={Boolean(checklistTemplateId)} onChange={(event) => setChecklistName(event.target.value)} placeholder="Projector return inspection" />{checklistSteps.map((step, index) => <div key={index} className="flex gap-2"><Input aria-label={`Checklist step ${index + 1}`} value={step} onChange={(event) => setChecklistSteps((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} placeholder={`Step ${index + 1}`} />{checklistSteps.length > 1 && <Button variant="ghost" size="sm" onClick={() => setChecklistSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>}</div>)}<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setChecklistSteps((current) => [...current, ""])}>Add step</Button><Button size="sm" disabled={!checklistName.trim() || !checklistSteps.some((step) => step.trim()) || checklistMutation.isPending} onClick={() => checklistMutation.mutate()}>{checklistTemplateId ? "Publish new version" : "Publish checklist v1"}</Button></div></div></div>

    <div className="rounded-lg border p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">Bulk CSV import</p><p className="text-xs text-slate-500">Preview duplicate and validation results before creating inventory.</p></div><Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}><Download className="h-4 w-4" /> Template</Button></div><Input type="file" accept=".csv,text/csv" onChange={(event) => { setCsvFile(event.target.files?.[0] || null); setImportResult(null); }} /><div className="mt-3 flex gap-2"><Button variant="outline" className="gap-2" disabled={!csvFile || importMutation.isPending} onClick={() => importMutation.mutate(true)}><Upload className="h-4 w-4" /> Preview</Button><Button disabled={!csvFile || importMutation.isPending || !importResult?.dry_run} onClick={() => importMutation.mutate(false)}>Import ready rows</Button></div>{importResult && <div className="mt-3 max-h-44 overflow-y-auto rounded-md bg-slate-50 p-3 text-xs"><p className="mb-2 font-medium">{importResult.total} rows checked</p>{importResult.results.map((row) => <p key={row.row} className={row.status === "invalid" ? "text-red-700" : row.status === "duplicate" ? "text-amber-700" : "text-emerald-700"}>Row {row.row}: {row.status}{row.error ? ` — ${row.error}` : row.existing ? ` — matches ${row.existing.name}` : row.name ? ` — ${row.name}` : ""}</p>)}</div>}</div>
  </CardContent></Card>;
}
