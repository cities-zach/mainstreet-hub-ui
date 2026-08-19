import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle, Archive, ArrowDown, ArrowUp, BrainCircuit, Download, FileSignature, FileText,
  Folder, FolderPlus, History, ListOrdered, Pencil, Plus, RefreshCw, RotateCcw, Search, Shield, Upload,
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
import PermissionsDialog from "@/components/documents/PermissionsDialog";
import { SignatureInboxDialog, SignatureRequestDialog } from "@/components/documents/SignatureDialogs";

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

const KNOWLEDGE_STATUS = {
  pending: { label: "Waiting for FRED indexing", className: "border-amber-300 text-amber-700 dark:text-amber-300" },
  processing: { label: "Indexing for FRED", className: "border-blue-300 text-blue-700 dark:text-blue-300" },
  ready: { label: "Available to FRED", className: "border-emerald-300 text-emerald-700 dark:text-emerald-300" },
  failed: { label: "FRED indexing failed", className: "border-red-300 text-red-700 dark:text-red-300" },
  unsupported: { label: "Not searchable by FRED", className: "border-slate-300 text-slate-600 dark:text-slate-300" },
};

function KnowledgeStatus({ status, error }) {
  const metadata = KNOWLEDGE_STATUS[status] || KNOWLEDGE_STATUS.pending;
  return (
    <div className="space-y-1">
      <Badge variant="outline" className={`gap-1.5 ${metadata.className}`}>
        <BrainCircuit className="h-3.5 w-3.5" /> {metadata.label}
      </Badge>
      {error && <p className="max-w-md text-xs text-red-600 dark:text-red-300">{error}</p>}
    </div>
  );
}

function DocumentForm({ value, setValue, folders = [], requireFile = false, onSubmit, pending, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Folder</Label>
        <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={value.folder_id || ""} onChange={(event) => setValue({ ...value, folder_id: event.target.value })}>
          <option value="">Unfiled</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedSignatureRequestId = searchParams.get("signature_request");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [folderId, setFolderId] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadResults, setUploadResults] = useState([]);
  const [uploadForm, setUploadForm] = useState({ ...EMPTY_FORM, folder_id: "", fred_enabled: true });
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderEditTarget, setFolderEditTarget] = useState(null);
  const [folderEditName, setFolderEditName] = useState("");
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [permissionsType, setPermissionsType] = useState("document");
  const [signatureDocument, setSignatureDocument] = useState(null);
  const [signatureInboxOpen, setSignatureInboxOpen] = useState(Boolean(linkedSignatureRequestId));
  const [selectedIds, setSelectedIds] = useState([]);
  const [moveFolderId, setMoveFolderId] = useState("");
  const [editDocument, setEditDocument] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [versionDocument, setVersionDocument] = useState(null);
  const [versionFile, setVersionFile] = useState(null);
  const [versionNotes, setVersionNotes] = useState("");

  const foldersQuery = useQuery({
    queryKey: ["document-folders"],
    queryFn: () => apiFetch("/document-folders"),
  });
  const selectedFolder = useMemo(
    () => (foldersQuery.data || []).find((folder) => folder.id === folderId) || null,
    [folderId, foldersQuery.data]
  );
  const folderSortMode = selectedFolder?.sort_mode || "updated_desc";
  const params = useMemo(() => {
    const next = new URLSearchParams({
      status,
      limit: folderSortMode === "custom" ? "500" : "100",
      sort: folderSortMode,
    });
    if (query.trim()) next.set("query", query.trim());
    if (category) next.set("category", category);
    if (folderId) next.set("folder_id", folderId);
    return next.toString();
  }, [category, folderId, folderSortMode, query, status]);

  const documentsQuery = useQuery({
    queryKey: ["documents", params],
    queryFn: () => apiFetch(`/documents?${params}`),
  });
  const categoriesQuery = useQuery({
    queryKey: ["document-categories"],
    queryFn: () => apiFetch("/documents/categories"),
  });
  const signatureInboxQuery = useQuery({
    queryKey: ["signature-requests", "mine"],
    queryFn: () => apiFetch("/document-signature-requests"),
  });
  const versionsQuery = useQuery({
    queryKey: ["document-versions", versionDocument?.id],
    queryFn: () => apiFetch(`/documents/${versionDocument.id}/versions`),
    enabled: Boolean(versionDocument?.id),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["document-categories"] });
    queryClient.invalidateQueries({ queryKey: ["document-folders"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const file of uploadFiles) {
        const body = new FormData();
        body.append("title", file.name.replace(/\.[^.]+$/, ""));
        body.append("description", uploadForm.description.trim());
        body.append("category", uploadForm.category.trim());
        body.append("tags", JSON.stringify(tagsFromInput(uploadForm.tags)));
        body.append("links", "[]");
        body.append("folder_id", uploadForm.folder_id || "");
        body.append("inherit_folder_permissions", uploadForm.folder_id ? "true" : "false");
        body.append("fred_enabled", uploadForm.fred_enabled ? "true" : "false");
        body.append("file", file, file.name);
        try {
          results.push({ file: file.name, ok: true, value: await apiFetch("/documents", { method: "POST", body }) });
        } catch (error) {
          results.push({ file: file.name, ok: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      refresh();
      setUploadResults(results);
      const failures = results.filter((result) => !result.ok);
      if (failures.length) toast.error(`${failures.length} of ${results.length} files could not be uploaded`);
      else { toast.success(`${results.length} document${results.length === 1 ? "" : "s"} uploaded`); setUploadOpen(false); }
      setUploadFiles([]);
    },
    onError: (error) => toast.error(error.message || "Document upload failed"),
  });

  const createFolderMutation = useMutation({
    mutationFn: () => apiFetch("/document-folders", {
      method: "POST",
      body: JSON.stringify({ name: folderName.trim(), fred_enabled: true }),
    }),
    onSuccess: () => {
      refresh(); setFolderName(""); setFolderOpen(false); toast.success("Folder created");
    },
    onError: (error) => toast.error(error.message || "Folder could not be created"),
  });

  const editFolderMutation = useMutation({
    mutationFn: ({ status: nextStatus } = {}) => apiFetch(`/document-folders/${folderEditTarget.id}`, {
      method: "PATCH",
      body: JSON.stringify(nextStatus ? { status: nextStatus } : { name: folderEditName.trim() }),
    }),
    onSuccess: () => {
      refresh(); setFolderEditTarget(null); toast.success("Folder updated");
    },
    onError: (error) => toast.error(error.message || "Folder could not be updated"),
  });

  const folderSortMutation = useMutation({
    mutationFn: (sortMode) => apiFetch(`/document-folders/${selectedFolder.id}`, {
      method: "PATCH",
      body: JSON.stringify({ sort_mode: sortMode }),
    }),
    onSuccess: () => {
      refresh();
      toast.success("Folder order updated");
    },
    onError: (error) => toast.error(error.message || "Folder order could not be updated"),
  });

  const reorderMutation = useMutation({
    mutationFn: (documentIds) => apiFetch(`/document-folders/${selectedFolder.id}/order`, {
      method: "PUT",
      body: JSON.stringify({ document_ids: documentIds }),
    }),
    onSuccess: () => {
      refresh();
      toast.success("Custom order saved");
    },
    onError: (error) => toast.error(error.message || "Custom order could not be saved"),
  });

  const moveMutation = useMutation({
    mutationFn: () => apiFetch("/documents/bulk/move", {
      method: "POST", body: JSON.stringify({ document_ids: selectedIds, folder_id: moveFolderId || null }),
    }),
    onSuccess: () => { refresh(); setSelectedIds([]); toast.success("Documents moved"); },
    onError: (error) => toast.error(error.message || "Documents could not be moved"),
  });

  const editMutation = useMutation({
    mutationFn: (form) => apiFetch(`/documents/${editDocument.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: form.title.trim(), description: form.description.trim() || null,
        category: form.category.trim() || null, tags: tagsFromInput(form.tags),
        folder_id: form.folder_id || null,
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

  const reindexMutation = useMutation({
    mutationFn: (document) => apiFetch(`/documents/${document.id}/reindex`, { method: "POST" }),
    onSuccess: (_result, document) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ["document-versions", document.id] });
      toast.success("Document is available to FRED");
    },
    onError: (error) => toast.error(error.message || "FRED indexing failed"),
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
  const folders = foldersQuery.data || [];
  const pendingSignatures = (signatureInboxQuery.data || []).filter((request) => request.recipient_status === "pending").length;
  const canCustomOrder = Boolean(
    selectedFolder?.can_manage && selectedFolder.sort_mode === "custom" && status === "active" &&
    !query.trim() && !category && !documentsQuery.data?.next_cursor
  );
  const moveInCustomOrder = (index, offset) => {
    const target = index + offset;
    if (!canCustomOrder || target < 0 || target >= documents.length) return;
    const ids = documents.map((document) => document.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-bold text-[#2d4650] dark:text-slate-100">
              <FileText className="h-10 w-10" /> Document Library
            </h1>
            <p className="mt-2 text-slate-500">Searchable, versioned files secured to your organization and used by FRED.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setSignatureInboxOpen(true)}>
              <FileSignature className="h-4 w-4" /> My signatures {pendingSignatures > 0 && <Badge>{pendingSignatures}</Badge>}
            </Button>
            <Button className="gap-2 bg-[#835879] text-white hover:bg-[#6d4a64]" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4" /> Upload documents
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-lg"><Folder className="h-5 w-5" /> Folders</CardTitle><Button size="sm" variant="outline" className="gap-2" onClick={() => setFolderOpen(true)}><FolderPlus className="h-4 w-4" /> New folder</Button></div></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant={folderId === "" ? "default" : "outline"} onClick={() => setFolderId("")}>All documents</Button>
            <Button size="sm" variant={folderId === "unfiled" ? "default" : "outline"} onClick={() => setFolderId("unfiled")}>Unfiled</Button>
            {folders.map((folder) => <div key={folder.id} className="flex items-center rounded-md border"><Button size="sm" variant={folderId === folder.id ? "default" : "ghost"} className="rounded-r-none gap-2" onClick={() => setFolderId(folder.id)}><Folder className="h-3.5 w-3.5" /> {folder.name} ({folder.document_count})</Button>{folder.can_manage && <><Button size="icon" variant="ghost" className="h-8 w-8 rounded-none" aria-label={`Rename ${folder.name}`} onClick={() => { setFolderEditTarget(folder); setFolderEditName(folder.name); }}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 rounded-l-none" aria-label={`Manage ${folder.name} permissions`} onClick={() => { setPermissionsType("folder"); setPermissionsTarget(folder); }}><Shield className="h-3.5 w-3.5" /></Button></>}</div>)}
          </CardContent>
        </Card>

        {selectedFolder && (
          <Card>
            <CardContent className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="flex items-center gap-2 font-medium"><ListOrdered className="h-4 w-4" /> Folder order</p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedFolder.sort_mode === "custom"
                    ? "Use the arrow controls on each document to set the shared order."
                    : "This ordering is shared with everyone who can open the folder."}
                </p>
              </div>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedFolder.sort_mode || "updated_desc"}
                disabled={!selectedFolder.can_manage || folderSortMutation.isPending}
                onChange={(event) => folderSortMutation.mutate(event.target.value)}
                aria-label={`Sort ${selectedFolder.name}`}
              >
                <option value="updated_desc">Newest activity first</option>
                <option value="title_asc">Title A–Z</option>
                <option value="custom">Custom order</option>
              </select>
            </CardContent>
          </Card>
        )}

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

        {selectedIds.length > 0 && <Card><CardContent className="flex flex-wrap items-center gap-3 py-4"><p className="text-sm font-medium">{selectedIds.length} selected</p><select className="rounded-md border bg-background px-3 py-2 text-sm" value={moveFolderId} onChange={(event) => setMoveFolderId(event.target.value)}><option value="">Move to Unfiled</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>Move to {folder.name}</option>)}</select><Button size="sm" onClick={() => moveMutation.mutate()} disabled={moveMutation.isPending}>Move selected</Button><Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button></CardContent></Card>}

        {documentsQuery.isError ? (
          <Card><CardContent className="py-16 text-center"><AlertTriangle className="mx-auto mb-3 h-9 w-9 text-red-500" /><p className="font-medium">Document Library could not be loaded.</p><Button className="mt-4" variant="outline" onClick={() => documentsQuery.refetch()}>Try again</Button></CardContent></Card>
        ) : documentsQuery.isLoading ? (
          <p className="py-12 text-center text-slate-500">Loading documents…</p>
        ) : documents.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-slate-500">No documents match these filters.</CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {documents.map((document, documentIndex) => (
              <Card key={document.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3"><input type="checkbox" className="mt-1" aria-label={`Select ${document.title}`} checked={selectedIds.includes(document.id)} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, document.id] : selectedIds.filter((id) => id !== document.id))} /><div><CardTitle className="text-lg">{document.title}</CardTitle><p className="mt-1 text-xs text-slate-500">{document.folder_name ? `${document.folder_name} · ` : ""}{document.file_name} · {formatBytes(document.byte_size)}</p></div></div>
                    <div className="flex flex-wrap gap-1">{document.category && <Badge variant="secondary">{document.category}</Badge>}{document.fred_enabled === false && <Badge variant="outline">FRED off</Badge>}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {document.description && <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{document.description}</p>}
                  <div className="flex flex-wrap gap-1.5">{(document.tags || []).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <KnowledgeStatus status={document.knowledge_status} error={document.knowledge_error} />
                    {document.can_manage && ["failed", "pending"].includes(document.knowledge_status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={reindexMutation.isPending && reindexMutation.variables?.id === document.id}
                        onClick={() => reindexMutation.mutate(document)}
                      >
                        <RefreshCw className="h-4 w-4" /> Retry FRED indexing
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    {canCustomOrder && (
                      <div className="mr-1 flex items-center gap-1" aria-label={`Order ${document.title}`}>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          aria-label={`Move ${document.title} up`}
                          disabled={documentIndex === 0 || reorderMutation.isPending}
                          onClick={() => moveInCustomOrder(documentIndex, -1)}
                        ><ArrowUp className="h-4 w-4" /></Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          aria-label={`Move ${document.title} down`}
                          disabled={documentIndex === documents.length - 1 || reorderMutation.isPending}
                          onClick={() => moveInCustomOrder(documentIndex, 1)}
                        ><ArrowDown className="h-4 w-4" /></Button>
                      </div>
                    )}
                    <Button size="sm" className="gap-2" onClick={() => openFile(document.file_id)}><Download className="h-4 w-4" /> Open</Button>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => setVersionDocument(document)}><History className="h-4 w-4" /> {document.version_count} version{document.version_count === 1 ? "" : "s"}</Button>
                    {document.can_manage && <Button size="sm" variant="ghost" className="gap-2" onClick={() => { setEditDocument(document); setEditForm({ title: document.title, description: document.description || "", category: document.category || "", tags: (document.tags || []).join(", "), folder_id: document.folder_id || "", file: null }); }}><Pencil className="h-4 w-4" /> Edit</Button>}
                    {document.can_manage && <Button size="sm" variant="ghost" className="gap-2" onClick={() => { setPermissionsType("document"); setPermissionsTarget(document); }}><Shield className="h-4 w-4" /> Access</Button>}
                    {document.can_manage && <Button size="sm" variant="ghost" className="gap-2" onClick={() => setSignatureDocument(document)}><FileSignature className="h-4 w-4" /> Sign</Button>}
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
        <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Upload documents</DialogTitle><DialogDescription>Select multiple local files. Each becomes its own versioned document; supported text formats are automatically made searchable by FRED.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Files *</Label><Input type="file" multiple onChange={(event) => { setUploadFiles(Array.from(event.target.files || [])); setUploadResults([]); }} /><p className="text-xs text-slate-500">{uploadFiles.length ? `${uploadFiles.length} file${uploadFiles.length === 1 ? "" : "s"} selected` : "PDF, DOCX, TXT, Markdown, CSV, JSON, XML, HTML, and other library files."}</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Folder</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={uploadForm.folder_id} onChange={(event) => setUploadForm({ ...uploadForm, folder_id: event.target.value })}><option value="">Unfiled</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></div><div className="space-y-2"><Label>Category</Label><Input value={uploadForm.category} onChange={(event) => setUploadForm({ ...uploadForm, category: event.target.value })} /></div></div><div className="space-y-2"><Label>Tags for every file</Label><Input value={uploadForm.tags} onChange={(event) => setUploadForm({ ...uploadForm, tags: event.target.value })} placeholder="board, handbook" /></div><label className="flex gap-3 rounded-md border p-3 text-sm"><input type="checkbox" checked={uploadForm.fred_enabled} onChange={(event) => setUploadForm({ ...uploadForm, fred_enabled: event.target.checked })} /><span>Allow FRED to use these documents, subject to their folder or document permissions.</span></label>{uploadResults.length > 0 && <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">{uploadResults.map((result) => <p key={result.file} className={result.ok ? "text-emerald-700" : "text-red-700"}>{result.ok ? "✓" : "✕"} {result.file}{result.error ? ` — ${result.error}` : ""}</p>)}</div>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button><Button disabled={!uploadFiles.length || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>{uploadMutation.isPending ? `Uploading ${uploadFiles.length}…` : `Upload ${uploadFiles.length || ""} file${uploadFiles.length === 1 ? "" : "s"}`}</Button></div></div></DialogContent>
      </Dialog>

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}><DialogContent><DialogHeader><DialogTitle>Create folder</DialogTitle><DialogDescription>New folders begin with organization-wide view access. You can restrict access immediately afterward.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Folder name</Label><Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Board Handbook" /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setFolderOpen(false)}>Cancel</Button><Button disabled={!folderName.trim() || createFolderMutation.isPending} onClick={() => createFolderMutation.mutate()}>Create folder</Button></div></div></DialogContent></Dialog>

      <Dialog open={Boolean(folderEditTarget)} onOpenChange={(open) => !open && setFolderEditTarget(null)}><DialogContent><DialogHeader><DialogTitle>Folder settings</DialogTitle><DialogDescription>Rename this folder or archive it. Documents remain available through All documents.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Folder name</Label><Input value={folderEditName} onChange={(event) => setFolderEditName(event.target.value)} /></div><div className="flex justify-between gap-2"><Button variant="destructive" disabled={editFolderMutation.isPending} onClick={() => editFolderMutation.mutate({ status: "archived" })}>Archive folder</Button><div className="flex gap-2"><Button variant="outline" onClick={() => setFolderEditTarget(null)}>Cancel</Button><Button disabled={!folderEditName.trim() || editFolderMutation.isPending} onClick={() => editFolderMutation.mutate({})}>Save</Button></div></div></div></DialogContent></Dialog>

      <Dialog open={Boolean(editDocument)} onOpenChange={(open) => !open && setEditDocument(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit document details</DialogTitle><DialogDescription>Update how this document appears in search and filters.</DialogDescription></DialogHeader><DocumentForm value={editForm} setValue={setEditForm} folders={folders} onSubmit={(event) => { event.preventDefault(); editMutation.mutate(editForm); }} pending={editMutation.isPending} submitLabel="Save changes" /></DialogContent>
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
                <div className="space-y-2"><div><p className="font-medium">Version {version.version_number}: {version.file_name}</p><p className="text-xs text-slate-500">{version.notes || "No version note"} · {formatBytes(version.byte_size)}</p></div><KnowledgeStatus status={version.knowledge_status} error={version.knowledge_error} /></div>
                <Button size="sm" variant="outline" onClick={() => openFile(version.file_id)}><Download className="mr-2 h-4 w-4" /> Open</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <PermissionsDialog open={Boolean(permissionsTarget)} onOpenChange={(open) => !open && setPermissionsTarget(null)} resource={permissionsTarget} type={permissionsType} />
      {signatureDocument && <SignatureRequestDialog open={Boolean(signatureDocument)} onOpenChange={(open) => !open && setSignatureDocument(null)} document={signatureDocument} />}
      <SignatureInboxDialog
        open={signatureInboxOpen}
        onOpenChange={(open) => {
          setSignatureInboxOpen(open);
          if (!open && linkedSignatureRequestId) {
            const next = new URLSearchParams(searchParams);
            next.delete("signature_request");
            setSearchParams(next, { replace: true });
          }
        }}
        initialRequestId={linkedSignatureRequestId}
        openFile={openFile}
      />
    </div>
  );
}
