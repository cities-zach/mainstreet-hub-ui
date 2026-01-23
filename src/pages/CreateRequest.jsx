import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Send, Loader2, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { uploadPublicFile } from "@/lib/uploads";

const MATERIAL_TYPES = [
  "Facebook Post",
  "Instagram Post",
  "Facebook Event",
  "Facebook Live",
  "Social Media Story",
  "Press Release",
  "Website Graphics",
  "Flyer",
  "Banner (Physical)",
  "Banner (Digital)",
  "Email Blast",
  "Print Advertisement",
  "Event Signage",
  "Sign-in Sheets",
  "Fundraising Link/QR Code",
  "Other (Describe Below)"
];

export default function CreateRequest() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [formData, setFormData] = useState({
    event_name: "",
    event_start_date: "",
    event_end_date: "",
    event_start_time: "",
    event_end_time: "",
    event_budget: "",
    event_sponsor: "",
    requested_by_name: "",
    material_types: [], // { type, due_date }
    content_description: "",
    additional_notes: "",
    uploaded_files: []
  });

  // Prefill requester name if /me exists
  useEffect(() => {
    apiFetch("/me")
      .then(data => {
        if (data?.user?.full_name) {
          setFormData(prev => ({
            ...prev,
            requested_by_name: data.user.full_name
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingFiles(true);

    try {
      const uploaded = await Promise.all(
        files.map((file) =>
          uploadPublicFile({
            pathPrefix: "marketing-requests",
            file,
          })
        )
      );

      setFormData((prev) => ({
        ...prev,
        uploaded_files: [...prev.uploaded_files, ...uploaded],
      }));
    } catch (error) {
      toast.error(error?.message || "Failed to upload files");
    } finally {
      setUploadingFiles(false);
      e.target.value = "";
    }
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      uploaded_files: prev.uploaded_files.filter((_, i) => i !== index)
    }));
  };

  const createMutation = useMutation({
    mutationFn: (data) =>
      apiFetch("/marketing-requests", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_requests"] });
      navigate("/marketstreet");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      status: "pending"
    });
  };

  const toggleMaterialType = (type) => {
    setFormData(prev => {
      const exists = prev.material_types.find(m => m.type === type);
      return exists
        ? {
            ...prev,
            material_types: prev.material_types.filter(m => m.type !== type)
          }
        : {
            ...prev,
            material_types: [...prev.material_types, { type, due_date: "" }]
          };
    });
  };

  const updateMaterialDueDate = (type, due_date) => {
    setFormData(prev => ({
      ...prev,
      material_types: prev.material_types.map(m =>
        m.type === type ? { ...m, due_date } : m
      )
    }));
  };

  const isMaterialSelected = (type) =>
    formData.material_types.some(m => m.type === type);

  const getMaterialDueDate = (type) =>
    formData.material_types.find(m => m.type === type)?.due_date || "";

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/marketstreet")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#2d4650] dark:text-slate-100">New Marketing Request</h1>
            <p className="text-slate-500 dark:text-slate-400">Request marketing materials for your event</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xl border border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-2xl text-[#2d4650] dark:text-slate-100">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              <div>
                <Label>Event Name *</Label>
                <Input
                  value={formData.event_name}
                  onChange={e => setFormData({ ...formData, event_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.event_start_date}
                    onChange={e => setFormData({ ...formData, event_start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    min={formData.event_start_date}
                    value={formData.event_end_date}
                    onChange={e => setFormData({ ...formData, event_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Event Start Time</Label>
                  <Input
                    type="time"
                    value={formData.event_start_time}
                    onChange={e => setFormData({ ...formData, event_start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Event End Time</Label>
                  <Input
                    type="time"
                    value={formData.event_end_time}
                    onChange={e => setFormData({ ...formData, event_end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Event Marketing Budget</Label>
                  <Input
                    value={formData.event_budget}
                    onChange={e => setFormData({ ...formData, event_budget: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Event Sponsor</Label>
                  <Input
                    value={formData.event_sponsor}
                    onChange={e => setFormData({ ...formData, event_sponsor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Your Name *</Label>
                <Input
                  value={formData.requested_by_name}
                  onChange={e => setFormData({ ...formData, requested_by_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base">Materials Needed *</Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Select materials and set their due dates
                </p>
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  {MATERIAL_TYPES.map(type => (
                    <div key={type} className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={isMaterialSelected(type)}
                          onCheckedChange={() => toggleMaterialType(type)}
                        />
                        <Label className="font-normal">{type}</Label>
                      </div>
                      {isMaterialSelected(type) && (
                        <div className="flex items-center gap-2 md:w-48">
                          <Label className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">Due:</Label>
                          <Input
                            type="date"
                            value={getMaterialDueDate(type)}
                            onChange={e => updateMaterialDueDate(type, e.target.value)}
                            required
                            className="h-9"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {formData.material_types.length === 0 && (
                  <p className="text-sm text-red-600">Please select at least one material type</p>
                )}
                {formData.material_types.some(m => !m.due_date) && formData.material_types.length > 0 && (
                  <p className="text-sm text-amber-600">Please set due dates for all selected materials</p>
                )}
              </div>

              <div>
                <Label>Content Description *</Label>
                <Textarea
                  rows={5}
                  value={formData.content_description}
                  onChange={e => setFormData({ ...formData, content_description: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Additional Information</Label>
                <Textarea
                  rows={3}
                  value={formData.additional_notes}
                  onChange={e => setFormData({ ...formData, additional_notes: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base">Upload Documents</Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Upload sponsor logos, brand guidelines, reference images, or other files.
                </p>
                <Input type="file" multiple hidden id="file_upload" onChange={handleFileUpload} />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("file_upload").click()}
                    disabled={uploadingFiles}
                    className="gap-2"
                  >
                    {uploadingFiles ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Choose Files
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Images, PDFs, or Word docs
                  </span>
                </div>

                {formData.uploaded_files.length > 0 && (
                  <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    {formData.uploaded_files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{file.file_name}</span>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeFile(i)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate("/marketstreet")}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                formData.material_types.length === 0 ||
                formData.material_types.some(m => !m.due_date)
              }
              className="bg-[#835879] text-white gap-2 px-8 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
