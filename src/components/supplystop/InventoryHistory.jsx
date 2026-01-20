import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api";

export default function InventoryHistory({ itemId }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["supply_history", itemId],
    queryFn: () => apiFetch(`/supply/items/${itemId}/history`),
    enabled: !!itemId
  });

  if (isLoading) {
    return <p className="text-slate-500">Loading history...</p>;
  }

  if (history.length === 0) {
    return <p className="text-slate-500">No history yet.</p>;
  }

  return (
    <div className="space-y-2">
      {history.map((h) => (
        <div key={h.id} className="p-2 border rounded text-sm">
          <div className="font-medium capitalize">{h.action}</div>
          <div className="text-xs text-slate-500">
            Qty: {h.quantity} • {new Date(h.created_at).toLocaleString()}
          </div>
          {h.notes && <div className="text-xs text-slate-600">{h.notes}</div>}
        </div>
      ))}
    </div>
  );
}
