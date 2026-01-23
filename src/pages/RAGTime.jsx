import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, Upload } from "lucide-react";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function RAGTime() {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const uploadDoc = useMutation({
    mutationFn: () =>
      apiFetch("/ai/knowledge/upload", {
        method: "POST",
        body: JSON.stringify({
          title,
          source: source || null,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          content,
        }),
      }),
    onSuccess: () => {
      setStatus({ type: "success", message: "Knowledge saved to RAGTime." });
      setTitle("");
      setSource("");
      setTags("");
      setContent("");
    },
    onError: (error) => {
      setStatus({ type: "error", message: error.message || "Upload failed." });
    },
  });

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = [
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
    ];

    if (!allowed.includes(file.type)) {
      setStatus({
        type: "error",
        message: "Only text, markdown, CSV, or JSON files are supported.",
      });
      event.target.value = "";
      return;
    }

    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result?.toString() || "";
      setContent(text);
      if (!title) {
        setTitle(file.name);
      }
      if (!source) {
        setSource(file.name);
      }
      setUploadingFile(false);
    };
    reader.onerror = () => {
      setStatus({ type: "error", message: "Unable to read the file." });
      setUploadingFile(false);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2d4650] dark:text-slate-100 flex items-center gap-3">
            <BookOpen className="w-9 h-9" />
            RAGTime
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Upload the knowledge base that powers Fred and the public chatbot.
          </p>
        </div>

        <Card className="bg-white/80 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle>Knowledge upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Upload file (text only)</Label>
              <Input
                type="file"
                accept=".txt,.md,.csv,.json"
                onChange={handleFileUpload}
                disabled={uploadingFile}
              />
              <p className="text-xs text-slate-500 mt-1">
                Supported: .txt, .md, .csv, .json
              </p>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Downtown FAQ"
              />
            </div>
            <div>
              <Label>Source (optional)</Label>
              <Input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="events, volunteer, policy"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={8}
                placeholder="Paste or type the knowledge to add..."
              />
            </div>
            {status && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  status.type === "success"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {status.message}
              </div>
            )}
            <Button
              className="bg-[#835879] text-white"
              onClick={() => uploadDoc.mutate()}
              disabled={uploadDoc.isPending || !title.trim() || !content.trim()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload to RAGTime
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
