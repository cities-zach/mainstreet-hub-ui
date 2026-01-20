import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/api";

export default function RequisitionForm({ inventory = [], onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState({});

  const itemsArray = useMemo(
    () =>
      Object.entries(selectedItems)
        .map(([id, qty]) => ({ id, qty: Number(qty) }))
        .filter((i) => Number.isFinite(i.qty) && i.qty > 0),
    [selectedItems]
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const requisition = await apiFetch("/requisitions", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          amount: null
        })
      });

      for (const item of itemsArray) {
        await apiFetch(`/requisitions/${requisition.id}/items`, {
          method: "POST",
          body: JSON.stringify({
            supply_item_id: item.id,
            quantity: item.qty
          })
        });
      }

      return requisition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      onSuccess?.();
      setTitle("");
      setDescription("");
      setSelectedItems({});
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (itemsArray.length === 0) return;
    createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Select Items *</Label>
        <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
          {inventory.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex-1 text-sm">{item.name}</div>
              <Input
                type="number"
                min="0"
                className="w-20"
                value={selectedItems[item.id] ?? ""}
                onChange={(e) =>
                  setSelectedItems((prev) => ({
                    ...prev,
                    [item.id]: e.target.value
                  }))
                }
              />
            </div>
          ))}
          {inventory.length === 0 && (
            <p className="text-sm text-slate-500">No inventory items available.</p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}
