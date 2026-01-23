// src/components/request/RequestDetailsHeader.jsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RequestDetailsHeader({ request, updateRequestMutation }) {
  if (!request) return null;

  const statusColors = {
    pending: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    review: "bg-purple-100 text-purple-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    draft: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Request Status
          </h2>
          <Badge
            className={`mt-2 ${statusColors[request.status] || "bg-slate-100 text-slate-700"}`}
          >
            {(request.status || "draft").toUpperCase()}
          </Badge>
        </div>

        {updateRequestMutation && (
          <div className="flex items-center gap-2">
            <Select
              value={request.status || "pending"}
              onValueChange={(value) =>
                updateRequestMutation.mutate({
                  id: request.id,
                  data: { status: value },
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() =>
                updateRequestMutation.mutate({
                  id: request.id,
                  data: { status: request.status || "pending" },
                })
              }
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
