import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function normalizeValues(response) {
  if (response?.answer_text != null && response.answer_text !== "") {
    return [String(response.answer_text)];
  }
  if (response?.answer_number != null) {
    return [String(response.answer_number)];
  }
  if (response?.answer_json != null) {
    const v = response.answer_json;
    if (Array.isArray(v)) return v.map((item) => String(item));
    if (v && typeof v === "object") return [JSON.stringify(v)];
    return [String(v)];
  }
  return ["No response"];
}

export default function ResponseSummary({ question, responses = [] }) {
  if (!question) return null;

  const counts = responses.reduce((acc, r) => {
    const values = normalizeValues(r);
    values.forEach((value) => {
      acc[value] = (acc[value] || 0) + 1;
    });
    return acc;
  }, {});

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
      <CardHeader>
        <CardTitle className="text-base text-slate-800">
          {question.question_text}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.keys(counts).length === 0 ? (
          <p className="text-sm text-slate-500">No responses yet.</p>
        ) : (
          Object.entries(counts).map(([value, count]) => (
            <div
              key={value}
              className="flex justify-between text-sm text-slate-700"
            >
              <span className="truncate">{value}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
