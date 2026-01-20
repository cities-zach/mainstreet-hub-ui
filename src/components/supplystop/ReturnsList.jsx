import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/api";

export default function ReturnsList() {
  const queryClient = useQueryClient();
  const { data: requisitions = [], isLoading } = useQuery({
    queryKey: ["requisitions"],
    queryFn: () => apiFetch("/requisitions")
  });

  const returnMutation = useMutation({
    mutationFn: (reqId) =>
      apiFetch(`/requisitions/${reqId}/return`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["supply_items"] });
    }
  });

  if (isLoading) return <p className="text-slate-500">Loading returns...</p>;

  const approved = requisitions.filter((r) => r.status === "approved");

  return (
    <div className="space-y-3">
      {approved.length === 0 && (
        <p className="text-slate-500">No approved requisitions to return.</p>
      )}
      {approved.map((req) => (
        <div key={req.id} className="p-3 bg-white rounded border flex items-center justify-between">
          <div>
            <div className="font-medium">{req.title}</div>
            <div className="text-xs text-slate-500">Status: {req.status}</div>
          </div>
          <Button
            size="sm"
            onClick={() => returnMutation.mutate(req.id)}
            disabled={returnMutation.isPending}
          >
            Mark Returned
          </Button>
        </div>
      ))}
    </div>
  );
}
