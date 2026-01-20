import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";

/**
 * Production-grade QuestionEditor
 *
 * Expected question shape (flexible):
 * {
 *   id?,
 *   question_text: string,
 *   question_type: string,
 *   required: boolean,
 *
 *   // choice types
 *   options: string[] OR { id?, label, value? }[],
 *   allow_other?: boolean,
 *
 *   // scale
 *   scale_min?: number,
 *   scale_max?: number,
 *   scale_min_label?: string,
 *   scale_max_label?: string,
 *
 *   // file upload
 *   accept?: string,        // e.g. ".jpg,.png,.pdf"
 *   max_files?: number,     // e.g. 3
 *   max_size_mb?: number    // e.g. 10
 * }
 *
 * Props:
 * - question: object
 * - onChange: (partialUpdates) => void
 * - onRemove / onDelete: () => void
 * - disabled: boolean
 */
export default function QuestionEditor({
  question,
  onChange,
  onRemove,
  onDelete,
  disabled = false
}) {
  if (!question) return null;

  const emit = (updates) => {
    // SurveyBuilder expects partial updates; keep that contract.
    onChange?.(updates);
  };

  const qType = question.question_type || "scale";

  const QUESTION_TYPES = useMemo(
    () => [
      { value: "scale", label: "Scale (1–5, 1–10, etc.)" },
      { value: "multiple_choice", label: "Multiple Choice (single select)" },
      { value: "checkbox", label: "Checkboxes (multi select)" },
      { value: "dropdown", label: "Dropdown (single select)" },
      { value: "text", label: "Short Text" },
      { value: "long_text", label: "Long Text" },
      { value: "yes_no", label: "Yes / No" },
      { value: "email", label: "Email" },
      { value: "number", label: "Number" },
      { value: "date", label: "Date" },
      { value: "file_upload", label: "File Upload" }
      // Intentionally NOT including rating_1_10 since you said to exclude it.
      // If you ever add other types, this editor will still render safely.
    ],
    []
  );

  // Normalize options: allow string[] or object[] from DB.
  const normalizedOptions = useMemo(() => {
    const raw = question.options;

    if (!Array.isArray(raw)) return [];

    return raw
      .map((opt) => {
        if (typeof opt === "string") {
          const label = opt;
          return { id: safeId(), label, value: label };
        }
        if (opt && typeof opt === "object") {
          const label = String(opt.label ?? opt.value ?? "");
          const value = String(opt.value ?? opt.label ?? "");
          return { id: String(opt.id ?? safeId()), label, value };
        }
        return null;
      })
      .filter(Boolean);
  }, [question.options]);

  const isChoiceType =
    qType === "multiple_choice" || qType === "checkbox" || qType === "dropdown";

  const setType = (nextType) => {
    // When switching types, initialize sensible defaults and keep existing text/required.
    const base = {
      question_type: nextType
    };

    if (nextType === "scale") {
      base.scale_min = question.scale_min ?? 1;
      base.scale_max = question.scale_max ?? 5;
    }

    if (nextType === "yes_no") {
      base.options = [
        { id: safeId(), label: "Yes", value: "Yes" },
        { id: safeId(), label: "No", value: "No" }
      ];
      base.allow_other = false;
    }

    if (nextType === "multiple_choice" || nextType === "checkbox" || nextType === "dropdown") {
      // Keep options if they exist, else seed two placeholders
      const existing = normalizedOptions.length ? normalizedOptions : [
        { id: safeId(), label: "Option 1", value: "Option 1" },
        { id: safeId(), label: "Option 2", value: "Option 2" }
      ];
      base.options = existing;
      base.allow_other = question.allow_other ?? true; // you said "yes" to Other option
    }

    if (nextType === "file_upload") {
      base.accept = question.accept ?? ".jpg,.jpeg,.png,.pdf";
      base.max_files = question.max_files ?? 1;
      base.max_size_mb = question.max_size_mb ?? 10;
    }

    // For plain text types, clean up irrelevant fields is optional,
    // but leaving them doesn’t break anything (DB stores JSON).
    emit(base);
  };

  const updateOptionLabel = (id, label) => {
    const next = normalizedOptions.map((o) =>
      o.id === id ? { ...o, label, value: label } : o
    );
    emit({ options: next });
  };

  const addOption = () => {
    const next = [
      ...normalizedOptions,
      { id: safeId(), label: `Option ${normalizedOptions.length + 1}`, value: `Option ${normalizedOptions.length + 1}` }
    ];
    emit({ options: next });
  };

  const removeOption = (id) => {
    const next = normalizedOptions.filter((o) => o.id !== id);
    emit({ options: next });
  };

  const moveOption = (id, dir) => {
    const idx = normalizedOptions.findIndex((o) => o.id === id);
    if (idx < 0) return;
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= normalizedOptions.length) return;

    const next = [...normalizedOptions];
    const temp = next[idx];
    next[idx] = next[swapWith];
    next[swapWith] = temp;
    emit({ options: next });
  };

  const toggleRequired = () => {
    emit({ required: !Boolean(question.required) });
  };

  const toggleOther = () => {
    emit({ allow_other: !Boolean(question.allow_other) });
  };

  // Light validation hints (non-blocking)
  const optionIssues = useMemo(() => {
    if (!isChoiceType && qType !== "yes_no") return null;

    const labels = normalizedOptions.map((o) => (o.label || "").trim()).filter(Boolean);
    const hasEmpty = normalizedOptions.some((o) => !(o.label || "").trim());
    const lower = labels.map((s) => s.toLowerCase());
    const hasDupes = new Set(lower).size !== lower.length;

    if (normalizedOptions.length === 0) return "Add at least one option.";
    if (hasEmpty) return "Remove or fill empty option text.";
    if (hasDupes) return "Option text should be unique.";
    return null;
  }, [normalizedOptions, isChoiceType, qType]);

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
      {/* Question Text */}
      <div className="space-y-2">
        <Label>Question Text</Label>
        <Textarea
          value={question.question_text || ""}
          onChange={(e) => emit({ question_text: e.target.value })}
          placeholder="Enter question text…"
          disabled={disabled}
        />
      </div>

      {/* Type + Required */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <Label>Question Type</Label>
          <Select
            value={qType}
            onValueChange={setType}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={Boolean(question.required)}
            onChange={toggleRequired}
            disabled={disabled}
            className="h-4 w-4"
          />
          <Label className="m-0">Required</Label>
        </div>
      </div>

      {/* Type-specific editors */}
      {qType === "scale" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scale Min</Label>
              <Input
                type="number"
                value={Number(question.scale_min ?? 1)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isNaN(v)) return;
                  const max = Number(question.scale_max ?? 5);
                  emit({ scale_min: Math.min(v, max - 1) });
                }}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Scale Max</Label>
              <Input
                type="number"
                value={Number(question.scale_max ?? 5)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isNaN(v)) return;
                  const min = Number(question.scale_min ?? 1);
                  emit({ scale_max: Math.max(v, min + 1) });
                }}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Label (optional)</Label>
              <Input
                value={question.scale_min_label || ""}
                onChange={(e) => emit({ scale_min_label: e.target.value })}
                placeholder="e.g. Very dissatisfied"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Label (optional)</Label>
              <Input
                value={question.scale_max_label || ""}
                onChange={(e) => emit({ scale_max_label: e.target.value })}
                placeholder="e.g. Very satisfied"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}

      {(isChoiceType || qType === "yes_no") && (
        <div className="space-y-3">
          {qType !== "yes_no" && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={Boolean(question.allow_other)}
                onChange={toggleOther}
                disabled={disabled}
                className="h-4 w-4"
              />
              <Label className="m-0">Allow “Other” option</Label>
            </div>
          )}

          <div className="space-y-2">
            <Label>Options</Label>

            {normalizedOptions.length === 0 ? (
              <div className="text-sm text-slate-500">No options yet.</div>
            ) : (
              <div className="space-y-2">
                {normalizedOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex gap-2 items-center">
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOptionLabel(opt.id, e.target.value)}
                      disabled={disabled}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveOption(opt.id, "up")}
                      disabled={disabled || idx === 0}
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveOption(opt.id, "down")}
                      disabled={disabled || idx === normalizedOptions.length - 1}
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => removeOption(opt.id)}
                      disabled={disabled}
                      title="Delete option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                disabled={disabled}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>

              {optionIssues && (
                <div className="text-sm text-amber-700">
                  {optionIssues}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {qType === "file_upload" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Accepted file types</Label>
            <Input
              value={question.accept || ".jpg,.jpeg,.png,.pdf"}
              onChange={(e) => emit({ accept: e.target.value })}
              placeholder=".jpg,.png,.pdf"
              disabled={disabled}
            />
            <div className="text-xs text-slate-500">
              Comma-separated. Examples: <code>.jpg,.png,.pdf</code>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max files</Label>
              <Input
                type="number"
                value={Number(question.max_files ?? 1)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isNaN(v)) return;
                  emit({ max_files: Math.max(1, Math.min(20, v)) });
                }}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Max size (MB)</Label>
              <Input
                type="number"
                value={Number(question.max_size_mb ?? 10)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isNaN(v)) return;
                  emit({ max_size_mb: Math.max(1, Math.min(100, v)) });
                }}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50"
          onClick={() => (onRemove ? onRemove() : onDelete?.(question))}
          disabled={disabled}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete Question
        </Button>
      </div>
    </div>
  );
}

function safeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}
