import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Target, CheckCircle } from "lucide-react";

export default function FeedbackSection({ data, onChange, readOnly }) {
  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Success Metrics */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#835879]" />
            <CardTitle className="text-lg font-semibold text-[#2d4650]">
              Success Metrics
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>How would you measure success for this event?</Label>
            <Textarea
              value={data.feedback_success_metrics || ""}
              onChange={(e) =>
                handleChange("feedback_success_metrics", e.target.value)
              }
              placeholder="What metrics or outcomes would indicate this event was successful? (e.g., attendance numbers, revenue targets, community engagement, sponsor satisfaction)"
              disabled={readOnly}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Feedback Collection Methods */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2">
          <ClipboardCheck className="w-6 h-6 text-[#835879]" />
          <h3 className="text-xl font-bold text-[#2d4650]">
            Feedback Collection
          </h3>
        </div>

        {/* Attendee Feedback */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Attendee Feedback
              </Label>
              <Textarea
                value={data.feedback_attendee_method || ""}
                onChange={(e) =>
                  handleChange("feedback_attendee_method", e.target.value)
                }
                placeholder="How will we collect feedback from event attendees? (e.g., post-event survey, on-site forms, social media)"
                disabled={readOnly}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="attendee-survey"
                checked={!!data.feedback_attendee_survey_required}
                onCheckedChange={(checked) =>
                  handleChange("feedback_attendee_survey_required", !!checked)
                }
                disabled={readOnly}
              />
              <Label
                htmlFor="attendee-survey"
                className="cursor-pointer text-sm"
              >
                Survey Required?
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Volunteer Feedback */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Volunteer Feedback
              </Label>
              <Textarea
                value={data.feedback_volunteer_method || ""}
                onChange={(e) =>
                  handleChange("feedback_volunteer_method", e.target.value)
                }
                placeholder="How will we collect feedback from volunteers? (e.g., post-event survey, debrief meeting, online form)"
                disabled={readOnly}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="volunteer-survey"
                checked={!!data.feedback_volunteer_survey_required}
                onCheckedChange={(checked) =>
                  handleChange("feedback_volunteer_survey_required", !!checked)
                }
                disabled={readOnly}
              />
              <Label
                htmlFor="volunteer-survey"
                className="cursor-pointer text-sm"
              >
                Survey Required?
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Feedback */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Vendor Feedback</Label>
              <Textarea
                value={data.feedback_vendor_method || ""}
                onChange={(e) =>
                  handleChange("feedback_vendor_method", e.target.value)
                }
                placeholder="How will we collect feedback from vendors? (e.g., email survey, follow-up calls, feedback forms)"
                disabled={readOnly}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="vendor-survey"
                checked={!!data.feedback_vendor_survey_required}
                onCheckedChange={(checked) =>
                  handleChange("feedback_vendor_survey_required", !!checked)
                }
                disabled={readOnly}
              />
              <Label htmlFor="vendor-survey" className="cursor-pointer text-sm">
                Survey Required?
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Sponsor Feedback */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Sponsor Feedback
              </Label>
              <Textarea
                value={data.feedback_sponsor_method || ""}
                onChange={(e) =>
                  handleChange("feedback_sponsor_method", e.target.value)
                }
                placeholder="How will we collect feedback from sponsors? (e.g., post-event survey, feedback meeting, email questionnaire)"
                disabled={readOnly}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sponsor-survey"
                checked={!!data.feedback_sponsor_survey_required}
                onCheckedChange={(checked) =>
                  handleChange("feedback_sponsor_survey_required", !!checked)
                }
                disabled={readOnly}
              />
              <Label htmlFor="sponsor-survey" className="cursor-pointer text-sm">
                Survey Required?
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Post-Event Evaluation (Only visible when status is 'finished') */}
      {data.status === "finished" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-bold text-[#2d4650]">
              Post-Event Evaluation
            </h3>
          </div>

          <Card className="border-green-200 shadow-sm bg-green-50/30">
            <CardContent className="pt-6 space-y-6">
              {/* Final Attendance */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Estimated Final Attendance
                </Label>
                <Input
                  type="number"
                  value={data.feedback_final_attendance ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    handleChange(
                      "feedback_final_attendance",
                      raw === "" ? "" : parseInt(raw, 10) || 0
                    );
                  }}
                  placeholder="How many people attended?"
                  disabled={readOnly}
                  className="bg-white"
                />
              </div>

              {/* What Went Well */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  What went well for this event?
                </Label>
                <Textarea
                  value={data.feedback_what_went_well || ""}
                  onChange={(e) =>
                    handleChange("feedback_what_went_well", e.target.value)
                  }
                  placeholder="Describe the successes, highlights, and positive outcomes..."
                  disabled={readOnly}
                  rows={4}
                  className="bg-white"
                />
              </div>

              {/* What Could Improve */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  What could have gone better for this event?
                </Label>
                <Textarea
                  value={data.feedback_what_could_improve || ""}
                  onChange={(e) =>
                    handleChange("feedback_what_could_improve", e.target.value)
                  }
                  placeholder="Describe challenges, areas for improvement, and lessons learned..."
                  disabled={readOnly}
                  rows={4}
                  className="bg-white"
                />
              </div>

              {/* Should Repeat */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Should this event be repeated? Why?
                </Label>
                <Textarea
                  value={data.feedback_should_repeat || ""}
                  onChange={(e) =>
                    handleChange("feedback_should_repeat", e.target.value)
                  }
                  placeholder="Provide your recommendation and reasoning..."
                  disabled={readOnly}
                  rows={3}
                  className="bg-white"
                />
              </div>

              {/* Success Metrics Evaluation */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  How well did we meet the measures for success described before
                  the event?
                </Label>

                {data.feedback_success_metrics && (
                  <div className="p-3 bg-slate-100 rounded-lg mb-2 border border-slate-200">
                    <p className="text-sm text-slate-600 font-medium mb-1">
                      Original Success Metrics:
                    </p>
                    <p className="text-sm text-slate-700 italic">
                      {data.feedback_success_metrics}
                    </p>
                  </div>
                )}

                <Textarea
                  value={data.feedback_success_evaluation || ""}
                  onChange={(e) =>
                    handleChange("feedback_success_evaluation", e.target.value)
                  }
                  placeholder="Evaluate how well the event met the success metrics outlined in the planning phase..."
                  disabled={readOnly}
                  rows={4}
                  className="bg-white"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
