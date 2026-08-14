import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, FileArchive, Layers3, MapPinned, Plus, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, getDistrictMap, getDistrictMapImport, getDistrictMaps } from "@/api";
import DistrictMap from "@/components/maps/DistrictMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_MAP = {
  name: "Downtown Ottumwa District Map",
  description: "Explore Main Street boundaries, businesses, housing, tax zones, and parcels.",
};

function publicUrl(project) {
  if (!project?.public_slug || typeof window === "undefined") return "";
  return `${window.location.origin}/maps/${project.public_slug}`;
}

function formatDate(value) {
  if (!value) return "Not published";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function importBadge(status) {
  if (status === "published") return <Badge className="bg-emerald-600">Published</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">Ready to publish</Badge>;
}

export default function DistrictMaps() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [previewImportId, setPreviewImportId] = useState(null);
  const [createForm, setCreateForm] = useState(EMPTY_MAP);
  const [editDraft, setEditDraft] = useState(null);
  const [visibleLayersOverride, setVisibleLayersOverride] = useState(null);

  const projects = useQuery({ queryKey: ["district-maps"], queryFn: getDistrictMaps });
  const activeSelectedId = selectedId || projects.data?.[0]?.id || null;
  const project = useQuery({
    queryKey: ["district-maps", activeSelectedId],
    queryFn: () => getDistrictMap(activeSelectedId),
    enabled: Boolean(activeSelectedId),
  });
  const activePreviewImportId = previewImportId || project.data?.published_import_id || project.data?.imports?.[0]?.id || null;
  const preview = useQuery({
    queryKey: ["district-maps", activeSelectedId, "imports", activePreviewImportId],
    queryFn: () => getDistrictMapImport(activeSelectedId, activePreviewImportId),
    enabled: Boolean(activeSelectedId && activePreviewImportId),
  });
  const savedEditForm = {
    name: project.data?.name || "",
    description: project.data?.description || "",
    public_slug: project.data?.public_slug || "",
  };
  const editForm = editDraft || savedEditForm;
  const defaultVisibleLayers = useMemo(
    () => (preview.data?.layers || []).filter((layer) => layer.default_visible).map((layer) => layer.layer_key),
    [preview.data]
  );
  const visibleLayers = visibleLayersOverride || defaultVisibleLayers;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["district-maps"] });
    if (activeSelectedId) queryClient.invalidateQueries({ queryKey: ["district-maps", activeSelectedId] });
  };

  const createProject = useMutation({
    mutationFn: (payload) => apiFetch("/district-maps", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (created) => {
      toast.success("District map workspace created");
      setSelectedId(created.id);
      setEditDraft(null);
      setPreviewImportId(null);
      setVisibleLayersOverride(null);
      setCreateForm(EMPTY_MAP);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateProject = useMutation({
    mutationFn: (payload) => apiFetch(`/district-maps/${activeSelectedId}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success("Map details saved");
      setEditDraft(null);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadArchive = useMutation({
    mutationFn: async (file) => {
      const body = new FormData();
      body.append("file", file);
      return apiFetch(`/district-maps/${activeSelectedId}/import`, { method: "POST", body });
    },
    onSuccess: (imported) => {
      toast.success(`${Number(imported.feature_count || 0).toLocaleString()} map features imported`);
      setPreviewImportId(imported.id);
      setVisibleLayersOverride(null);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const publishImport = useMutation({
    mutationFn: (importId) => apiFetch(`/district-maps/${activeSelectedId}/imports/${importId}/publish`, { method: "POST" }),
    onSuccess: (_result, importId) => {
      toast.success("Public map published");
      setPreviewImportId(importId);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["district-maps", activeSelectedId, "imports", importId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateLayer = useMutation({
    mutationFn: ({ layerId, payload }) => apiFetch(`/district-maps/${activeSelectedId}/layers/${layerId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      toast.success("Layer defaults updated");
      invalidate();
      if (activePreviewImportId) queryClient.invalidateQueries({ queryKey: ["district-maps", activeSelectedId, "imports", activePreviewImportId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const selectedProject = project.data;
  const previewData = useMemo(() => preview.data
    ? { ...preview.data, bounds: preview.data.import?.bounds || preview.data.bounds }
    : null, [preview.data]);
  const warnings = preview.data?.import?.validation_summary?.warnings || [];

  const copyLink = async () => {
    const url = publicUrl(selectedProject);
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    toast.success("Public map link copied");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white"><MapPinned className="h-8 w-8 text-[#835879]" /> District Maps</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Import GIS layers, review a sanitized preview, and publish an interactive public district map.</p>
        </div>
        {selectedProject?.status === "published" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyLink}><Copy className="h-4 w-4" /> Copy public link</Button>
            <Button asChild variant="outline"><a href={publicUrl(selectedProject)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Open public map</a></Button>
          </div>
        )}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Map workspaces</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {projects.isLoading && <p className="text-sm text-slate-500">Loading maps…</p>}
              {(projects.data || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setEditDraft(null);
                    setPreviewImportId(null);
                    setVisibleLayersOverride(null);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${activeSelectedId === item.id ? "border-[#835879] bg-[#835879]/5" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}
                >
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold">{item.name}</span>{item.status === "published" ? <Badge className="bg-emerald-600">Live</Badge> : <Badge variant="secondary">Draft</Badge>}</div>
                  <p className="mt-1 text-xs text-slate-500">{item.import_count} import{item.import_count === 1 ? "" : "s"} · {item.published_feature_count || 0} live features</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Plus className="h-4 w-4" /> New map</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); createProject.mutate(createForm); }}>
                <div className="space-y-1"><Label htmlFor="new-map-name">Name</Label><Input id="new-map-name" value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} /></div>
                <div className="space-y-1"><Label htmlFor="new-map-description">Description</Label><Textarea id="new-map-description" rows={3} value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={!createForm.name.trim() || createProject.isPending}><Plus className="h-4 w-4" /> Create workspace</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {!selectedProject ? (
          <Card><CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center"><MapPinned className="mb-4 h-10 w-10 text-slate-300" /><h2 className="text-lg font-semibold">Create or select a map</h2><p className="mt-1 text-sm text-slate-500">Each map has its own public link and version history.</p></CardContent></Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Map details</CardTitle><Badge variant={selectedProject.status === "published" ? "default" : "secondary"}>{selectedProject.status}</Badge></div></CardHeader>
              <CardContent>
                <form className="grid gap-4 lg:grid-cols-2" onSubmit={(event) => { event.preventDefault(); updateProject.mutate(editForm); }}>
                  <div className="space-y-1"><Label htmlFor="map-name">Name</Label><Input id="map-name" value={editForm.name} onChange={(event) => setEditDraft({ ...editForm, name: event.target.value })} /></div>
                  <div className="space-y-1"><Label htmlFor="map-slug">Public address</Label><div className="flex items-center gap-2"><span className="text-sm text-slate-500">/maps/</span><Input id="map-slug" value={editForm.public_slug} onChange={(event) => setEditDraft({ ...editForm, public_slug: event.target.value })} /></div></div>
                  <div className="space-y-1 lg:col-span-2"><Label htmlFor="map-description">Public description</Label><Textarea id="map-description" rows={2} value={editForm.description} onChange={(event) => setEditDraft({ ...editForm, description: event.target.value })} /></div>
                  <div className="lg:col-span-2"><Button type="submit" disabled={!editForm.name.trim() || updateProject.isPending}>Save map details</Button></div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Import a shapefile ZIP</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
                  <FileArchive className="mx-auto mb-3 h-9 w-9 text-[#835879]" />
                  <p className="font-semibold">Upload the complete GIS archive</p>
                  <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-500">The importer validates .shp, .shx, .dbf and .prj files, reprojects every layer, strips private parcel fields, and keeps the current public version live until you publish.</p>
                  <Button asChild className="mt-4" disabled={uploadArchive.isPending}>
                    <label className="cursor-pointer"><Upload className="h-4 w-4" /> {uploadArchive.isPending ? "Importing…" : "Choose ZIP archive"}<input type="file" accept=".zip,application/zip" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) uploadArchive.mutate(file); }} /></label>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {selectedProject.imports?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Import history</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {selectedProject.imports.map((item) => (
                    <div key={item.id} className={`flex flex-col justify-between gap-3 rounded-xl border p-4 md:flex-row md:items-center ${activePreviewImportId === item.id ? "border-[#835879] bg-[#835879]/5" : "border-slate-200 dark:border-slate-700"}`}>
                      <button type="button" className="min-w-0 text-left" onClick={() => { setPreviewImportId(item.id); setVisibleLayersOverride(null); }}>
                        <div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold">{item.source_filename}</span>{importBadge(item.status)}</div>
                        <p className="mt-1 text-xs text-slate-500">{item.feature_count.toLocaleString()} features · Imported {formatDate(item.created_at)}{item.published_at ? ` · Published ${formatDate(item.published_at)}` : ""}</p>
                      </button>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setPreviewImportId(item.id); setVisibleLayersOverride(null); }}>Preview</Button>
                        {item.status !== "published" && <Button size="sm" onClick={() => publishImport.mutate(item.id)} disabled={publishImport.isPending}>{selectedProject.published_import_id ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />} {selectedProject.published_import_id ? "Publish this version" : "Publish map"}</Button>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {previewData && (
              <>
                {warnings.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                    <CardHeader><CardTitle className="text-lg text-amber-900 dark:text-amber-100">Import review</CardTitle></CardHeader>
                    <CardContent><ul className="list-disc space-y-1 pl-5 text-sm text-amber-900 dark:text-amber-100">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Map preview</CardTitle><p className="mt-1 text-sm text-slate-500">Showing {preview.data?.import?.feature_count?.toLocaleString()} sanitized features from this import.</p></div>{preview.data?.import?.status !== "published" && <Button onClick={() => publishImport.mutate(activePreviewImportId)} disabled={publishImport.isPending}><Check className="h-4 w-4" /> Publish this version</Button>}</div></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {previewData.layers.map((layer) => (
                        <label key={layer.id} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
                          <input type="checkbox" checked={visibleLayers.includes(layer.layer_key)} onChange={() => setVisibleLayersOverride((currentOverride) => { const current = currentOverride || defaultVisibleLayers; return current.includes(layer.layer_key) ? current.filter((key) => key !== layer.layer_key) : [...current, layer.layer_key]; })} className="accent-[#835879]" />
                          {layer.display_name}
                        </label>
                      ))}
                    </div>
                    <DistrictMap mapData={previewData} visibleLayerKeys={visibleLayers} heightClass="h-[620px]" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Layers3 className="h-5 w-5" /> Public layer defaults</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {previewData.layers.map((layer) => (
                      <label key={layer.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <input
                          type="checkbox"
                          checked={layer.default_visible}
                          onChange={(event) => updateLayer.mutate({ layerId: layer.id, payload: { default_visible: event.target.checked } })}
                          className="mt-1 h-4 w-4 accent-[#835879]"
                        />
                        <span><span className="block font-semibold">{layer.display_name}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{layer.description}</span><span className="mt-1 block text-xs text-slate-400">Labels from zoom {Math.max(Number(layer.min_zoom), layer.layer_key === "parcels" ? 18 : 16)}+</span></span>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
