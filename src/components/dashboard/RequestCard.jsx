import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RequestCard({ request }) {
  const navigate = useNavigate();

  if (!request) return null;

  const statusColors = {
    draft: "bg-slate-100 text-slate-700",
    pending: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    review: "bg-purple-100 text-purple-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    submitted: "bg-blue-100 text-blue-800",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg">
            {request.title || "Untitled Request"}
          </CardTitle>
          <Badge className={statusColors[request.status] || "bg-slate-100"}>
            {(request.status || "draft").toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {request.event_name && (
          <p className="text-sm text-slate-600">
            Event: <span className="font-medium">{request.event_name}</span>
          </p>
        )}

        {request.summary && (
          <p className="text-sm text-slate-600 line-clamp-2">
            {request.summary}
          </p>
        )}

        <div className="pt-2 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              navigate(`/marketstreet/request?id=${request.id}`)
            }
            className="gap-1"
          >
            View
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
