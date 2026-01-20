import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MaterialsCard from "@/components/request/MaterialsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/api";

export default function MaterialsSection({
  request,
  materials = [],
  isRequester,
  canUploadMaterials,
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    material_type: "",
    file_name: "",
    file_url: "",
    notes: ""
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      apiFetch("/materials", {
        method: "POST",
        body: JSON.stringify({ ...data, request_id: request.id })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", request.id] });
      setShowForm(false);
      setFormData({ material_type: "", file_name: "", file_url: "", notes: "" });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.file_name && !formData.file_url && !formData.material_type) return;
    createMutation.mutate(formData);
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-slate-800 dark:text-slate-100">Materials</CardTitle>
        {canUploadMaterials && (
          <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Add Material"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && canUploadMaterials && (
          <form onSubmit={handleSubmit} className="space-y-3 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950">
            <div className="grid gap-2">
              <Label>Material Type</Label>
              <Input
                value={formData.material_type}
                onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                placeholder="e.g. Facebook Post"
              />
            </div>
            <div className="grid gap-2">
              <Label>File Name</Label>
              <Input
                value={formData.file_name}
                onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                placeholder="e.g. flyer.pdf"
              />
            </div>
            <div className="grid gap-2">
              <Label>File URL</Label>
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        )}
        {materials.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No materials uploaded yet.
          </p>
        ) : (
          materials.map((m) => (
            <MaterialsCard key={m.id} material={m} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
