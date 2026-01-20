import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Plus,
  ClipboardList,
  BarChart3,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

export default function Feedback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [surveyToDelete, setSurveyToDelete] = useState(null);

  useEffect(() => {
    apiFetch("/me")
      .then(data => setUser(data?.user || null))
      .catch(() => {});
  }, []);

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ["surveys"],
    queryFn: () => apiFetch("/surveys")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/surveys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Survey deleted successfully");
      setSurveyToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete survey");
    }
  });

  const isAdmin =
    user?.app_role === "admin" ||
    user?.app_role === "super_admin" ||
    user?.role === "admin";

  const statusColors = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    active: "bg-green-100 text-green-800 border-green-200",
    closed: "bg-red-100 text-red-700 border-red-200"
  };

  const typeColors = {
    attendee: "bg-blue-100 text-blue-800",
    volunteer: "bg-purple-100 text-purple-800",
    vendor: "bg-amber-100 text-amber-800",
    sponsor: "bg-pink-100 text-pink-800",
    custom: "bg-slate-100 text-slate-700"
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 text-[#2d4650] dark:text-slate-100">
              <ClipboardList className="w-10 h-10" />
              FeedBack
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Create and manage feedback surveys
            </p>
          </div>

          <Button
            size="lg"
            className="text-white gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
            style={{ backgroundColor: "#835879" }}
            onClick={() => navigate("/feedback/builder")}
          >
            <Plus className="w-5 h-5" />
            New Survey
          </Button>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-64 bg-slate-100 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : surveys.length === 0 ? (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-800">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <ClipboardList className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                No Surveys Yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                Create your first survey to collect feedback from attendees,
                volunteers, vendors, or sponsors.
              </p>
              <Button
                style={{ backgroundColor: "#835879" }}
                onClick={() => navigate("/feedback/builder")}
              >
                Create Your First Survey
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map(survey => (
              <Card
                key={survey.id}
                className="group hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-slate-200 h-full flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={statusColors[survey.status] || statusColors.draft}
                    >
                      {survey.status}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={typeColors[survey.survey_type]}
                    >
                      {survey.survey_type}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-800 group-hover:text-[#835879] transition-colors">
                    {survey.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 flex-1">
                  {survey.description && (
                    <p className="text-slate-600 text-sm line-clamp-2">
                      {survey.description}
                    </p>
                  )}

                  {survey.event_name && (
                    <div className="text-sm text-slate-500">
                      Event:{" "}
                      <span className="font-medium">
                        {survey.event_name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      <span>{survey.response_count || 0} responses</span>
                    </div>
                  </div>
                </CardContent>

                <div className="px-6 pb-6 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      navigate(
                        `/feedback/builder?id=${survey.id}${survey.status !== "draft" ? "&view=true" : ""}`
                      )
                    }
                  >
                    {survey.status === "draft" ? "Edit" : "View"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      navigate(`/feedback/results?id=${survey.id}`)
                    }
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Results
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setSurveyToDelete(survey)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!surveyToDelete}
        onOpenChange={(open) => !open && setSurveyToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">
              Delete Survey?
            </DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete{" "}
              <strong>{surveyToDelete?.title}</strong>? This will also
              delete all associated questions and responses. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setSurveyToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(surveyToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Survey"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
