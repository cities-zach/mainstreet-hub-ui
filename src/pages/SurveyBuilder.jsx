import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Save,
  Send,
  Copy,
  Check,
  Link2
} from "lucide-react";
import { toast } from "sonner";
import QuestionEditor from "@/components/feedback/QuestionEditor";

export default function SurveyBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get("id");
  const queryClient = useQueryClient();

  const [surveyData, setSurveyData] = useState({
    title: "",
    description: "",
    survey_type: "custom",
    respondent_mode: "email_list",
    respondent_emails: [],
    status: "draft"
  });

  const [questions, setQuestions] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: existingSurvey, isLoading } = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: () => apiFetch(`/surveys/${surveyId}`),
    enabled: !!surveyId
  });

  const { data: existingQuestions = [] } = useQuery({
    queryKey: ["survey_questions", surveyId],
    queryFn: () => apiFetch(`/surveys/${surveyId}/questions`),
    enabled: !!surveyId
  });

  useEffect(() => {
    if (!existingSurvey) return;

    setSurveyData({
      title: existingSurvey.title || "",
      description: existingSurvey.description || "",
      survey_type: existingSurvey.survey_type || "custom",
      respondent_mode: existingSurvey.respondent_mode || "email_list",
      respondent_emails: existingSurvey.respondent_emails || [],
      status: existingSurvey.status || "draft"
    });
  }, [existingSurvey?.id]);

  useEffect(() => {
    if (!existingQuestions) return;

    const ordered = [...existingQuestions].sort(
      (a, b) => a.order_index - b.order_index
    );

    setQuestions(ordered);
  }, [surveyId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let survey;

      if (surveyId) {
        survey = await apiFetch(`/surveys/${surveyId}`, {
          method: "PATCH",
          body: JSON.stringify(surveyData)
        });
      } else {
        survey = await apiFetch("/surveys", {
          method: "POST",
          body: JSON.stringify(surveyData)
        });
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const payload = { ...q, order_index: i };

        if (q.id) {
          await apiFetch(`/survey-questions/${q.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          });
        } else {
          await apiFetch(`/surveys/${survey.id}/questions`, {
            method: "POST",
            body: JSON.stringify(payload)
          });
        }
      }

      return survey;
    },
    onSuccess: (survey) => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey_questions"] });
      toast.success("Survey saved successfully");

      if (!surveyId) {
        navigate(`/feedback/builder?id=${survey.id}`);
      }
    }
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const survey = await saveMutation.mutateAsync();

      await apiFetch(`/surveys/${survey.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "active",
          sent_date: new Date().toISOString()
        })
      });

      if (
        surveyData.respondent_mode === "email_list" &&
        surveyData.respondent_emails?.length
      ) {
        await apiFetch(`/surveys/${survey.id}/send`, {
          method: "POST",
          body: JSON.stringify({
            emails: surveyData.respondent_emails
          })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Survey sent successfully!");
      navigate("/feedback");
    }
  });

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        question_type: "scale",
        scale_min: 1,
        scale_max: 5,
        required: false
      }
    ]);
  };

  const updateQuestion = (index, updates) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addEmail = () => {
    if (emailInput && emailInput.includes("@")) {
      setSurveyData({
        ...surveyData,
        respondent_emails: [...surveyData.respondent_emails, emailInput]
      });
      setEmailInput("");
    }
  };

  const removeEmail = (email) => {
    setSurveyData({
      ...surveyData,
      respondent_emails: surveyData.respondent_emails.filter(e => e !== email)
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Loading survey...
      </div>
    );
  }

  const isActive =
    surveyData.status === "active" || surveyData.status === "closed";

  const surveyLink = surveyId
    ? `${window.location.origin}/feedback/public?id=${surveyId}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(surveyLink);
    setLinkCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/feedback")}>
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {surveyId ? "Edit Survey" : "New Survey"}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Build and manage survey questions
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isActive}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>

            {surveyData.status === "draft" && questions.length > 0 && (
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="text-white"
                style={{ backgroundColor: "#835879" }}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Survey
              </Button>
            )}
          </div>
        </div>

        {surveyData.status === "active" &&
          surveyData.respondent_mode === "public_link" &&
          surveyLink && (
            <Card className="bg-gradient-to-r from-[#835879]/10 to-[#979b80]/10 border-[#835879]/20 dark:border-[#835879]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#835879] flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Public Survey Link</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Share this link with respondents</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input value={surveyLink} readOnly className="bg-white/90 font-mono text-sm" />
                  <Button onClick={copyLink} className="bg-[#835879] hover:bg-[#6d4a64] text-white gap-2 min-w-[120px]">
                    {linkCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Survey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={surveyData.title}
                onChange={(e) =>
                  setSurveyData({ ...surveyData, title: e.target.value })
                }
                disabled={isActive}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={surveyData.description || ""}
                onChange={(e) =>
                  setSurveyData({ ...surveyData, description: e.target.value })
                }
                disabled={isActive}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Survey Type</Label>
                <Select
                  value={surveyData.survey_type}
                  onValueChange={(val) =>
                    setSurveyData({ ...surveyData, survey_type: val })
                  }
                  disabled={isActive}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendee">Attendee</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="sponsor">Sponsor</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Respondent Mode</Label>
                <Select
                  value={surveyData.respondent_mode}
                  onValueChange={(val) =>
                    setSurveyData({ ...surveyData, respondent_mode: val })
                  }
                  disabled={isActive}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public_link">Public Link</SelectItem>
                    <SelectItem value="email_list">Email List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {surveyData.respondent_mode === "email_list" && (
              <>
                <Label>Respondent Emails</Label>
                <div className="flex gap-2">
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEmail()}
                    disabled={isActive}
                  />
                  <Button onClick={addEmail} disabled={isActive}>
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {surveyData.respondent_emails.map((email, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      {email}
                      {!isActive && (
                        <button
                          onClick={() => removeEmail(email)}
                          className="text-red-500"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex justify-between flex-row items-center">
            <CardTitle>Questions</CardTitle>
            {!isActive && (
              <Button variant="outline" onClick={addQuestion}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-6">
                No questions added yet.
              </div>
            ) : (
              questions.map((q, idx) => (
                <QuestionEditor
                  key={idx}
                  question={q}
                  index={idx}
                  onChange={(updates) => updateQuestion(idx, updates)}
                  onRemove={() => removeQuestion(idx)}
                  disabled={isActive}
                />
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
