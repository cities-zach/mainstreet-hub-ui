import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RequestDetailsInfo({ request }) {
  if (!request) return null;

  return (
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-800 dark:text-slate-100">Request Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
        <div>
          <span className="font-medium">Event:</span>{" "}
          {request.event_name || "—"}
        </div>
        <div>
          <span className="font-medium">Requested By:</span>{" "}
          {request.created_by || "—"}
        </div>
        <div>
          <span className="font-medium">Type:</span>{" "}
          {request.request_type || "—"}
        </div>
        <div>
          <span className="font-medium">Notes:</span>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {request.notes || "No additional notes."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
