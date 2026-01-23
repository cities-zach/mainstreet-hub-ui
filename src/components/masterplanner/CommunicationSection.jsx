import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";
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
  "Other (Describe Below)",
];

export default function CommunicationSection({ data, onChange, readOnly }) {
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const communicationStrategy = data.communication_strategy || "";
  const marketingMaterials = data.marketing_materials || [];
  const contentDescription = data.marketing_content_description || "";
  const additionalInfo = data.marketing_additional_info || "";
  const uploadedFiles = data.marketing_files || [];

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const toggleMaterialType = (type) => {
    const exists = marketingMaterials.find((m) => m.type === type);
    if (exists) {
      handleChange(
        "marketing_materials",
        marketingMaterials.filter((m) => m.type !== type)
      );
    } else {
      handleChange("marketing_materials", [...marketingMaterials, { type, due_date: "" }]);
    }
  };

  const updateMaterialDueDate = (type, due_date) => {
    handleChange(
      "marketing_materials",
      marketingMaterials.map((m) => (m.type === type ? { ...m, due_date } : m))
    );
  };

  const isMaterialSelected = (type) => marketingMaterials.some((m) => m.type === type);

  const getMaterialDueDate = (type) => {
    const material = marketingMaterials.find((m) => m.type === type);
    return material?.due_date || "";
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(true);

    try {
      const uploaded = await Promise.all(
        files.map((file) =>
          uploadPublicFile({
            pathPrefix: "masterplanner/marketing-files",
            file,
          })
        )
      );

      handleChange("marketing_files", [...uploadedFiles, ...uploaded]);
    } catch (error) {
      toast.error(error?.message || "Failed to upload files");
    } finally {
      setUploadingFiles(false);
      e.target.value = "";
    }
  };

  const removeFile = (index) => {
    handleChange(
      "marketing_files",
      uploadedFiles.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Strategy */}
      <div className="space-y-2">
        <Label className="text-lg font-semibold text-[#2d4650]">Describe Communication Strategy</Label>
        <Textarea
          value={communicationStrategy}
          onChange={(e) => handleChange("communication_strategy", e.target.value)}
          placeholder="Describe the overall strategy, key messages, and target audience..."
          rows={6}
          disabled={readOnly}
        />
      </div>

      {/* Materials */}
      <div className="space-y-3">
        <Label className="text-lg font-semibold text-[#2d4650]">Materials Needed</Label>
        <p className="text-sm text-slate-600">Select materials and set their due dates</p>

        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          {MATERIAL_TYPES.map((type) => (
            <div
              key={type}
              className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-white rounded-lg border border-slate-200"
            >
              <div className="flex items-center space-x-3 flex-1">
                <Checkbox
                  checked={isMaterialSelected(type)}
                  onCheckedChange={() => !readOnly && toggleMaterialType(type)}
                  disabled={readOnly}
                />
                <Label className="cursor-pointer font-normal flex-1">{type}</Label>
              </div>

              {isMaterialSelected(type) && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 md:w-48">
                    <Label className="text-sm text-slate-500">Due:</Label>
                    <Input
                      type="date"
                      value={getMaterialDueDate(type)}
                      onChange={(e) => updateMaterialDueDate(type, e.target.value)}
                      disabled={readOnly}
                    />
                  </div>

                  {(() => {
                    const material = marketingMaterials.find((m) => m.type === type);
                    if (!material?.status) return null;

                    const statusStyles = {
                      approved: { icon: CheckCircle, label: "Approved", className: "text-green-600 bg-green-50" },
                      changes_requested: {
                        icon: AlertCircle,
                        label: "Changes Requested",
                        className: "text-orange-600 bg-orange-50",
                      },
                      pending_review: { icon: Clock, label: "Pending", className: "text-amber-600 bg-amber-50" },
                    };

                    const style = statusStyles[material.status] || statusStyles.pending_review;
                    const Icon = style.icon;

                    return (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${style.className}`}>
                        <Icon className="w-3 h-3" />
                        {style.label}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label className="text-lg font-semibold text-[#2d4650]">Content Description</Label>
        <Textarea
          value={contentDescription}
          onChange={(e) => handleChange("marketing_content_description", e.target.value)}
          placeholder="Describe what content you want on the materials..."
          rows={5}
          disabled={readOnly}
        />
      </div>

      {/* Additional Info */}
      <div className="space-y-2">
        <Label className="text-lg font-semibold text-[#2d4650]">Additional Information</Label>
        <Textarea
          value={additionalInfo}
          onChange={(e) => handleChange("marketing_additional_info", e.target.value)}
          rows={3}
          disabled={readOnly}
        />
      </div>

      {/* Files */}
      <div className="space-y-3">
        <Label className="text-lg font-semibold text-[#2d4650]">Upload Documents</Label>

        {!readOnly && (
          <>
            <Input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={uploadingFiles}
              className="hidden"
              id="comm_file_upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("comm_file_upload")?.click()}
              disabled={uploadingFiles}
              className="gap-2"
            >
              {uploadingFiles ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Choose Files
                </>
              )}
            </Button>
          </>
        )}

        {uploadedFiles.length > 0 && (
          <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {uploadedFiles.map((file, index) => (
              <div
                key={`${file.file_name || "file"}-${index}`}
                className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-700 truncate">{file.file_name}</span>
                </div>
                {!readOnly && (
                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
