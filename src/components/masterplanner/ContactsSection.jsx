import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Search, ExternalLink, MessageSquarePlus, UserPlus } from "lucide-react";

const KEY_ROLES = [
  { role: "Event Champion", responsibility: "Overall Responsibility and Point of Contact" },
  { role: "Production Manager", responsibility: "All Event Infrastructure, Ordering, Delivery, Scheduling" },
  { role: "Volunteer Coordinator", responsibility: "Volunteer Recruitment, training and event day management. POC for volunteers" },
  { role: "Health and Safety Coordinator", responsibility: "Risk assessments, legal compliance, fire points, inspections, first aid, cash handling, security" },
  { role: "Sanitation Coordinator", responsibility: "Waste collection, recycling, toilets and wash facilities, animal waste clean-up" },
  { role: "Marketing Coordinator", responsibility: "Social media, pre-event marketing, event day photo/video" },
  { role: "Vendor Coordinator", responsibility: "Vendor recruiting and training, physical infrastructure for vendors, vendor POC" },
  { role: "Finance Coordinator", responsibility: "Sponsorship, budget, partnerships, invoicing, accounts payable" },
];
const KEY_ROLE_NAMES = KEY_ROLES.map((r) => r.role);

function linkLabel(link) {
  return link.contact_name || link.entity_name || "Unnamed";
}
function linkContactInfo(link) {
  return [link.contact_email || link.entity_email, link.contact_phone || link.entity_phone].filter(Boolean).join(" · ");
}
function linkProfilePath(link) {
  if (link.contact_id) return `/crm/contacts/${link.contact_id}`;
  if (link.entity_id) return `/crm/entities/${link.entity_id}`;
  return null;
}

function CrmContactPicker({ onPick, onClose, disabled }) {
  const queryClient = useQueryClient();
  const [recordType, setRecordType] = useState("contact");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", first_name: "", last_name: "", email: "", phone: "" });
  const searchPath = recordType === "contact" ? "/crm/contacts" : "/crm/entities";
  const results = useQuery({
    queryKey: ["mp-crm-picker", recordType, query],
    queryFn: () => apiFetch(`${searchPath}?query=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 1,
  });
  const createRecord = useMutation({
    mutationFn: (payload) =>
      apiFetch(recordType === "contact" ? "/crm/contacts" : "/crm/entities", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      onPick(recordType, record);
      toast.success("CRM record created and linked");
    },
    onError: (error) => toast.error(error.message),
  });

  const submitNew = () => {
    if (recordType === "contact") {
      const emails = newForm.email ? [{ email: newForm.email, is_primary: true }] : [];
      const phones = newForm.phone ? [{ phone: newForm.phone, is_primary: true }] : [];
      createRecord.mutate({
        first_name: newForm.first_name,
        last_name: newForm.last_name,
        display_name: [newForm.first_name, newForm.last_name].filter(Boolean).join(" "),
        emails,
        phones,
        source: "masterplanner",
      });
    } else {
      createRecord.mutate({
        name: newForm.name,
        general_email: newForm.email || undefined,
        general_phone: newForm.phone || undefined,
        source: "masterplanner",
      });
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={recordType === "contact" ? "default" : "outline"} onClick={() => setRecordType("contact")}>Person</Button>
          <Button type="button" size="sm" variant={recordType === "entity" ? "default" : "outline"} onClick={() => setRecordType("entity")}>Business</Button>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
      {creating ? (
        <div className="space-y-2">
          {recordType === "contact" ? (
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="First name" value={newForm.first_name} onChange={(e) => setNewForm((p) => ({ ...p, first_name: e.target.value }))} />
              <Input placeholder="Last name" value={newForm.last_name} onChange={(e) => setNewForm((p) => ({ ...p, last_name: e.target.value }))} />
            </div>
          ) : (
            <Input placeholder="Business / organization name" value={newForm.name} onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))} />
          )}
          <Input placeholder="Email" value={newForm.email} onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))} />
          <Input placeholder="Phone" value={newForm.phone} onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))} />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={createRecord.isPending || disabled} onClick={submitNew}>Create &amp; link</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCreating(false)}>Back to search</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input className="pl-9" placeholder={recordType === "contact" ? "Search people" : "Search businesses"} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {query.trim().length > 1 ? (
            <div className="max-h-40 overflow-auto rounded-lg border divide-y">
              {(results.data || []).map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className="w-full text-left p-2 hover:bg-slate-50"
                  disabled={disabled}
                  onClick={() => onPick(recordType, record)}
                >
                  <p className="text-sm font-medium">{record.display_name || record.name}</p>
                  <p className="text-xs text-slate-500">{[record.primary_email, record.general_email, record.entity_type, record.category].filter(Boolean).join(" · ")}</p>
                </button>
              ))}
              {!(results.data || []).length ? <p className="p-2 text-xs text-slate-500">No matches.</p> : null}
            </div>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={() => setCreating(true)}>
            <UserPlus className="w-3 h-3 mr-1" /> Create new {recordType === "contact" ? "person" : "business"}
          </Button>
        </div>
      )}
    </div>
  );
}

function EventContactRow({ link, eventId, onRemove, readOnly }) {
  const queryClient = useQueryClient();
  const [logging, setLogging] = useState(false);
  const [tp, setTp] = useState({ subject: "", body: "" });
  const profilePath = linkProfilePath(link);
  const logTouchpoint = useMutation({
    mutationFn: () =>
      apiFetch("/crm/touchpoints", {
        method: "POST",
        body: JSON.stringify({
          subject: tp.subject || "Event contact touchpoint",
          body: tp.body || null,
          touchpoint_type: "note",
          related_event_id: eventId,
          related_contact_id: link.contact_id || undefined,
          related_entity_id: link.entity_id || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Touchpoint logged");
      setLogging(false);
      setTp({ subject: "", body: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#2d4650]">{linkLabel(link)}</p>
          <p className="text-xs text-slate-500">{linkContactInfo(link) || (link.entity_id ? "Business" : "Person")}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {profilePath ? (
            <Link to={profilePath} className="text-slate-400 hover:text-[#835879]" title="Open in CRM">
              <ExternalLink className="w-4 h-4" />
            </Link>
          ) : null}
          {!readOnly ? (
            <button type="button" className="text-slate-400 hover:text-[#835879]" title="Log touchpoint" onClick={() => setLogging((v) => !v)}>
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          ) : null}
          {!readOnly ? (
            <button type="button" className="text-red-500 hover:text-red-700" title="Remove" onClick={onRemove}>
              <Trash2 className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>
      {logging ? (
        <div className="space-y-2">
          <Input placeholder="Subject" value={tp.subject} onChange={(e) => setTp((p) => ({ ...p, subject: e.target.value }))} className="h-8" />
          <Input placeholder="Notes" value={tp.body} onChange={(e) => setTp((p) => ({ ...p, body: e.target.value }))} className="h-8" />
          <Button type="button" size="sm" disabled={logTouchpoint.isPending} onClick={() => logTouchpoint.mutate()}>Save touchpoint</Button>
        </div>
      ) : null}
    </div>
  );
}

export default function ContactsSection({ data, readOnly, eventId: eventIdProp }) {
  const eventId = eventIdProp || data?.id || null;
  const queryClient = useQueryClient();
  const [pickerRole, setPickerRole] = useState(null);
  const [additionalRole, setAdditionalRole] = useState("");
  const [showAdditionalPicker, setShowAdditionalPicker] = useState(false);

  const links = useQuery({
    queryKey: ["crm-event-contacts", eventId],
    queryFn: () => apiFetch(`/crm/events/${eventId}/contacts`),
    enabled: !!eventId,
  });
  const addLink = useMutation({
    mutationFn: (payload) => apiFetch(`/crm/events/${eventId}/contacts`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-event-contacts", eventId] });
      toast.success("Contact linked to event");
    },
    onError: (error) => toast.error(error.message),
  });
  const removeLink = useMutation({
    mutationFn: (id) => apiFetch(`/crm/event-contact-links/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-event-contacts", eventId] }),
    onError: (error) => toast.error(error.message),
  });

  if (!eventId) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500 max-w-2xl">
        <p className="font-medium text-[#2d4650]">Save this event first</p>
        <p className="text-sm mt-1">Event contacts now connect to your Relationship Manager. Save the plan as a draft, then link people and businesses from your CRM here.</p>
      </div>
    );
  }

  const allLinks = links.data || [];
  const linksByRole = (role) => allLinks.filter((l) => l.role === role);
  const additionalLinks = allLinks.filter((l) => !KEY_ROLE_NAMES.includes(l.role));

  const handlePick = (role, isChampion) => (recordType, record) => {
    addLink.mutate({
      role,
      is_champion: isChampion,
      contact_id: recordType === "contact" ? record.id : undefined,
      entity_id: recordType === "entity" ? record.id : undefined,
    });
    setPickerRole(null);
    setShowAdditionalPicker(false);
    setAdditionalRole("");
  };

  return (
    <div className="space-y-10 max-w-6xl">
      <div className="space-y-4">
        <div>
          <Label className="text-xl font-bold text-[#2d4650]">Key Event Contacts</Label>
          <p className="text-sm text-slate-500">Linked to your Relationship Manager. Activity logged here appears on each contact&apos;s CRM timeline.</p>
        </div>
        <div className="space-y-4">
          {KEY_ROLES.map((roleDef) => {
            const roleLinks = linksByRole(roleDef.role);
            const isChampion = roleDef.role === "Event Champion";
            return (
              <div key={roleDef.role} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#2d4650]">{roleDef.role}</p>
                    <p className="text-xs text-slate-500">{roleDef.responsibility}</p>
                  </div>
                  {!readOnly ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setPickerRole(pickerRole === roleDef.role ? null : roleDef.role)}>
                      <Plus className="w-3 h-3 mr-1" /> Link
                    </Button>
                  ) : null}
                </div>
                <div className="grid md:grid-cols-2 gap-2 mt-3">
                  {roleLinks.map((link) => (
                    <EventContactRow key={link.id} link={link} eventId={eventId} readOnly={readOnly} onRemove={() => removeLink.mutate(link.id)} />
                  ))}
                  {!roleLinks.length ? <p className="text-sm text-slate-400 italic">No one linked yet.</p> : null}
                </div>
                {pickerRole === roleDef.role ? (
                  <div className="mt-3">
                    <CrmContactPicker onPick={handlePick(roleDef.role, isChampion)} onClose={() => setPickerRole(null)} disabled={addLink.isPending} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xl font-bold text-[#2d4650]">Other Important Contacts</Label>
            <p className="text-sm text-slate-500">Suppliers, authorities, sponsors, attractions, and other partners.</p>
          </div>
          {!readOnly ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAdditionalPicker((v) => !v)}>
              <Plus className="w-3 h-3 mr-1" /> Add contact
            </Button>
          ) : null}
        </div>
        {showAdditionalPicker ? (
          <div className="rounded-lg border border-slate-200 p-3 space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Role / relationship (e.g. Sponsor, Police, Sound vendor)</Label>
              <Input value={additionalRole} onChange={(e) => setAdditionalRole(e.target.value)} placeholder="Role" />
            </div>
            <CrmContactPicker onPick={handlePick(additionalRole || "Contact", false)} onClose={() => setShowAdditionalPicker(false)} disabled={addLink.isPending} />
          </div>
        ) : null}
        <div className="grid md:grid-cols-2 gap-3">
          {additionalLinks.map((link) => (
            <div key={link.id} className="space-y-1">
              {link.role ? <p className="text-xs font-medium text-slate-500">{link.role}</p> : null}
              <EventContactRow link={link} eventId={eventId} readOnly={readOnly} onRemove={() => removeLink.mutate(link.id)} />
            </div>
          ))}
          {!additionalLinks.length ? <p className="text-sm text-slate-400 italic">No other contacts linked yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
