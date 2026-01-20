import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function WeeklyCalendar({ items = [] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Clock className="w-5 h-5 text-slate-500" />
        <CardTitle>This Week</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing scheduled this week.
          </p>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between text-sm border-b last:border-b-0 py-1"
            >
              <span className="font-medium">{item.title}</span>
              <span className="text-slate-500">
                {item.time || ""}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
