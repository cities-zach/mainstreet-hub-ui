import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/api";

export default function InventoryForm({ item, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: item?.name || "",
    description: item?.description || "",
    category: item?.category || "",
    quantity_available: item?.quantity_available ?? 0,
    condition: item?.condition || "",
    storage_location: item?.storage_location || "",
    photo_url: item?.photo_url || "",
    file_name: item?.file_name || "",
    notes: item?.notes || ""
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      item?.id
        ? apiFetch(`/supply/items/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify(data)
          })
        : apiFetch("/supply/items", {
            method: "POST",
            body: JSON.stringify(data)
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supply_items"] });
      onSuccess?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    saveMutation.mutate({
      ...formData,
      quantity_available: Number(formData.quantity_available) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quantity Available</Label>
          <Input
            type="number"
            min="0"
            value={formData.quantity_available}
            onChange={(e) =>
              setFormData({ ...formData, quantity_available: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Condition</Label>
          <Input
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Storage Location</Label>
          <Input
            value={formData.storage_location}
            onChange={(e) =>
              setFormData({ ...formData, storage_location: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Photo URL</Label>
          <Input
            value={formData.photo_url}
            onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>File Name</Label>
          <Input
            value={formData.file_name}
            onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
