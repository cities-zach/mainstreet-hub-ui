import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronsUpDown,
  FileAudio,
  Mic,
  NotebookPen,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

const fileToText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || "");
    reader.onerror = reject;
    reader.readAsText(file);
  });

export default function MeetingNotes() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [noteSummary, setNoteSummary] = useState("");
  const [decisions, setDecisions] = useState([]);
  const [taskSuggestions, setTaskSuggestions] = useState([]);
  const [meetingSearch, setMeetingSearch] = useState("");
  const [runTranscript, setRunTranscript] = useState(true);
  const [runSummary, setRunSummary] = useState(true);
  const [runError, setRunError] = useState("");
  const [openAssigneeIndex, setOpenAssigneeIndex] = useState(null);
  const [agendaText, setAgendaText] = useState("");
  const [agendaFileName, setAgendaFileName] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState("");

  const { data: meetings = [] } = useQuery({
    queryKey: ["ai-meetings", meetingSearch],
    queryFn: () =>
      apiFetch(
        `/ai/meetings${meetingSearch ? `?search=${encodeURIComponent(meetingSearch)}` : ""}`
      ),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/users"),
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

  const runMeeting = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Meeting title is required.");
      if (!audioFile) throw new Error("Please upload an audio file.");
      if (!runTranscript && !runSummary) {
        throw new Error("Select transcript, summary, or both.");
      }
      if (runSummary && !runTranscript) {
        throw new Error("Summary requires transcript.");
      }

      const created = await apiFetch("/ai/meetings", {
        method: "POST",
        body: JSON.stringify({ title }),
      });

      setSelectedMeetingId(created.id);

      if (runTranscript) {
        const audio_base64 = await fileToBase64(audioFile);
        const transcribed = await apiFetch(`/ai/meetings/${created.id}/transcribe`, {
          method: "POST",
          body: JSON.stringify({
            audio_base64,
            file_name: audioFile.name,
            mime_type: audioFile.type,
          }),
        });
        setTranscriptText(transcribed?.transcript || "");
      }

      if (runSummary) {
        const note = await apiFetch(`/ai/meetings/${created.id}/summarize`, {
          method: "POST",
          body: JSON.stringify({ agenda: agendaText }),
        });
        setNoteSummary(note.summary || "");
        setDecisions(note.decisions || []);
        setTaskSuggestions(
          (note.task_suggestions || []).map((task) => ({
            ...task,
            selected: true,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ["ai-meetings"] });
      setTitle("");
      setAudioFile(null);
      setAgendaText("");
      setAgendaFileName("");
      setRunError("");
      return created;
    },
    onError: (err) => {
      setRunError(err?.message || "Unable to run meeting.");
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

  const deleteMeeting = useMutation({
    mutationFn: async (meetingId) =>
      apiFetch(`/ai/meetings/${meetingId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-meetings"] });
      setSelectedMeetingId(null);
    },
  });

  useEffect(() => {
    const fetchNote = async () => {
      if (!selectedMeetingId) return;
      setShowTranscript(false);
      if (selectedMeeting?.summary_status !== "completed") {
        setNoteSummary("");
        setDecisions([]);
        setTaskSuggestions([]);
        setTranscriptText(selectedMeeting?.transcript || "");
        return;
      }
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
        setTranscriptText(selectedMeeting?.transcript || "");
      } catch {
        setNoteSummary("");
        setDecisions([]);
        setTaskSuggestions([]);
        setTranscriptText(selectedMeeting?.transcript || "");
      }
    };
    fetchNote();
  }, [selectedMeetingId, selectedMeeting?.summary_status]);

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
              <CardTitle>Run a meeting</CardTitle>
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
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <Label className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4" />
                  Upload audio
                </Label>
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Agenda (optional)</Label>
                <Textarea
                  value={agendaText}
                  onChange={(event) => setAgendaText(event.target.value)}
                  rows={4}
                  placeholder="Paste agenda items here..."
                />
                <Input
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await fileToText(file);
                      setAgendaText(text);
                      setAgendaFileName(file.name);
                    } catch {
                      setRunError("Unable to read agenda file.");
                    } finally {
                      event.target.value = "";
                    }
                  }}
                />
                {agendaFileName && (
                  <p className="text-xs text-slate-500">
                    Loaded agenda: {agendaFileName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Generate</Label>
                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={runTranscript}
                      onChange={(event) => setRunTranscript(event.target.checked)}
                    />
                    Transcript
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={runSummary}
                      onChange={(event) => setRunSummary(event.target.checked)}
                    />
                    Summary
                  </label>
                </div>
              </div>
              {runError && <p className="text-sm text-rose-500">{runError}</p>}
              <Button
                className="bg-[#835879] text-white"
                onClick={() => runMeeting.mutate()}
                disabled={runMeeting.isPending}
              >
                {runMeeting.isPending ? "Running..." : "Run Meeting"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80">
            <CardHeader className="space-y-3">
              <CardTitle>Meeting library</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search meetings..."
                  value={meetingSearch}
                  onChange={(event) => setMeetingSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.length === 0 && (
                <p className="text-sm text-slate-500">
                  No meetings yet. Create one to get started.
                </p>
              )}
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className={cn(
                    "w-full px-3 py-3 rounded-xl border transition-colors flex items-center justify-between gap-3",
                    meeting.id === selectedMeetingId
                      ? "border-[#835879] bg-[#835879]/10 text-[#835879]"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  )}
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => setSelectedMeetingId(meeting.id)}
                  >
                    <div className="font-semibold">{meeting.title || "Untitled"}</div>
                    <div className="text-xs text-slate-500">
                      {meeting.summary_status === "completed"
                        ? "Summary ready"
                        : "Summary pending"}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-rose-500"
                    onClick={() => {
                      if (window.confirm("Delete this meeting? This cannot be undone.")) {
                        deleteMeeting.mutate(meeting.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
            <div className="rounded-xl border border-slate-200 bg-white/60 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-3">
                <Label>Transcript</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTranscript((prev) => !prev)}
                  disabled={!transcriptText}
                >
                  {showTranscript ? "Minimize" : "View"}
                </Button>
              </div>
              {showTranscript && (
                <Textarea
                  value={transcriptText}
                  readOnly
                  rows={8}
                  className="mt-3"
                />
              )}
              {!transcriptText && (
                <p className="text-xs text-slate-500">
                  No transcript available yet.
                </p>
              )}
            </div>
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
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm"
                  >
                    <div className="flex items-start gap-3">
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
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Label className="text-xs text-slate-500">Assign to</Label>
                      <Popover
                        open={openAssigneeIndex === index}
                        onOpenChange={(open) =>
                          setOpenAssigneeIndex(open ? index : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openAssigneeIndex === index}
                            className="w-full justify-between truncate sm:w-64"
                          >
                            {task.assigned_to_id
                              ? (() => {
                                  const user = users.find(
                                    (u) => u.id === task.assigned_to_id
                                  );
                                  return user
                                    ? `${user.full_name || ""} (${user.email})`.trim()
                                    : "Select user...";
                                })()
                              : "Unassigned"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search user..." />
                            <CommandList>
                              <CommandEmpty>No user found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="unassigned"
                                  onSelect={() => {
                                    setTaskSuggestions((prev) =>
                                      prev.map((item, idx) =>
                                        idx === index
                                          ? { ...item, assigned_to_id: "" }
                                          : item
                                      )
                                    );
                                    setOpenAssigneeIndex(null);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      !task.assigned_to_id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  Unassigned
                                </CommandItem>
                                {users.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    value={`${user.full_name || ""} ${user.email}`.trim()}
                                    onSelect={() => {
                                      setTaskSuggestions((prev) =>
                                        prev.map((item, idx) =>
                                          idx === index
                                            ? { ...item, assigned_to_id: user.id }
                                            : item
                                        )
                                      );
                                      setOpenAssigneeIndex(null);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        task.assigned_to_id === user.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {`${user.full_name || ""} (${user.email})`.trim()}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Add a task</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={customTaskTitle}
                  onChange={(event) => setCustomTaskTitle(event.target.value)}
                  placeholder="Add a task that was missed..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const trimmed = customTaskTitle.trim();
                    if (!trimmed) return;
                    setTaskSuggestions((prev) => [
                      ...prev,
                      {
                        title: trimmed,
                        description: "",
                        due_date: null,
                        assigned_to_id: "",
                        selected: true,
                      },
                    ]);
                    setCustomTaskTitle("");
                  }}
                >
                  Add task
                </Button>
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
