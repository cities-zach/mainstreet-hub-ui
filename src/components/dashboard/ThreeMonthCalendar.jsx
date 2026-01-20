import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function ThreeMonthCalendar({ events = [] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Calendar className="w-5 h-5 text-slate-500" />
        <CardTitle>Upcoming (3 Months)</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">
            No upcoming events scheduled.
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="p-2 rounded border border-slate-200 text-sm"
            >
              <p className="font-medium">{event.name}</p>
              <p className="text-slate-500">
                {event.start_date || event.starts_at || "Date TBD"}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
