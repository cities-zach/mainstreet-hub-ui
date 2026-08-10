import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ChevronDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadPrivateFile } from "@/lib/uploads";

function ReturnItem({ item, setup }) {
  const queryClient = useQueryClient();
  const remaining = Number(item.quantity) - Number(item.returned_quantity || 0) - Number(item.consumed_quantity || 0) - Number(item.missing_quantity || 0);
  const checklist = item.checklist_version_id ? {
    name: item.checklist_name, version_number: item.checklist_version_number,
    items: item.checklist_items || [],
  } : null;
  const isSerialized = item.tracking_type === "serialized";
  const [form, setForm] = useState({ returned_quantity: isSerialized ? 1 : remaining, consumed_quantity: 0, missing_quantity: 0, asset_id: "", condition_id: "", returned_location_id: "", exception_type: "", notes: "", create_follow_up_task: false, evidence_file_ids: [], checklist_results: [] });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const completeChecklist = (step, value) => update("checklist_results", [...form.checklist_results.filter((result) => result.item_id !== step.id), { item_id: step.id, completed: value, value }]);
  const mutation = useMutation({
    mutationFn: () => apiFetch(`/requisition-items/${item.id}/return`, { method: "POST", body: JSON.stringify({ ...form, returned_quantity: Number(form.returned_quantity), consumed_quantity: Number(form.consumed_quantity), missing_quantity: Number(form.missing_quantity) }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["requisitions"] }); queryClient.invalidateQueries({ queryKey: ["requisition-items"] }); queryClient.invalidateQueries({ queryKey: ["supply_items"] }); toast.success("Item return saved"); },
    onError: (error) => toast.error(error.message || "Return could not be saved"),
  });
  const uploadEvidence = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try { const stored = await uploadPrivateFile({ file, purpose: "supply-return-evidence" }); update("evidence_file_ids", [...form.evidence_file_ids, stored.file_id]); toast.success("Evidence photo attached"); }
    catch (error) { toast.error(error.message || "Evidence upload failed"); }
  };
  if (remaining <= 0) return <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{item.item_name}: return complete.</div>;
  return <div className="space-y-4 rounded-lg border p-4"><div><p className="font-medium">{item.item_name}</p><p className="text-xs text-slate-500">{remaining} of {item.quantity} still open</p></div>{isSerialized && <div><Label htmlFor={`asset-${item.id}`}>Serialized asset *</Label><select id={`asset-${item.id}`} className="w-full rounded-md border px-3 py-2 text-sm" value={form.asset_id} onChange={(event) => update("asset_id", event.target.value)}><option value="">Select asset</option>{(item.assigned_assets || []).filter((asset) => !asset.returned_at).map((asset) => <option key={asset.id} value={asset.id}>{asset.asset_code}{asset.serial_number ? ` · ${asset.serial_number}` : ""}</option>)}</select></div>}<div className="grid gap-3 sm:grid-cols-3"><div><Label htmlFor={`returned-${item.id}`}>Returned</Label><Input id={`returned-${item.id}`} type="number" min="0" max={isSerialized ? 1 : remaining} value={form.returned_quantity} onChange={(event) => update("returned_quantity", event.target.value)} /></div><div><Label htmlFor={`consumed-${item.id}`}>Consumed</Label><Input id={`consumed-${item.id}`} type="number" min="0" max={isSerialized ? 0 : remaining} disabled={isSerialized} value={form.consumed_quantity} onChange={(event) => update("consumed_quantity", event.target.value)} /></div><div><Label htmlFor={`missing-${item.id}`}>Missing</Label><Input id={`missing-${item.id}`} type="number" min="0" max={isSerialized ? 1 : remaining} value={form.missing_quantity} onChange={(event) => update("missing_quantity", event.target.value)} /></div></div>
    {checklist && <fieldset className="space-y-2"><legend className="text-sm font-medium">{checklist.name} (snapshotted v{checklist.version_number})</legend>{checklist.items.map((step) => <label key={step.id} className="flex items-start gap-2 rounded-md bg-slate-50 p-2 text-sm"><input type="checkbox" className="mt-1" checked={form.checklist_results.some((result) => result.item_id === step.id && result.completed)} onChange={(event) => completeChecklist(step, event.target.checked)} /><span>{step.label}{step.required && <span className="text-red-500"> *</span>}</span></label>)}</fieldset>}
    <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor={`return-condition-${item.id}`}>Returned condition</Label><select id={`return-condition-${item.id}`} className="w-full rounded-md border px-3 py-2 text-sm" value={form.condition_id} onChange={(event) => update("condition_id", event.target.value)}><option value="">Not selected</option>{setup.conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.name}</option>)}</select></div><div><Label htmlFor={`return-location-${item.id}`}>Returned location</Label><select id={`return-location-${item.id}`} className="w-full rounded-md border px-3 py-2 text-sm" value={form.returned_location_id} onChange={(event) => update("returned_location_id", event.target.value)}><option value="">Not selected</option>{setup.locations.map((location) => <option key={location.id} value={location.id}>{location.parent_name ? `${location.parent_name} › ` : ""}{location.name}</option>)}</select></div></div>
    <div><Label htmlFor={`exception-${item.id}`}>Exception</Label><select id={`exception-${item.id}`} className="w-full rounded-md border px-3 py-2 text-sm" value={form.exception_type} onChange={(event) => update("exception_type", event.target.value)}><option value="">No exception</option><option value="damage">Damage</option><option value="missing_parts">Missing parts</option><option value="cleaning">Cleaning needed</option><option value="repair">Repair needed</option><option value="missing">Missing item</option></select></div>
    <Textarea aria-label="Return notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Inspection notes" />
    <div className="flex flex-wrap items-center gap-3"><label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={uploadEvidence} /><span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><Camera className="h-4 w-4" /> Add evidence photo</span></label>{form.evidence_file_ids.length > 0 && <span className="text-xs text-slate-500">{form.evidence_file_ids.length} attached</span>}{form.exception_type && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.create_follow_up_task} onChange={(event) => update("create_follow_up_task", event.target.checked)} /> Create follow-up task</label>}</div>
    <Button className="gap-2" disabled={mutation.isPending} onClick={() => mutation.mutate()}><RotateCcw className="h-4 w-4" /> Save item return</Button>
  </div>;
}

function RequisitionReturn({ requisition, setup }) {
  const [open, setOpen] = useState(false);
  const itemsQuery = useQuery({ queryKey: ["requisition-items", requisition.id], queryFn: () => apiFetch(`/requisitions/${requisition.id}/items`), enabled: open });
  return <div className="rounded-lg border bg-white"><button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen((value) => !value)}><div><p className="font-medium">{requisition.title}</p><p className="text-xs text-slate-500">{requisition.requested_by_name || "Requester"}</p></div><ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} /></button>{open && <div className="space-y-3 border-t p-4">{itemsQuery.isLoading ? <p className="text-sm text-slate-500">Loading items…</p> : (itemsQuery.data || []).map((item) => <ReturnItem key={`${item.id}-${item.returned_quantity}-${item.consumed_quantity}-${item.missing_quantity}`} item={item} setup={setup} />)}</div>}</div>;
}

export default function ReturnsList({ isAdmin }) {
  const requisitionsQuery = useQuery({ queryKey: ["requisitions"], queryFn: () => apiFetch("/requisitions") });
  const setupQuery = useQuery({ queryKey: ["supply-setup"], queryFn: () => apiFetch("/supply/setup") });
  if (!isAdmin) return <p className="rounded-lg border bg-white p-6 text-slate-500">Inventory managers receive and inspect returned items.</p>;
  if (requisitionsQuery.isLoading || setupQuery.isLoading) return <p className="text-slate-500">Loading returns…</p>;
  const open = (requisitionsQuery.data || []).filter((requisition) => requisition.status === "approved");
  return <div className="space-y-3">{open.length ? open.map((requisition) => <RequisitionReturn key={requisition.id} requisition={requisition} setup={setupQuery.data || { conditions: [], locations: [], checklists: [] }} />) : <p className="rounded-lg border bg-white p-8 text-center text-slate-500">No requisitions have open returns.</p>}</div>;
}
