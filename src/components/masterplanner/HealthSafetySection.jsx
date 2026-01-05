import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Thermometer } from "lucide-react";

export default function HealthSafetySection({ data, onChange, readOnly }) {
  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const parseNumber = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const n = Number(val);
    return Number.isFinite(n) ? n : "";
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* General Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#835879]" />
              <CardTitle className="text-lg font-semibold text-[#2d4650]">
                Attendance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_attendance">Estimated Attendance</Label>
              <Input
                id="estimated_attendance"
                type="number"
                value={data.estimated_attendance ?? ""}
                onChange={(e) =>
                  handleChange(
                    "estimated_attendance",
                    parseNumber(e.target.value)
                  )
                }
                placeholder="e.g. 500"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highest_possible_attendance">
                Highest Possible Attendance
              </Label>
              <Input
                id="highest_possible_attendance"
                type="number"
                value={data.highest_possible_attendance ?? ""}
                onChange={(e) =>
                  handleChange(
                    "highest_possible_attendance",
                    parseNumber(e.target.value)
                  )
                }
                placeholder="e.g. 1000"
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-[#835879]" />
              <CardTitle className="text-lg font-semibold text-[#2d4650]">
                Environment
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anticipated_weather">
                Anticipated Weather
              </Label>
              <Textarea
                id="anticipated_weather"
                value={data.anticipated_weather || ""}
                onChange={(e) =>
                  handleChange("anticipated_weather", e.target.value)
                }
                placeholder="What is the typical weather for this time of year? What if it rains?"
                disabled={readOnly}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conditional Planning */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-[#2d4650] border-b border-slate-200 pb-2">
          Special Considerations
        </h3>

        {/* Crowd Control */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="crowd_control_required"
              checked={!!data.crowd_control_required}
              onCheckedChange={(checked) =>
                handleChange("crowd_control_required", checked)
              }
              disabled={readOnly}
            />
            <Label
              htmlFor="crowd_control_required"
              className="font-medium cursor-pointer"
            >
              Is fencing, ticketing, or other crowd control required?
            </Label>
          </div>
          {data.crowd_control_required && (
            <div className="ml-6 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label
                htmlFor="crowd_control_plan"
                className="text-sm text-slate-600 mb-1 block"
              >
                Crowd Control Plan
              </Label>
              <Textarea
                id="crowd_control_plan"
                value={data.crowd_control_plan || ""}
                onChange={(e) =>
                  handleChange("crowd_control_plan", e.target.value)
                }
                placeholder="Describe crowd control measures..."
                disabled={readOnly}
              />
            </div>
          )}
        </div>

        {/* Alcohol */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="alcohol_service"
              checked={!!data.alcohol_service}
              onCheckedChange={(checked) =>
                handleChange("alcohol_service", checked)
              }
              disabled={readOnly}
            />
            <Label htmlFor="alcohol_service" className="font-medium cursor-pointer">
              Will alcohol be served?
            </Label>
          </div>
          {data.alcohol_service && (
            <div className="ml-6 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label
                htmlFor="alcohol_plan"
                className="text-sm text-slate-600 mb-1 block"
              >
                Alcohol Plan (ID checks, permits, server training)
              </Label>
              <Textarea
                id="alcohol_plan"
                value={data.alcohol_plan || ""}
                onChange={(e) =>
                  handleChange("alcohol_plan", e.target.value)
                }
                placeholder="Describe alcohol management plan..."
                disabled={readOnly}
              />
            </div>
          )}
        </div>

        {/* Special Planning Questions */}
        <div className="grid gap-4">
          <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="special_planning_date_time"
                checked={!!data.special_planning_date_time}
                onCheckedChange={(checked) =>
                  handleChange("special_planning_date_time", checked)
                }
                disabled={readOnly}
              />
              <Label htmlFor="special_planning_date_time" className="cursor-pointer">
                Does the date or time of day require special planning?
              </Label>
            </div>
            {data.special_planning_date_time && (
              <Textarea
                value={data.special_planning_date_time_explanation || ""}
                onChange={(e) =>
                  handleChange(
                    "special_planning_date_time_explanation",
                    e.target.value
                  )
                }
                placeholder="Please explain..."
                disabled={readOnly}
                className="ml-6 w-[calc(100%-1.5rem)]"
              />
            )}
          </div>

          <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="special_planning_location"
                checked={!!data.special_planning_location}
                onCheckedChange={(checked) =>
                  handleChange("special_planning_location", checked)
                }
                disabled={readOnly}
              />
              <Label htmlFor="special_planning_location" className="cursor-pointer">
                Does the location require special planning?
              </Label>
            </div>
            {data.special_planning_location && (
              <Textarea
                value={data.special_planning_location_explanation || ""}
                onChange={(e) =>
                  handleChange(
                    "special_planning_location_explanation",
                    e.target.value
                  )
                }
                placeholder="Please explain..."
                disabled={readOnly}
                className="ml-6 w-[calc(100%-1.5rem)]"
              />
            )}
          </div>

          <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="special_planning_audience"
                checked={!!data.special_planning_audience}
                onCheckedChange={(checked) =>
                  handleChange("special_planning_audience", checked)
                }
                disabled={readOnly}
              />
              <Label htmlFor="special_planning_audience" className="cursor-pointer">
                Does the audience profile require special planning?
              </Label>
            </div>
            {data.special_planning_audience && (
              <Textarea
                value={data.special_planning_audience_explanation || ""}
                onChange={(e) =>
                  handleChange(
                    "special_planning_audience_explanation",
                    e.target.value
                  )
                }
                placeholder="Please explain..."
                disabled={readOnly}
                className="ml-6 w-[calc(100%-1.5rem)]"
              />
            )}
          </div>
        </div>
      </div>

      {/* Emergency Procedures */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-[#2d4650] border-b border-slate-200 pb-2">
          Emergency Procedures
        </h3>

        <div className="space-y-2">
          <Label htmlFor="emergency_person_responsible">
            Person responsible for canceling/rescheduling due to emergency
          </Label>
          <Input
            id="emergency_person_responsible"
            value={data.emergency_person_responsible || ""}
            onChange={(e) =>
              handleChange("emergency_person_responsible", e.target.value)
            }
            placeholder="Name and Role"
            disabled={readOnly}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Weather Emergency Plan</Label>
            <Textarea
              value={data.emergency_procedures_weather || ""}
              onChange={(e) =>
                handleChange("emergency_procedures_weather", e.target.value)
              }
              placeholder="Procedures for severe weather..."
              disabled={readOnly}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Fire Emergency Plan</Label>
            <Textarea
              value={data.emergency_procedures_fire || ""}
              onChange={(e) =>
                handleChange("emergency_procedures_fire", e.target.value)
              }
              placeholder="Procedures for fire..."
              disabled={readOnly}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Site Evacuation Plan</Label>
            <Textarea
              value={data.emergency_procedures_evacuation || ""}
              onChange={(e) =>
                handleChange(
                  "emergency_procedures_evacuation",
                  e.target.value
                )
              }
              placeholder="Evacuation routes and procedures..."
              disabled={readOnly}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Shelter in Place Plan</Label>
            <Textarea
              value={data.emergency_procedures_shelter || ""}
              onChange={(e) =>
                handleChange("emergency_procedures_shelter", e.target.value)
              }
              placeholder="Shelter locations and procedures..."
              disabled={readOnly}
              rows={4}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Active Shooter / Security Crisis Plan</Label>
            <Textarea
              value={data.emergency_procedures_security || ""}
              onChange={(e) =>
                handleChange(
                  "emergency_procedures_security",
                  e.target.value
                )
              }
              placeholder="Security protocols and crisis response..."
              disabled={readOnly}
              rows={4}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Medical & Communications */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-[#2d4650] border-b border-slate-200 pb-2">
          Medical & Communications
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>First Aid and Medical Plan</Label>
            <Textarea
              value={data.first_aid_medical_plan || ""}
              onChange={(e) =>
                handleChange("first_aid_medical_plan", e.target.value)
              }
              placeholder="First aid stations, medical personnel, supplies..."
              disabled={readOnly}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Lost Child Plan</Label>
            <Textarea
              value={data.lost_child_plan || ""}
              onChange={(e) =>
                handleChange("lost_child_plan", e.target.value)
              }
              placeholder="Reunification point, protocols..."
              disabled={readOnly}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Emergency Communication with Audience</Label>
            <Textarea
              value={data.emergency_communication_plan || ""}
              onChange={(e) =>
                handleChange("emergency_communication_plan", e.target.value)
              }
              placeholder="PA system, social media, bullhorns, etc..."
              disabled={readOnly}
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
