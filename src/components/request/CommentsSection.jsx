import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/api";

export default function CommentsSection({
  requestId,
  comments = [],
  user,
  request,
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) =>
      apiFetch("/request-comments", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request_comments", requestId] });
      setMessage("");
    }
  });

  const handleSubmit = () => {
    if (!message.trim()) return;
    createMutation.mutate({
      request_id: requestId,
      message: message.trim()
    });
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-800 dark:text-slate-100">Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No comments yet.
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white/80 dark:bg-slate-900/80"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {c.user_name || c.created_by || "User"}
                </div>
                <div className="text-sm text-slate-800 dark:text-slate-100">
                  {c.message || c.comment}
                </div>
              </div>
            ))}
          </div>
        )}

        {user && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <Textarea
              placeholder="Add a comment…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
