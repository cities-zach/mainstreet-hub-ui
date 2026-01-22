import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/api";

export default function RequisitionList({ isAdmin, currentUser }) {
  const queryClient = useQueryClient();
  const { data: requisitions = [], isLoading } = useQuery({
    queryKey: ["requisitions"],
    queryFn: () => apiFetch("/requisitions")
  });

  const formatNeededBy = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const approveMutation = useMutation({
    mutationFn: (reqId) =>
      apiFetch(`/requisitions/${reqId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
    }
  });

  if (isLoading) return <p className="text-slate-500">Loading requisitions...</p>;

  return (
    <div className="space-y-3">
      {requisitions.length === 0 && (
        <p className="text-slate-500">No requisitions yet.</p>
      )}
      {requisitions.map((req) => (
        <div key={req.id} className="p-3 bg-white rounded border flex items-center justify-between">
          <div>
            <div className="font-medium">{req.title}</div>
            <div className="text-xs text-slate-500">Status: {req.status}</div>
            {req.needed_by && (
              <div className="text-xs text-slate-500">Needed by: {formatNeededBy(req.needed_by)}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && req.status === "submitted" && (
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(req.id)}
                disabled={approveMutation.isPending}
              >
                Approve
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
