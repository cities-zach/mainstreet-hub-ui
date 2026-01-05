import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Users,
  GraduationCap,
  Search,
  CheckCircle2,
  UserCheck,
  ClipboardCheck,
  Clock,
} from "lucide-react";

export default function VolunteersSection({ data, onChange, readOnly }) {
  const [attendanceDialog, setAttendanceDialog] = React.useState({
    open: false,
    index: null,
  });

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const addVolunteerOpportunity = () => {
    const newOpportunity = {
      task: "",
      date: data.start_date || "",
      schedule: "",
      location: data.location || "",
      hours: 1,
      count_needed: 1,
      training_required: false,
      special_skills: "",
      instructions: "",
      assignments: [],
    };
    handleChange("volunteer_opportunities", [
      ...(data.volunteer_opportunities || []),
      newOpportunity,
    ]);
  };

  const updateOpportunity = (index, field, value) => {
    const updated = [...(data.volunteer_opportunities || [])];
    updated[index] = { ...updated[index], [field]: value };
    handleChange("volunteer_opportunities", updated);
  };

  const removeOpportunity = (index) => {
    const updated = [...(data.volunteer_opportunities || [])];
    updated.splice(index, 1);
    handleChange("volunteer_opportunities", updated);
  };

  const updateAssignment = (oppIndex, assignIndex, field, value) => {
    const updated = [...(data.volunteer_opportunities || [])];
    updated[oppIndex].assignments[assignIndex] = {
      ...updated[oppIndex].assignments[assignIndex],
      [field]: value,
    };
    handleChange("volunteer_opportunities", updated);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Volunteer Needs */}
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#835879]" />
            <h3 className="text-xl font-bold text-[#2d4650]">
              Volunteer Needs
            </h3>
          </div>
          {!readOnly && (
            <Button
              onClick={addVolunteerOpportunity}
              className="gap-2 bg-[#835879] hover:bg-[#6d4964]"
            >
              <Plus className="w-4 h-4" />
              Add Volunteer Task
            </Button>
          )}
        </div>

        {!data.volunteer_opportunities?.length && (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
            No volunteer opportunities added yet.
          </div>
        )}

        <div className="grid gap-4">
          {data.volunteer_opportunities?.map((opp, index) => {
            const countFilled = opp.assignments?.length || 0;
            const isFilled = countFilled >= opp.count_needed;

            return (
              <Card key={index} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      value={opp.task}
                      onChange={(e) =>
                        updateOpportunity(index, "task", e.target.value)
                      }
                      placeholder="Task / Role"
                      disabled={readOnly}
                    />
                    <Input
                      value={opp.location}
                      onChange={(e) =>
                        updateOpportunity(index, "location", e.target.value)
                      }
                      placeholder="Location"
                      disabled={readOnly}
                    />

                    <Input
                      type="date"
                      value={opp.date}
                      onChange={(e) =>
                        updateOpportunity(index, "date", e.target.value)
                      }
                      disabled={readOnly}
                    />
                    <Input
                      value={opp.schedule}
                      onChange={(e) =>
                        updateOpportunity(index, "schedule", e.target.value)
                      }
                      placeholder="Schedule"
                      disabled={readOnly}
                    />

                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={opp.hours}
                      onChange={(e) =>
                        updateOpportunity(
                          index,
                          "hours",
                          parseFloat(e.target.value) || 1
                        )
                      }
                      disabled={readOnly}
                    />

                    <Input
                      type="number"
                      min="1"
                      value={opp.count_needed}
                      onChange={(e) =>
                        updateOpportunity(
                          index,
                          "count_needed",
                          parseInt(e.target.value) || 1
                        )
                      }
                      disabled={readOnly}
                    />

                    <Badge
                      variant="outline"
                      className={
                        isFilled
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }
                    >
                      {countFilled} / {opp.count_needed} Filled
                    </Badge>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={opp.training_required}
                        onCheckedChange={(checked) =>
                          updateOpportunity(
                            index,
                            "training_required",
                            checked
                          )
                        }
                        disabled={readOnly}
                      />
                      <Label>Training Required</Label>
                    </div>

                    <Input
                      value={opp.special_skills}
                      onChange={(e) =>
                        updateOpportunity(
                          index,
                          "special_skills",
                          e.target.value
                        )
                      }
                      placeholder="Special Skills / Considerations"
                      disabled={readOnly}
                    />

                    <Textarea
                      value={opp.instructions}
                      onChange={(e) =>
                        updateOpportunity(
                          index,
                          "instructions",
                          e.target.value
                        )
                      }
                      placeholder="Volunteer Instructions"
                      disabled={readOnly}
                      rows={3}
                    />
                  </div>

                  {/* Assignments */}
                  {opp.assignments?.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Assigned Volunteers
                        </Label>
                        {!readOnly && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setAttendanceDialog({ open: true, index })
                            }
                            className="h-7 text-xs gap-1"
                          >
                            <ClipboardCheck className="w-3 h-3" />
                            Mark Attendance
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {opp.assignments.map((a, i) => (
                          <Badge key={i} variant="secondary">
                            {a.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOpportunity(index)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Attendance Dialog */}
      <Dialog
        open={attendanceDialog.open}
        onOpenChange={() =>
          setAttendanceDialog({ open: false, index: null })
        }
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Mark Volunteer Attendance</DialogTitle>
          </DialogHeader>
          {attendanceDialog.index !== null &&
            data.volunteer_opportunities?.[
              attendanceDialog.index
            ]?.assignments?.map((a, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center">
                <span className="text-sm">{a.name}</span>
                <Select
                  value={a.attendance_status || "pending"}
                  onValueChange={(val) =>
                    updateAssignment(
                      attendanceDialog.index,
                      i,
                      "attendance_status",
                      val
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="attended">Attended</SelectItem>
                    <SelectItem value="did_not_attend">
                      Did Not Attend
                    </SelectItem>
                    <SelectItem value="partial">
                      Partial Attendance
                    </SelectItem>
                  </SelectContent>
                </Select>
                {a.attendance_status === "partial" && (
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={a.hours_completed || ""}
                    onChange={(e) =>
                      updateAssignment(
                        attendanceDialog.index,
                        i,
                        "hours_completed",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                )}
              </div>
            ))}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAttendanceDialog({ open: false, index: null })
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
