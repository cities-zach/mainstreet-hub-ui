import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ImagePlus, PackagePlus } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadPrivateFile } from "@/lib/uploads";

const TRACKING_TYPES = [
  ["quantity", "Quantity item", "Interchangeable stock such as chairs or cones"],
  ["serialized", "Serialized asset", "Each physical unit has its own code and history"],
  ["kit", "Kit", "A reusable bundle of inventory components"],
  ["consumable", "Consumable", "Stock that is used and may not return"],
];

const blankForm = (item = null) => ({
  name: item?.name || "", description: item?.description || "",
  tracking_type: item?.tracking_type || "quantity",
  quantity_available: item?.quantity_available ?? 0,
  category_id: item?.category_id || "", primary_location_id: item?.primary_location_id || "",
  condition_id: item?.condition_id || "", asset_code: item?.asset_code || "",
  photo_file_id: item?.photo_file_id || "",
  barcode: item?.barcode || "", replacement_value: item?.replacement_value || "",
  purchase_date: item?.purchase_date?.slice?.(0, 10) || "",
  warranty_expires_at: item?.warranty_expires_at?.slice?.(0, 10) || "",
  responsible_user_id: item?.responsible_user_id || "", tags: (item?.tags || []).join(", "),
  instruction_document_id: item?.instruction_document_id || "",
  instruction_version_id: item?.instruction_version_id || "",
  return_checklist_version_id: item?.return_checklist_version_id || "",
  notes: item?.notes || "",
});

function SelectField({ id, label, value, onChange, children }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><select id={id} value={value} onChange={onChange} className="w-full rounded-md border bg-background px-3 py-2 text-sm">{children}</select></div>;
}

export default function InventoryForm({ item, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => blankForm(item));
  const [addAnother, setAddAnother] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const setupQuery = useQuery({ queryKey: ["supply-setup"], queryFn: () => apiFetch("/supply/setup") });
  const rosterQuery = useQuery({ queryKey: ["user-roster"], queryFn: () => apiFetch("/users/roster") });
  const documentsQuery = useQuery({ queryKey: ["documents", "supply-instructions"], queryFn: () => apiFetch("/documents?status=active&limit=100") });
  const setup = setupQuery.data || { categories: [], locations: [], conditions: [], checklists: [] };
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const saveMutation = useMutation({
    mutationFn: () => apiFetch(item?.id ? `/supply/catalog-items/${item.id}` : "/supply/catalog-items", {
      method: item?.id ? "PATCH" : "POST",
      body: JSON.stringify({
        ...form,
        quantity_available: Number(form.quantity_available),
        replacement_value: form.replacement_value === "" ? null : Number(form.replacement_value),
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      }),
    }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["supply_items"] });
      toast.success(item ? "Inventory item updated" : "Inventory item created");
      if (addAnother && !item) {
        setForm((current) => blankForm({
          tracking_type: current.tracking_type, category_id: current.category_id,
          primary_location_id: current.primary_location_id, condition_id: current.condition_id,
          return_checklist_version_id: current.return_checklist_version_id,
        }));
        setStep(1);
      } else onSuccess?.(saved);
    },
    onError: (error) => toast.error(error.message || "Inventory item could not be saved"),
  });

  const selectedDocument = (documentsQuery.data?.documents || []).find((document) => document.id === form.instruction_document_id);
  const canContinue = step !== 1 || (form.name.trim() && Number.isInteger(Number(form.quantity_available)) && Number(form.quantity_available) >= 0);
  const handlePhoto = async (file) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadPrivateFile({ file, purpose: "supply-item-photo" });
      update("photo_file_id", uploaded.file_id);
      setPhotoName(uploaded.file_name || file.name);
      toast.success("Item photo uploaded");
    } catch (error) {
      toast.error(error.message || "Photo could not be uploaded");
    } finally { setUploadingPhoto(false); }
  };

  return <form onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }} className="space-y-5">
    <div className="flex gap-2" aria-label="Inventory setup progress">
      {["Essentials", "Details", "Instructions"].map((label, index) => <div key={label} className={`flex-1 rounded-md px-3 py-2 text-center text-xs font-medium ${step === index + 1 ? "bg-[#610345] text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}. {label}</div>)}
    </div>

    {step === 1 && <div className="space-y-5">
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Tracking type</legend><div className="grid gap-2 sm:grid-cols-2">{TRACKING_TYPES.map(([value, label, description]) => <label key={value} className={`rounded-lg border p-3 ${form.tracking_type === value ? "border-[#610345] bg-pink-50" : ""}`}><input type="radio" className="mr-2" name="tracking-type" value={value} checked={form.tracking_type === value} onChange={() => update("tracking_type", value)} /><strong className="text-sm">{label}</strong><span className="mt-1 block text-xs text-slate-500">{description}</span></label>)}</div></fieldset>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="supply-name">Name *</Label><Input id="supply-name" value={form.name} onChange={(event) => update("name", event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="supply-quantity">{form.tracking_type === "serialized" ? "Number of assets" : "Starting quantity"} *</Label><Input id="supply-quantity" type="number" min="0" step="1" value={form.quantity_available} onChange={(event) => update("quantity_available", event.target.value)} required /></div></div>
      <div className="grid gap-4 sm:grid-cols-3"><SelectField id="supply-category" label="Category" value={form.category_id} onChange={(event) => update("category_id", event.target.value)}><option value="">Not selected</option>{setup.categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</SelectField><SelectField id="supply-location" label="Primary location" value={form.primary_location_id} onChange={(event) => update("primary_location_id", event.target.value)}><option value="">Not selected</option>{setup.locations.map((entry) => <option key={entry.id} value={entry.id}>{entry.parent_name ? `${entry.parent_name} › ` : ""}{entry.name}</option>)}</SelectField><SelectField id="supply-condition" label="Condition" value={form.condition_id} onChange={(event) => update("condition_id", event.target.value)}><option value="">Not selected</option>{setup.conditions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</SelectField></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="supply-code">MainSuite asset/bin code</Label><Input id="supply-code" value={form.asset_code} onChange={(event) => update("asset_code", event.target.value)} placeholder="MS-WH-001" /></div><div className="space-y-2"><Label htmlFor="supply-barcode">UPC, EAN, or manual code</Label><Input id="supply-barcode" value={form.barcode} onChange={(event) => update("barcode", event.target.value)} /></div></div>
    </div>}

    {step === 2 && <div className="space-y-4">
      <div className="space-y-2"><Label htmlFor="supply-description">Description</Label><Textarea id="supply-description" rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="replacement-value">Replacement value</Label><Input id="replacement-value" type="number" min="0" step="0.01" value={form.replacement_value} onChange={(event) => update("replacement_value", event.target.value)} /></div><div className="space-y-2"><Label htmlFor="purchase-date">Purchase date</Label><Input id="purchase-date" type="date" value={form.purchase_date} onChange={(event) => update("purchase_date", event.target.value)} /></div><div className="space-y-2"><Label htmlFor="warranty-date">Warranty expiration</Label><Input id="warranty-date" type="date" value={form.warranty_expires_at} onChange={(event) => update("warranty_expires_at", event.target.value)} /></div></div>
      <SelectField id="supply-owner" label="Responsible owner" value={form.responsible_user_id} onChange={(event) => update("responsible_user_id", event.target.value)}><option value="">Not assigned</option>{(rosterQuery.data || []).map((user) => <option key={user.id} value={user.id}>{user.full_name || user.email}</option>)}</SelectField>
      <div className="space-y-2"><Label htmlFor="supply-photo">Item photo</Label><div className="flex flex-wrap items-center gap-2"><Input id="supply-photo" className="max-w-sm" type="file" accept="image/*" disabled={uploadingPhoto} onChange={(event) => handlePhoto(event.target.files?.[0])} />{(photoName || form.photo_file_id) && <span className="flex items-center gap-1 text-xs text-emerald-700"><ImagePlus className="h-4 w-4" /> {photoName || "Saved photo"}</span>}{form.photo_file_id && <Button type="button" size="sm" variant="ghost" onClick={() => { update("photo_file_id", ""); setPhotoName(""); }}>Remove</Button>}</div><p className="text-xs text-slate-500">Stored privately and available only to authenticated users in this organization.</p></div>
      <div className="space-y-2"><Label htmlFor="supply-tags">Tags</Label><Input id="supply-tags" value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="outdoor, electrical, event" /></div>
      <div className="space-y-2"><Label htmlFor="supply-notes">Notes</Label><Textarea id="supply-notes" rows={4} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></div>
    </div>}

    {step === 3 && <div className="space-y-4">
      <SelectField id="supply-instructions" label="Operating instructions from Document Library" value={form.instruction_document_id} onChange={(event) => { const next = (documentsQuery.data?.documents || []).find((document) => document.id === event.target.value); update("instruction_document_id", event.target.value); update("instruction_version_id", next?.version_id || ""); }}><option value="">No linked instructions</option>{(documentsQuery.data?.documents || []).map((document) => <option key={document.id} value={document.id}>{document.title} (v{document.version_number})</option>)}</SelectField>
      {selectedDocument && <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">The exact current version ({selectedDocument.version_number}) will be linked. Future requisitions retain their own version snapshot.</p>}
      <SelectField id="supply-checklist" label="Return checklist" value={form.return_checklist_version_id} onChange={(event) => update("return_checklist_version_id", event.target.value)}><option value="">No return checklist</option>{setup.checklists.map((checklist) => <option key={checklist.id} value={checklist.current_version_id}>{checklist.name} (v{checklist.version_number})</option>)}</SelectField>
      <p className="text-sm text-slate-500">The checklist version is snapshotted on each requisition so later edits cannot change the steps used at checkout.</p>
    </div>}

    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-white py-3">
      <div>{step > 1 && <Button type="button" variant="outline" className="gap-2" onClick={() => setStep((value) => value - 1)}><ChevronLeft className="h-4 w-4" /> Back</Button>}</div>
      <div className="flex items-center gap-2">{!item && step === 3 && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={addAnother} onChange={(event) => setAddAnother(event.target.checked)} /> Save and add another</label>}<Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>{step < 3 ? <Button type="button" className="gap-2" disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continue <ChevronRight className="h-4 w-4" /></Button> : <Button type="submit" className="gap-2" disabled={saveMutation.isPending}><PackagePlus className="h-4 w-4" /> {saveMutation.isPending ? "Saving…" : "Save item"}</Button>}</div>
    </div>
  </form>;
}
