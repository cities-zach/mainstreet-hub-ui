import React, { useState } from "react";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NamePromptModal({ isOpen, onSaved }) {
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = fullName.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: trimmed }),
      });
      toast.success("Thanks! Your name is saved.");
      setFullName("");
      onSaved?.();
    } catch (error) {
      toast.error(error?.message || "Unable to save your name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">
          Add your name
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Please add your full name so assignments and search work correctly.
        </p>
        <div className="mt-4 space-y-2">
          <Label>Full name</Label>
          <Input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            className="bg-[#835879] text-white"
            disabled={!fullName.trim() || saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save name"}
          </Button>
        </div>
      </div>
    </div>
  );
}
