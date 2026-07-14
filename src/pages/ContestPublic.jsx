import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { getPublicContest, submitContestEntry } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function isChoiceField(type) {
  return ["multiple_choice", "dropdown"].includes(type);
}

function ContestField({ field, value, onChange }) {
  const options = Array.isArray(field.options) ? field.options : [];

  if (field.field_type === "long_text") {
    return (
      <Textarea
        rows={4}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        required={field.is_required}
      />
    );
  }

  if (field.field_type === "yes_no") {
    return (
      <Select value={value === undefined ? "" : String(value)} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an answer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (isChoiceField(field.field_type)) {
    return (
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.field_type === "checkbox") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([...selected, option]);
                } else {
                  onChange(selected.filter((item) => item !== option));
                }
              }}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  return (
    <Input
      type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : field.field_type === "email" ? "email" : "text"}
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      required={field.is_required}
    />
  );
}

export default function ContestPublic() {
  const { slug } = useParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-contest", slug],
    queryFn: () => getPublicContest(slug),
    enabled: Boolean(slug),
    retry: false
  });

  const fields = useMemo(() => data?.fields || [], [data]);
  const contest = data?.contest;

  const submitMutation = useMutation({
    mutationFn: () => submitContestEntry(slug, { name, email, responses }),
    onSuccess: () => {
      setSubmitted(true);
      setFormError("");
    },
    onError: (submitError) => {
      setFormError(submitError.message || "Unable to submit your entry");
    }
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    submitMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              Loading contest...
            </CardContent>
          </Card>
        ) : error || !contest ? (
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">Contest unavailable</h1>
              <p className="mt-2 text-slate-500">
                This contest may be closed or the link may be incorrect.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden bg-white/90 shadow-xl">
            {contest.image_url && (
              <img
                src={contest.image_url}
                alt={contest.name}
                className="h-64 w-full object-cover"
              />
            )}
            <CardContent className="p-6 md:p-8 space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{contest.name}</h1>
                <p className="mt-3 whitespace-pre-wrap text-slate-600">
                  {contest.description}
                </p>
              </div>

              {submitted ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                  <h2 className="mt-3 text-xl font-semibold text-green-900">
                    You are entered
                  </h2>
                  <p className="mt-2 text-green-700">
                    Thanks for registering for {contest.name}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label>
                        {field.label}
                        {field.is_required ? " *" : ""}
                      </Label>
                      <ContestField
                        field={field}
                        value={responses[field.id]}
                        onChange={(value) =>
                          setResponses((current) => ({ ...current, [field.id]: value }))
                        }
                      />
                    </div>
                  ))}

                  {formError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {formError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="w-full bg-[#835879] hover:bg-[#6f4866]"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit Entry"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
