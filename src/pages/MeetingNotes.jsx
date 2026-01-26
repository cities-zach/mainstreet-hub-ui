import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileAudio, Mic, NotebookPen, Sparkles } from "lucide-react";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || "";
      const base64 = result.toString().split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function MeetingNotes() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [noteSummary, setNoteSummary] = useState("");
  const [decisions, setDecisions] = useState([]);
  const [taskSuggestions, setTaskSuggestions] = useState([]);

  const { data: meetings = [] } = useQuery({
    queryKey: ["ai-meetings"],
    queryFn: () => apiFetch("/ai/meetings"),
  });

  const selectedMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedMeetingId),
    [meetings, selectedMeetingId]
  );

  useEffect(() => {
    if (!selectedMeetingId && meetings.length > 0) {
      setSelectedMeetingId(meetings[0].id);
    }
  }, [meetings, selectedMeetingId]);

  const createMeeting = useMutation({
    mutationFn: () =>
      apiFetch("/ai/meetings", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["ai-meetings"] });
      setTitle("");
      setSelectedMeetingId(created.id);
    },
  });

  const transcribeMeeting = useMutation({
    mutationFn: async () => {
      if (!selectedMeetingId || !audioFile) return null;
      const audio_base64 = await fileToBase64(audioFile);
      return apiFetch(`/ai/meetings/${selectedMeetingId}/transcribe`, {
        method: "POST",
        body: JSON.stringify({
          audio_base64,
          file_name: audioFile.name,
          mime_type: audioFile.type,
        }),
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["ai-meetings"] });
      if (selectedMeetingId) {
        await summarizeMeeting.mutateAsync();
      }
    },
  });

  const summarizeMeeting = useMutation({
    mutationFn: async () =>
      apiFetch(`/ai/meetings/${selectedMeetingId}/summarize`, {
        method: "POST",
      }),
    onSuccess: (note) => {
      setNoteSummary(note.summary || "");
      setDecisions(note.decisions || []);
      setTaskSuggestions(
        (note.task_suggestions || []).map((task) => ({
          ...task,
          selected: true,
        }))
      );
      queryClient.invalidateQueries({ queryKey: ["ai-meetings"] });
    },
  });

  const approveMeeting = useMutation({
    mutationFn: async () =>
      apiFetch(`/ai/meetings/${selectedMeetingId}/approve`, {
        method: "POST",
        body: JSON.stringify({
          task_creations: taskSuggestions
            .filter((task) => task.selected && task.title)
            .map((task) => ({
              title: task.title,
              description: task.description || "",
              due_date: task.due_date || null,
              assigned_to_id: task.assigned_to_id || null,
            })),
        }),
      }),
  });

  useEffect(() => {
    const fetchNote = async () => {
      if (!selectedMeetingId) return;
      try {
        const note = await apiFetch(`/ai/meetings/${selectedMeetingId}/notes`);
        setNoteSummary(note.summary || "");
        setDecisions(note.decisions || []);
        setTaskSuggestions(
          (note.task_suggestions || []).map((task) => ({
            ...task,
            selected: true,
          }))
        );
      } catch {
        setNoteSummary("");
        setDecisions([]);
        setTaskSuggestions([]);
      }
    };
    fetchNote();
  }, [selectedMeetingId]);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2d4650] dark:text-slate-100 flex items-center gap-3">
            <Mic className="w-9 h-9" />
            NoteTaker
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Upload a meeting recording, review the transcript, and approve notes
            before creating tasks.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          <Card className="bg-white/80 dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle>Create a meeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Meeting title</Label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Downtown Steering Committee"
                />
              </div>
              <Button
                className="bg-[#835879] text-white"
                onClick={() => createMeeting.mutate()}
                disabled={createMeeting.isPending || !title.trim()}
              >
                Create Meeting
              </Button>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <Label className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4" />
                  Upload audio
                </Label>
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => transcribeMeeting.mutate()}
                    disabled={!selectedMeetingId || !audioFile}
                  >
                    Transcribe
                  </Button>
                  <Button
                    className="bg-[#2d4650] text-white"
                    onClick={() => summarizeMeeting.mutate()}
                    disabled={!selectedMeetingId || !selectedMeeting?.transcript}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Summarize
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Transcript status:{" "}
                  <span className="font-semibold">
                    {selectedMeeting?.transcript_status || "pending"}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle>Meeting library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.length === 0 && (
                <p className="text-sm text-slate-500">
                  No meetings yet. Create one to get started.
                </p>
              )}
              {meetings.map((meeting) => (
                <button
                  key={meeting.id}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-xl border transition-colors",
                    meeting.id === selectedMeetingId
                      ? "border-[#835879] bg-[#835879]/10 text-[#835879]"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  )}
                  onClick={() => setSelectedMeetingId(meeting.id)}
                >
                  <div className="font-semibold">{meeting.title || "Untitled"}</div>
                  <div className="text-xs text-slate-500">
                    {meeting.summary_status === "completed"
                      ? "Summary ready"
                      : "Summary pending"}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="w-5 h-5" />
              Review notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Summary</Label>
              <Textarea
                value={noteSummary}
                onChange={(event) => setNoteSummary(event.target.value)}
                rows={5}
              />
            </div>

            <div>
              <Label>Decisions</Label>
              <div className="space-y-2">
                {decisions.length === 0 && (
                  <p className="text-sm text-slate-500">No decisions yet.</p>
                )}
                {decisions.map((decision, index) => (
                  <div
                    key={`${decision}-${index}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                  >
                    {decision}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Task suggestions</Label>
              <div className="space-y-2">
                {taskSuggestions.length === 0 && (
                  <p className="text-sm text-slate-500">No tasks suggested.</p>
                )}
                {taskSuggestions.map((task, index) => (
                  <label
                    key={`${task.title}-${index}`}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={task.selected}
                      onChange={(event) => {
                        setTaskSuggestions((prev) =>
                          prev.map((item, idx) =>
                            idx === index
                              ? { ...item, selected: event.target.checked }
                              : item
                          )
                        );
                      }}
                    />
                    <div>
                      <div className="font-semibold">{task.title || "Untitled"}</div>
                      {task.description && (
                        <div className="text-slate-500">{task.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button
              className="bg-[#835879] text-white"
              onClick={() => approveMeeting.mutate()}
              disabled={
                !selectedMeetingId || selectedMeeting?.summary_status !== "completed"
              }
            >
              Approve Notes & Create Tasks
            </Button>
            {selectedMeeting?.summary_status !== "completed" && (
              <p className="text-xs text-slate-500">
                Summarize the meeting before approving notes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
