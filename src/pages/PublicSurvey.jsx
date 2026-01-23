import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadPublicFile } from "@/lib/uploads";

function normalizeQuestionType(t) {
  const normalized = (t ?? "").toString().trim().toLowerCase();
  if (normalized === "text") return "short_text";
  return normalized;
}

function normalizeOptions(raw) {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (typeof o === "string") return { label: o, value: o };
      if (o && typeof o === "object") {
        const label = (o.label ?? o.value ?? "").toString();
        const value = (o.value ?? o.label ?? label).toString();
        if (!label) return null;
        return { label, value };
      }
      return null;
    })
    .filter(Boolean);
}

export default function PublicSurvey() {
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get("id");

  const [responses, setResponses] = useState({});
  const [respondentInfo, setRespondentInfo] = useState({ name: "", email: "" });
  const [uploadingById, setUploadingById] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public_survey", surveyId],
    queryFn: () => apiFetch(`/public/surveys/${surveyId}`),
    enabled: !!surveyId
  });

  const survey = data?.survey;
  const questions = data?.questions ?? [];

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Build payload for API: one submission request
      const payload = {
        respondent: {
          name: respondentInfo.name?.trim() || null,
          email: respondentInfo.email?.trim() || null
        },
        responses: questions.map((q) => ({
          question_id: q.id,
          value: responses[q.id] ?? null
        }))
      };

      return apiFetch(`/public/surveys/${surveyId}/submit`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
    }
  });

  const handleFileUpload = async (question, fileList) => {
    const maxFiles = Number(question.max_files) || 1;
    const files = Array.from(fileList || []).slice(0, maxFiles);
    if (!files.length) return;

    setUploadingById((prev) => ({ ...prev, [question.id]: true }));

    try {
      const uploaded = await Promise.all(
        files.map((file) =>
          uploadPublicFile({
            pathPrefix: `surveys/${surveyId}/${question.id}`,
            file,
          })
        )
      );

      setResponses((prev) => ({
        ...prev,
        [question.id]: maxFiles === 1 ? uploaded[0] : uploaded,
      }));
    } catch (error) {
      toast.error(error?.message || "Failed to upload file");
    } finally {
      setUploadingById((prev) => ({ ...prev, [question.id]: false }));
    }
  };

  const removeUploadedFile = (questionId, index) => {
    setResponses((prev) => {
      const current = prev[questionId];
      if (Array.isArray(current)) {
        const next = current.filter((_, i) => i !== index);
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: null };
    });
  };

  const missingRequired = useMemo(() => {
    return questions.filter((q) => q.required && (responses[q.id] == null || responses[q.id] === "" || (Array.isArray(responses[q.id]) && responses[q.id].length === 0)));
  }, [questions, responses]);

  const handleSubmit = () => {
    if (missingRequired.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }
    submitMutation.mutate();
  };

  if (!surveyId) {
    return <div className="p-8 text-center">Missing survey id.</div>;
  }

  if (isLoading || !data) {
    return <div className="p-8 text-center">Loading survey...</div>;
  }

  // API already enforces active + public_link. But keep user-friendly messages.
  if (!survey) {
    return (
      <div className="p-8 text-center">
        Survey not found.
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="max-w-md">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Thank You!
            </h2>
            <p className="text-slate-600">
              Your feedback has been submitted successfully.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto space-y-6">

        <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            {survey.description && (
              <p className="text-slate-600 mt-2">{survey.description}</p>
            )}
          </CardHeader>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Your Name (Optional)</Label>
                <Input
                  value={respondentInfo.name}
                  onChange={(e) =>
                    setRespondentInfo({ ...respondentInfo, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Your Email (Optional)</Label>
                <Input
                  value={respondentInfo.email}
                  onChange={(e) =>
                    setRespondentInfo({ ...respondentInfo, email: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {questions.map((q, idx) => {
  const qType = normalizeQuestionType(q.question_type);
  const opts = normalizeOptions(q.options);

  // Treat yes_no as multiple_choice with default options if none exist
  const effectiveType = qType === "yes_no" ? "multiple_choice" : qType;
  const effectiveOptions =
    qType === "yes_no" && opts.length === 0
      ? [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]
      : opts;
  const maxFiles = Number(q.max_files) || 1;
  const accept = q.accept || undefined;
  const currentUploads = responses[q.id];
  const isUploading = uploadingById[q.id];

  return (
    <Card key={q.id} className="bg-white/80 backdrop-blur-sm border-slate-200">
      <CardContent className="pt-6 space-y-4">
        <Label className="text-base">
          {idx + 1}. {q.question_text}
          {q.required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {effectiveType === "scale" && (
          <div className="space-y-3">
            {(q.scale_min_label || q.scale_max_label) && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>{q.scale_min_label ?? ""}</span>
                <span>{q.scale_max_label ?? ""}</span>
              </div>
            )}

            <div className="flex gap-2 justify-center flex-wrap">
              {Array.from(
                {
                  length: (q.scale_max ?? 5) - (q.scale_min ?? 1) + 1
                },
                (_, i) => {
                  const value = (q.scale_min ?? 1) + i;
                  const selected = String(responses[q.id] ?? "") === String(value);

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onPointerDown={() => {
                        setResponses((prev) => ({ ...prev, [q.id]: String(value) }));
                      }}
                      onClick={() => {
                        setResponses((prev) => ({ ...prev, [q.id]: String(value) }));
                      }}
                      style={
                        selected
                          ? {
                              backgroundColor: "#835879",
                              color: "#ffffff",
                              borderColor: "#835879"
                            }
                          : undefined
                      }
                      className={`w-12 h-12 rounded-full border-2 ${
                        selected
                          ? "bg-[#835879] text-white border-[#835879]"
                          : "border-slate-300 hover:border-[#835879]"
                      }`}
                    >
                      {value}
                    </button>
                  );
                }
              )}
            </div>
            {responses[q.id] != null && responses[q.id] !== "" && (
              <div className="text-center text-sm text-slate-600">
                Selected: <span className="font-semibold">{responses[q.id]}</span>
              </div>
            )}
          </div>
        )}

        {effectiveType === "multiple_choice" && (
          <>
            {effectiveOptions.length === 0 ? (
              <p className="text-sm text-slate-500">No options configured.</p>
            ) : (
              <RadioGroup
                value={(responses[q.id] ?? "").toString()}
                onValueChange={(val) =>
                  setResponses((prev) => ({ ...prev, [q.id]: val }))
                }
              >
                {effectiveOptions.map((o) => (
                  <div key={o.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={o.value} id={`${q.id}-${o.value}`} />
                    <Label htmlFor={`${q.id}-${o.value}`}>{o.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </>
        )}

        {effectiveType === "dropdown" && (
          <>
            {effectiveOptions.length === 0 ? (
              <p className="text-sm text-slate-500">No options configured.</p>
            ) : (
              <Select
                value={(responses[q.id] ?? "").toString()}
                onValueChange={(val) =>
                  setResponses((prev) => ({ ...prev, [q.id]: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {effectiveOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}

        {effectiveType === "checkbox" && (
          <>
            {effectiveOptions.length === 0 ? (
              <p className="text-sm text-slate-500">No options configured.</p>
            ) : (
              effectiveOptions.map((o) => {
                const selected = Array.isArray(responses[q.id]) ? responses[q.id] : [];
                const checked = selected.includes(o.value);

                return (
                  <div key={o.value} className="flex items-center space-x-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(isChecked) => {
                        const next = isChecked
                          ? [...selected, o.value]
                          : selected.filter((v) => v !== o.value);
                        setResponses((prev) => ({ ...prev, [q.id]: next }));
                      }}
                    />
                    <Label>{o.label}</Label>
                  </div>
                );
              })
            )}
          </>
        )}

        {(effectiveType === "short_text" || effectiveType === "email") && (
          <Input
            value={responses[q.id] ?? ""}
            onChange={(e) =>
              setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
            }
          />
        )}

        {effectiveType === "number" && (
          <Input
            type="number"
            value={responses[q.id] ?? ""}
            onChange={(e) =>
              setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
            }
          />
        )}

        {effectiveType === "date" && (
          <Input
            type="date"
            value={responses[q.id] ?? ""}
            onChange={(e) =>
              setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
            }
          />
        )}

        {effectiveType === "long_text" && (
          <Textarea
            value={responses[q.id] ?? ""}
            onChange={(e) =>
              setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
            }
            rows={4}
          />
        )}

        {effectiveType === "file_upload" && (
          <div className="space-y-2">
            <Input
              type="file"
              accept={accept}
              multiple={maxFiles > 1}
              disabled={isUploading}
              onChange={(e) => {
                handleFileUpload(q, e.target.files);
                e.target.value = "";
              }}
            />
            {isUploading && (
              <p className="text-xs text-slate-500">Uploading...</p>
            )}
            {currentUploads && (
              <div className="space-y-1 text-sm">
                {(Array.isArray(currentUploads) ? currentUploads : [currentUploads]).map(
                  (file, fileIndex) => (
                    <div
                      key={`${q.id}-${fileIndex}`}
                      className="flex items-center justify-between rounded border border-slate-200 px-2 py-1"
                    >
                      <span className="truncate">
                        {file?.file_name || "Uploaded file"}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-slate-700"
                        onClick={() => removeUploadedFile(q.id, fileIndex)}
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {![
          "scale",
          "multiple_choice",
          "checkbox",
          "dropdown",
          "short_text",
          "long_text",
          "email",
          "number",
          "date",
          "file_upload",
        ].includes(effectiveType) && (
          <p className="text-sm text-slate-500">
            Unsupported question type: <code>{q.question_type}</code>
          </p>
        )}
      </CardContent>
    </Card>
  );
})}

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="text-white px-12"
            style={{ backgroundColor: "#835879" }}
          >
            Submit Survey
          </Button>
        </div>

      </div>
    </div>
  );
}
