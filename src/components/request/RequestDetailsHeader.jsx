// src/components/request/RequestDetailsHeader.jsx
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RequestDetailsHeader({ request, updateRequestMutation }) {
  if (!request) return null;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Request Status
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {request.status || "draft"}
          </p>
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
