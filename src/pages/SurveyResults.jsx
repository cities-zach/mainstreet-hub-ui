import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Users, BarChart3 } from "lucide-react";
import ResponseSummary from "@/components/feedback/ResponseSummary";

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
  ];

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

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-sm">
            <Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="font-semibold">
              {uniqueSubmissions.length} Responses
            </span>
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
