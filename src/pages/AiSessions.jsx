import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, RefreshCw, RotateCcw, Save, Search } from "lucide-react";

const fetchMe = async () => {
  const res = await apiFetch("/me");
  return res.user;
};

const fetchSessions = async (search) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  return apiFetch(`/ai/sessions${params.toString() ? `?${params}` : ""}`);
};

const fetchSession = async (id) => {
  if (!id) return null;
  return apiFetch(`/ai/sessions/${id}`);
};

const updateSession = async ({ id, data }) => {
  return apiFetch(`/ai/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

const resummarizeSession = async (id) => {
  return apiFetch(`/ai/sessions/${id}/resummarize`, { method: "POST" });
};

const resetSession = async (id) => {
  return apiFetch(`/ai/sessions/${id}/reset`, { method: "POST" });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

export default function AiSessions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [formState, setFormState] = useState({
    current_focus: "",
    conversation_summary: "",
    recent_topics: "",
    desired_tone: "friendly, professional, collaborative",
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["ai-sessions", search],
    queryFn: () => fetchSessions(search),
  });

  const { data: sessionDetail } = useQuery({
    queryKey: ["ai-session", selectedId],
    queryFn: () => fetchSession(selectedId),
    enabled: Boolean(selectedId),
  });

  const updateMutation = useMutation({
    mutationFn: updateSession,
    onSuccess: (data) => {
      toast.success("Session memory updated");
      queryClient.invalidateQueries({ queryKey: ["ai-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["ai-session", selectedId] });
      if (data?.session_memory) {
        setFormState((prev) => ({
          ...prev,
          current_focus: data.session_memory.current_focus || "",
          conversation_summary: data.session_memory.conversation_summary || "",
          recent_topics: (data.session_memory.recent_topics || []).join(", "),
          desired_tone:
            data.session_memory.desired_tone ||
            "friendly, professional, collaborative",
        }));
      }
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update session memory");
    },
  });

  const resummarizeMutation = useMutation({
    mutationFn: resummarizeSession,
    onSuccess: (data) => {
      toast.success("Session resummarized");
      queryClient.invalidateQueries({ queryKey: ["ai-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["ai-session", selectedId] });
      if (data?.session_memory) {
        setFormState((prev) => ({
          ...prev,
          current_focus: data.session_memory.current_focus || "",
          conversation_summary: data.session_memory.conversation_summary || "",
          recent_topics: (data.session_memory.recent_topics || []).join(", "),
          desired_tone:
            data.session_memory.desired_tone ||
            "friendly, professional, collaborative",
        }));
      }
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to resummarize session");
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetSession,
    onSuccess: (data) => {
      toast.success("Session memory reset");
      queryClient.invalidateQueries({ queryKey: ["ai-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["ai-session", selectedId] });
      if (data?.session_memory) {
        setFormState((prev) => ({
          ...prev,
          current_focus: data.session_memory.current_focus || "",
          conversation_summary: data.session_memory.conversation_summary || "",
          recent_topics: (data.session_memory.recent_topics || []).join(", "),
          desired_tone:
            data.session_memory.desired_tone ||
            "friendly, professional, collaborative",
        }));
      }
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to reset session memory");
    },
  });

  const selectedSession = useMemo(() => {
    if (sessionDetail) return sessionDetail;
    return sessions.find((session) => session.id === selectedId) || null;
  }, [sessionDetail, sessions, selectedId]);

  useEffect(() => {
    if (!selectedId && sessions.length > 0) {
      setSelectedId(sessions[0].id);
    }
  }, [sessions, selectedId]);

  useEffect(() => {
    if (!selectedSession?.session_memory) return;
    const memory = selectedSession.session_memory;
    setFormState({
      current_focus: memory.current_focus || "",
      conversation_summary: memory.conversation_summary || "",
      recent_topics: (memory.recent_topics || []).join(", "),
      desired_tone: memory.desired_tone || "friendly, professional, collaborative",
    });
  }, [selectedSession?.session_memory]);

  if (isLoading) return <div className="p-8">Loading sessions…</div>;

  if (currentUser?.role !== "super_admin" && currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800">
            Access Denied
          </h1>
          <p className="text-slate-600 mt-2">
            Only Admins can access this page.
          </p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!selectedId) return;
    const topics = formState.recent_topics
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean);
    updateMutation.mutate({
      id: selectedId,
      data: {
        current_focus: formState.current_focus,
        conversation_summary: formState.conversation_summary,
        recent_topics: topics,
        desired_tone: formState.desired_tone,
      },
    });
  };

  const handleResummarize = () => {
    if (!selectedId) return;
    resummarizeMutation.mutate(selectedId);
  };

  const handleReset = () => {
    if (!selectedId) return;
    if (
      !window.confirm(
        "Reset session memory? This clears the summary, focus, and topics."
      )
    ) {
      return;
    }
    resetMutation.mutate(selectedId);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2d4650]">
              AI Session Memory
            </h1>
            <p className="text-slate-500">
              Review and adjust FRED&apos;s working memory for active sessions.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by user name or email…"
              className="pl-9 bg-white/80 border-slate-200"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length === 0 && (
                <p className="text-sm text-slate-500">
                  No sessions yet for this organization.
                </p>
              )}
              {sessions.map((session) => {
                const memory = session.session_memory || {};
                const isActive = session.id === selectedId;
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedId(session.id)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      isActive
                        ? "border-[#835879] bg-[#f6f1f4]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="font-medium text-slate-900">
                      {session.user?.full_name ||
                        session.user?.email ||
                        "Unknown user"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {session.user?.email || "No email"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Focus:{" "}
                      <span className="text-slate-700">
                        {memory.current_focus || "—"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Started: {formatDateTime(session.created_at)}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-white/90 border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!selectedSession && (
                <p className="text-sm text-slate-500">
                  Select a session to view details.
                </p>
              )}

              {selectedSession && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <Badge className="bg-[#835879] text-white">
                      {selectedSession.user?.role || "user"}
                    </Badge>
                    <span>
                      {selectedSession.user?.full_name ||
                        selectedSession.user?.email ||
                        "Unknown user"}
                    </span>
                    <span className="text-slate-400">
                      · Started {formatDateTime(selectedSession.created_at)}
                    </span>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Current focus</Label>
                      <Input
                        value={formState.current_focus}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            current_focus: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Conversation summary</Label>
                      <Textarea
                        rows={5}
                        value={formState.conversation_summary}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            conversation_summary: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Recent topics (comma-separated)</Label>
                      <Input
                        value={formState.recent_topics}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            recent_topics: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Desired tone</Label>
                      <Select
                        value={formState.desired_tone}
                        onValueChange={(value) =>
                          setFormState((prev) => ({
                            ...prev,
                            desired_tone: value,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly, professional, collaborative">
                            Friendly, professional, collaborative
                          </SelectItem>
                          <SelectItem value="calm, structured, professional">
                            Calm, structured, professional
                          </SelectItem>
                          <SelectItem value="concise, direct, professional">
                            Concise, direct, professional
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="bg-[#835879] text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleResummarize}
                      disabled={resummarizeMutation.isPending}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-summarize
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={resetMutation.isPending}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Memory
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
