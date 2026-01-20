import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const FIXED_ROLES = [
  { role: "Event Champion", responsibility: "Overall Responsibility and Point of Contact" },
  { role: "Production Manager", responsibility: "All Event Infrastructure, Ordering, Delivery, Scheduling" },
  { role: "Volunteer Coordinator", responsibility: "Volunteer Recruitment, training and event day management. POC for volunteers" },
  { role: "Health and Safety Coordinator", responsibility: "Risk assessments, legal compliance, fire points, inspections, first aid, cash handling, security" },
  { role: "Sanitation Coordinator", responsibility: "Waste collection, recycling, toilets and wash facilities, animal waste clean-up" },
  { role: "Marketing Coordinator", responsibility: "Social media, pre-event marketing, event day photo/video" },
  { role: "Vendor Coordinator", responsibility: "Vendor recruiting and training, physical infrastructure for vendors, vendor POC" },
  { role: "Finance Coordinator", responsibility: "Sponsorship, budget, partnerships, invoicing, accounts payable" },
];

const SECTIONS = ["Suppliers", "Authorities", "Attractions/Talent/Other", "Sponsors"];

export default function ContactsSection({ data, onChange, readOnly }) {
  useEffect(() => {
    if (!data.key_contacts || data.key_contacts.length === 0) {
      const initialContacts = FIXED_ROLES.map((r) => ({
        role: r.role,
        responsibility: r.responsibility,
        name: "",
        email: "",
        phone: "",
      }));

      // Merge any existing role matches if present (defensive)
      const mergedContacts = initialContacts.map((ic) => {
        const existing = data.key_contacts?.find((kc) => kc.role === ic.role);
        return existing || ic;
      });

      // Avoid infinite loops by only setting if different length or missing
      if (data.key_contacts?.length !== mergedContacts.length) {
        onChange({ key_contacts: mergedContacts });
      }
    }
  }, [data.key_contacts, onChange]);

  const updateKeyContact = (index, field, value) => {
    const newContacts = [...(data.key_contacts || [])];
    newContacts[index] = { ...newContacts[index], [field]: value };
    onChange({ key_contacts: newContacts });
  };

  const otherContacts = data.other_contacts || [];

  const addOtherContact = (section) => {
    onChange({
      other_contacts: [
        ...otherContacts,
        { section, name: "", organization: "", service: "", email: "", phone: "", notes: "" },
      ],
    });
  };

  const updateOtherContact = (index, field, value) => {
    const updated = [...otherContacts];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ other_contacts: updated });
  };

  const removeOtherContact = (index) => {
    const updated = otherContacts.filter((_, i) => i !== index);
    onChange({ other_contacts: updated });
  };

  return (
    <div className="space-y-10 max-w-6xl">
      {/* Key Event Contacts */}
      <div className="space-y-4">
        <Label className="text-xl font-bold text-[#2d4650]">Key Event Contacts</Label>
        <div className="overflow-x-auto border rounded-lg border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase">
              <tr>
                <th className="px-4 py-3 w-1/6">Role</th>
                <th className="px-4 py-3 w-1/4">Responsibility</th>
                <th className="px-4 py-3 w-1/6">Name</th>
                <th className="px-4 py-3 w-1/6">Email</th>
                <th className="px-4 py-3 w-1/6">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.key_contacts || []).map((contact, index) => (
                <tr key={contact.role} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-[#2d4650]">{contact.role}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{contact.responsibility}</td>
                  <td className="px-4 py-3">
                    <Input
                      value={contact.name || ""}
                      onChange={(e) => updateKeyContact(index, "name", e.target.value)}
                      placeholder="Name"
                      className="h-8"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      value={contact.email || ""}
                      onChange={(e) => updateKeyContact(index, "email", e.target.value)}
                      placeholder="Email"
                      className="h-8"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      value={contact.phone || ""}
                      onChange={(e) => updateKeyContact(index, "phone", e.target.value)}
                      placeholder="Phone"
                      className="h-8"
                      disabled={readOnly}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Other Important Contacts */}
      <div className="space-y-6">
        <Label className="text-xl font-bold text-[#2d4650]">Other Important Event Contacts</Label>

        {SECTIONS.map((section) => {
          const sectionContacts = otherContacts
            .map((c, i) => ({ ...c, originalIndex: i }))
            .filter((c) => c.section === section);

          return (
            <div key={section} className="space-y-3">
              <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-700">{section}</h3>
                  {section === "Authorities" && (
                    <span className="text-xs text-slate-500 font-normal">(Police, Fire, EMS, etc.)</span>
                  )}
                </div>
                {!readOnly && (
                  <Button
                    onClick={() => addOtherContact(section)}
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-slate-50 h-8 text-xs"
                    type="button"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add {section}
                  </Button>
                )}
              </div>

              {sectionContacts.length === 0 ? (
                <p className="text-sm text-slate-400 italic px-4">No contacts added for {section}</p>
              ) : (
                <div className="grid gap-4">
                  {sectionContacts.map((contact) => (
                    <div
                      key={contact.originalIndex}
                      className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative group"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Name</Label>
                          <Input
                            value={contact.name}
                            onChange={(e) => updateOtherContact(contact.originalIndex, "name", e.target.value)}
                            className="h-8 bg-white"
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Organization</Label>
                          <Input
                            value={contact.organization}
                            onChange={(e) => updateOtherContact(contact.originalIndex, "organization", e.target.value)}
                            className="h-8 bg-white"
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Service</Label>
                          <Input
                            value={contact.service}
                            onChange={(e) => updateOtherContact(contact.originalIndex, "service", e.target.value)}
                            className="h-8 bg-white"
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Email</Label>
                          <Input
                            value={contact.email}
                            onChange={(e) => updateOtherContact(contact.originalIndex, "email", e.target.value)}
                            className="h-8 bg-white"
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Phone</Label>
                          <Input
                            value={contact.phone}
                            onChange={(e) => updateOtherContact(contact.originalIndex, "phone", e.target.value)}
                            className="h-8 bg-white"
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Notes</Label>
                          <Input
                            value={contact.notes}
                            onChange={(e) => updateOtherContact(contact.originalIndex, "notes", e.target.value)}
                            className="h-8 bg-white"
                            disabled={readOnly}
                          />
                        </div>
                      </div>

                      {!readOnly && (
                        <Button
                          onClick={() => removeOtherContact(contact.originalIndex)}
                          variant="ghost"
                          size="icon"
                          className="absolute -right-2 -top-2 h-6 w-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          type="button"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
