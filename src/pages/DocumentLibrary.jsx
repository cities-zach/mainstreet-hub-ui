import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Archive, Download, FileText, History, Pencil, Plus, RotateCcw, Search, Upload,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_FORM = { title: "", description: "", category: "", tags: "", file: null };

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tagsFromInput(value) {
  return String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function DocumentForm({ value, setValue, requireFile = false, onSubmit, pending, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea rows={3} value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Category</Label>
          <Input value={value.category} onChange={(event) => setValue({ ...value, category: event.target.value })} placeholder="Policies, Events, Finance…" />
        </div>
        <div className="space-y-2">
          <Label>Tags</Label>
          <Input value={value.tags} onChange={(event) => setValue({ ...value, tags: event.target.value })} placeholder="board, policy, 2026" />
        </div>
      </div>
      {requireFile && (
        <div className="space-y-2">
          <Label>File *</Label>
          <Input type="file" required onChange={(event) => setValue({ ...value, file: event.target.files?.[0] || null })} />
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !value.title.trim() || (requireFile && !value.file)}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function DocumentLibrary() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState(EMPTY_FORM);
  const [editDocument, setEditDocument] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [versionDocument, setVersionDocument] = useState(null);
  const [versionFile, setVersionFile] = useState(null);
  const [versionNotes, setVersionNotes] = useState("");

  const params = useMemo(() => {
    const next = new URLSearchParams({ status, limit: "100" });
    if (query.trim()) next.set("query", query.trim());
    if (category) next.set("category", category);
    return next.toString();
  }, [category, query, status]);

  const documentsQuery = useQuery({
    queryKey: ["documents", params],
    queryFn: () => apiFetch(`/documents?${params}`),
  });
  const categoriesQuery = useQuery({
    queryKey: ["document-categories"],
    queryFn: () => apiFetch("/documents/categories"),
  });
  const versionsQuery = useQuery({
    queryKey: ["document-versions", versionDocument?.id],
    queryFn: () => apiFetch(`/documents/${versionDocument.id}/versions`),
    enabled: Boolean(versionDocument?.id),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["document-categories"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (form) => {
      const body = new FormData();
      body.append("title", form.title.trim());
      body.append("description", form.description.trim());
      body.append("category", form.category.trim());
      body.append("tags", JSON.stringify(tagsFromInput(form.tags)));
      body.append("links", "[]");
      body.append("file", form.file, form.file.name);
      return apiFetch("/documents", { method: "POST", body });
    },
    onSuccess: () => {
      refresh();
      setUploadForm(EMPTY_FORM);
      setUploadOpen(false);
      toast.success("Document uploaded");
    },
    onError: (error) => toast.error(error.message || "Document upload failed"),
  });

  const editMutation = useMutation({
    mutationFn: (form) => apiFetch(`/documents/${editDocument.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: form.title.trim(), description: form.description.trim() || null,
        category: form.category.trim() || null, tags: tagsFromInput(form.tags),
      }),
    }),
    onSuccess: () => {
      refresh();
      setEditDocument(null);
      toast.success("Document details updated");
    },
    onError: (error) => toast.error(error.message || "Document update failed"),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ document, nextStatus }) => apiFetch(
      `/documents/${document.id}/${nextStatus === "archived" ? "archive" : "restore"}`,
      { method: "POST" }
    ),
    onSuccess: () => {
      refresh();
      toast.success("Document status updated");
    },
    onError: (error) => toast.error(error.message || "Document status update failed"),
  });

  const versionMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append("notes", versionNotes.trim());
      body.append("file", versionFile, versionFile.name);
      return apiFetch(`/documents/${versionDocument.id}/versions`, { method: "POST", body });
    },
    onSuccess: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ["document-versions", versionDocument.id] });
      setVersionFile(null);
      setVersionNotes("");
      toast.success("New document version uploaded");
    },
    onError: (error) => toast.error(error.message || "Version upload failed"),
  });

  const openFile = async (fileId) => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    try {
      const { url } = await apiFetch(`/files/${fileId}/url`);
      if (popup) popup.location = url;
      else window.location.assign(url);
    } catch (error) {
      popup?.close();
      toast.error(error.message || "Download unavailable");
    }
  };

  const documents = documentsQuery.data?.items || [];
  const categories = categoriesQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-bold text-[#2d4650] dark:text-slate-100">
              <FileText className="h-10 w-10" /> Document Library
            </h1>
            <p className="mt-2 text-slate-500">Searchable, versioned files secured to your organization.</p>
          </div>
          <Button className="gap-2 bg-[#835879] text-white hover:bg-[#6d4a64]" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" /> Upload document
          </Button>
        </div>

        <Card>
          <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, descriptions, categories, and tags" />
            </div>
            <select className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((item) => <option key={item.category} value={item.category}>{item.category} ({item.document_count})</option>)}
            </select>
            <Tabs value={status} onValueChange={setStatus}>
              <TabsList><TabsTrigger value="active">Active</TabsTrigger><TabsTrigger value="archived">Archived</TabsTrigger></TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {documentsQuery.isError ? (
          <Card><CardContent className="py-16 text-center"><AlertTriangle className="mx-auto mb-3 h-9 w-9 text-red-500" /><p className="font-medium">Document Library could not be loaded.</p><Button className="mt-4" variant="outline" onClick={() => documentsQuery.refetch()}>Try again</Button></CardContent></Card>
        ) : documentsQuery.isLoading ? (
          <p className="py-12 text-center text-slate-500">Loading documents…</p>
        ) : documents.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-slate-500">No documents match these filters.</CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {documents.map((document) => (
              <Card key={document.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><CardTitle className="text-lg">{document.title}</CardTitle><p className="mt-1 text-xs text-slate-500">{document.file_name} · {formatBytes(document.byte_size)}</p></div>
                    {document.category && <Badge variant="secondary">{document.category}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {document.description && <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{document.description}</p>}
                  <div className="flex flex-wrap gap-1.5">{(document.tags || []).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    <Button size="sm" className="gap-2" onClick={() => openFile(document.file_id)}><Download className="h-4 w-4" /> Open</Button>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => setVersionDocument(document)}><History className="h-4 w-4" /> {document.version_count} version{document.version_count === 1 ? "" : "s"}</Button>
                    {document.can_manage && <Button size="sm" variant="ghost" className="gap-2" onClick={() => { setEditDocument(document); setEditForm({ title: document.title, description: document.description || "", category: document.category || "", tags: (document.tags || []).join(", "), file: null }); }}><Pencil className="h-4 w-4" /> Edit</Button>}
                    {document.can_manage && <Button size="sm" variant="ghost" className="ml-auto gap-2" onClick={() => archiveMutation.mutate({ document, nextStatus: document.status === "archived" ? "active" : "archived" })}>
                        {document.status === "archived" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        {document.status === "archived" ? "Restore" : "Archive"}
                      </Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent><DialogHeader><DialogTitle>Upload a document</DialogTitle><DialogDescription>The file stays private and is shared only within your organization.</DialogDescription></DialogHeader><DocumentForm value={uploadForm} setValue={setUploadForm} requireFile onSubmit={(event) => { event.preventDefault(); uploadMutation.mutate(uploadForm); }} pending={uploadMutation.isPending} submitLabel="Upload" /></DialogContent>
      </Dialog>

      <Dialog open={Boolean(editDocument)} onOpenChange={(open) => !open && setEditDocument(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit document details</DialogTitle><DialogDescription>Update how this document appears in search and filters.</DialogDescription></DialogHeader><DocumentForm value={editForm} setValue={setEditForm} onSubmit={(event) => { event.preventDefault(); editMutation.mutate(editForm); }} pending={editMutation.isPending} submitLabel="Save changes" /></DialogContent>
      </Dialog>

      <Dialog open={Boolean(versionDocument)} onOpenChange={(open) => !open && setVersionDocument(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Version history</DialogTitle><DialogDescription>{versionDocument?.title}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            {versionDocument?.can_manage && <div className="space-y-3 rounded-lg border p-4">
              <Label>Upload a new version</Label>
              <Input type="file" onChange={(event) => setVersionFile(event.target.files?.[0] || null)} />
              <Input value={versionNotes} onChange={(event) => setVersionNotes(event.target.value)} placeholder="What changed?" />
              <Button className="gap-2" disabled={!versionFile || versionMutation.isPending} onClick={() => versionMutation.mutate()}><Upload className="h-4 w-4" /> Upload version</Button>
            </div>}
            {versionsQuery.isLoading ? <p className="text-sm text-slate-500">Loading history…</p> : (versionsQuery.data || []).map((version) => (
              <div key={version.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div><p className="font-medium">Version {version.version_number}: {version.file_name}</p><p className="text-xs text-slate-500">{version.notes || "No version note"} · {formatBytes(version.byte_size)}</p></div>
                <Button size="sm" variant="outline" onClick={() => openFile(version.file_id)}><Download className="mr-2 h-4 w-4" /> Open</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
