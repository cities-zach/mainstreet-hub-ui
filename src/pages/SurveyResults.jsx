import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Users, BarChart3, Download } from "lucide-react";
import ResponseSummary from "@/components/feedback/ResponseSummary";

function normalizeAnswerValue(response) {
  if (response?.answer_text != null && response.answer_text !== "") {
    return String(response.answer_text);
  }
  if (response?.answer_number != null) {
    return String(response.answer_number);
  }
  if (response?.answer_json != null) {
    const value = response.answer_json;
    if (Array.isArray(value)) return value.map((item) => String(item)).join("; ");
    if (value && typeof value === "object") return JSON.stringify(value);
    return String(value);
  }
  return "";
}

function escapeCsvValue(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildSurveyCsv({ survey, questions, responses }) {
  const questionList = Array.isArray(questions) ? questions : [];
  const responseList = Array.isArray(responses) ? responses : [];

  const headers = [
    "submission_id",
    "submitted_at",
    ...questionList.map((q) => q.question_text || q.id)
  ];

  const responsesBySubmission = new Map();
  responseList.forEach((response) => {
    if (!response?.submission_id) return;
    if (!responsesBySubmission.has(response.submission_id)) {
      responsesBySubmission.set(response.submission_id, {
        submission_id: response.submission_id,
        submitted_at: response.created_at ?? "",
        answers: {}
      });
    }
    const entry = responsesBySubmission.get(response.submission_id);
    entry.answers[response.question_id] = normalizeAnswerValue(response);
    if (!entry.submitted_at && response.created_at) {
      entry.submitted_at = response.created_at;
    }
  });

  const rows = [];
  for (const entry of responsesBySubmission.values()) {
    const row = [
      entry.submission_id,
      entry.submitted_at,
      ...questionList.map((q) => entry.answers[q.id] ?? "")
    ];
    rows.push(row);
  }

  const csvLines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(","))
  ];
  const filenameBase = (survey?.title || "survey-results")
    .toString()
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return {
    csv: csvLines.join("\n"),
    filename: `${filenameBase || "survey-results"}.csv`
  };
}

export default function SurveyResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get("id");

  const { data: survey } = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: () => apiFetch(`/surveys/${surveyId}`),
    enabled: !!surveyId
  });

  const { data: questions } = useQuery({
    queryKey: ["survey_questions", surveyId],
    queryFn: () => apiFetch(`/surveys/${surveyId}/questions`),
    enabled: !!surveyId
  });

  const { data: responses } = useQuery({
    queryKey: ["survey_responses", surveyId],
    queryFn: () => apiFetch(`/surveys/${surveyId}/responses`),
    enabled: !!surveyId
  });

  if (!survey || !questions) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading results...</div>;
  }

  const uniqueSubmissions = [
    ...new Set((responses || []).map(r => r.submission_id))
  ].filter(Boolean);

  const handleExportCsv = () => {
    const { csv, filename } = buildSurveyCsv({
      survey,
      questions,
      responses
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/feedback")}
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {survey.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Survey Results</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-sm">
              <Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="font-semibold">
                {uniqueSubmissions.length} Responses
              </span>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              disabled={uniqueSubmissions.length === 0}
              onClick={handleExportCsv}
            >
              <Download className="w-4 h-4" />
              Download CSV
            </Button>
          </div>
        </div>

        {uniqueSubmissions.length === 0 ? (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
            <CardContent className="py-16 text-center">
              <BarChart3 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
                No Responses Yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Responses will appear here once people complete the survey.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {questions.map(question => (
              <ResponseSummary
                key={question.id}
                question={question}
                responses={
                  (responses || []).filter(
                    r => r.question_id === question.id
                  )
                }
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
