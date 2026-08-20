import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  Cloud,
  Download,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import OverviewSection from "@/components/masterplanner/OverviewSection";
import ContactsSection from "@/components/masterplanner/ContactsSection";
import CommunicationSection from "@/components/masterplanner/CommunicationSection";
import FeedbackSection from "@/components/masterplanner/FeedbackSection";
import FinanceSection from "@/components/masterplanner/FinanceSection";
import HealthSafetySection from "@/components/masterplanner/HealthSafetySection";
import MaterialsSection from "@/components/masterplanner/MaterialsSection";
import ScheduleSection from "@/components/masterplanner/ScheduleSection";
import SiteSection from "@/components/masterplanner/SiteSection";
import VolunteersSection from "@/components/masterplanner/VolunteersSection";
import PostEventSection from "@/components/masterplanner/PostEventSection";
import { apiFetch } from "@/api";
import { downloadEventWorkbook } from "@/components/masterplanner/utils/ExcelGenerator";

const SECTIONS = [
  { id: "overview", label: "Overview", component: OverviewSection },
  { id: "contacts", label: "Contacts", component: ContactsSection },
  { id: "schedule", label: "Schedule", component: ScheduleSection },
  { id: "volunteers", label: "Volunteers", component: VolunteersSection },
  { id: "communications", label: "Communication", component: CommunicationSection },
  { id: "materials", label: "Materials", component: MaterialsSection },
  { id: "finance", label: "Finance", component: FinanceSection },
  { id: "health_safety", label: "Health & Safety", component: HealthSafetySection },
  { id: "site", label: "Site Considerations", component: SiteSection },
  { id: "feedback", label: "Feedback", component: FeedbackSection },
  { id: "post_event", label: "Post-Event Notes", component: PostEventSection },
];

const initialFormData = {
  name: "",
  start_date: "",
  end_date: "",
  status: "draft",
};

const comparableFormData = (value) => {
  const comparable = { ...(value || {}) };
  delete comparable.updated_at;
  delete comparable.created_at;
  delete comparable.downstream_synced_at;
  return JSON.stringify(comparable);
};

function countTbdValues(value) {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countTbdValues(item), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value).reduce(
      (sum, item) => sum + countTbdValues(item),
      0
    );
  }
  return typeof value === "string" && value.trim().toUpperCase() === "TBD"
    ? 1
    : 0;
}

function buildPlanSummary(data) {
  const missing = [];
  if (!data.name?.trim()) missing.push({ label: "Event name", section: "overview" });
  if (!data.start_date) missing.push({ label: "Start date", section: "overview" });

  (data.planning_schedule_items || []).forEach((item, index) => {
    if (!item.task?.trim()) {
      missing.push({ label: `Planning task ${index + 1} description`, section: "schedule" });
    }
    if (!item.due_date) {
      missing.push({ label: `Planning task ${index + 1} due date`, section: "schedule" });
    }
  });

  (data.volunteer_opportunities || []).forEach((item, index) => {
    if (!item.task?.trim()) {
      missing.push({ label: `Volunteer role ${index + 1} name`, section: "volunteers" });
    }
  });

  return { missing, tbdCount: countTbdValues(data) };
}

function prepareClonedEvent(data) {
  const clone = { ...data };
  delete clone.id;
  delete clone.created_at;
  delete clone.updated_at;
  delete clone.downstream_synced_at;
  clone.name = `${data.name || "Event"} (Copy)`;
  clone.status = "draft";

  const freshRows = (items, reset) =>
    (items || []).map((item) => {
      const next = {
        ...item,
        _row_id: globalThis.crypto.randomUUID(),
      };
      return reset ? reset(next) : next;
    });

  clone.schedule_items = freshRows(data.schedule_items);
  clone.planning_schedule_items = freshRows(
    data.planning_schedule_items,
    (item) => {
      delete item.task_id;
      delete item.masterplanner_item_id;
      delete item.status;
      return item;
    }
  );
  clone.special_programs = freshRows(data.special_programs);
  clone.volunteer_opportunities = freshRows(
    data.volunteer_opportunities,
    (item) => {
      delete item.volunteer_job_id;
      delete item.status;
      item.count_filled = 0;
      item.assignments = [];
      return item;
    }
  );
  clone.mso_inventory_needs = freshRows(data.mso_inventory_needs);
  clone.equipment_needs = freshRows(data.equipment_needs);
  clone.funding_sources = freshRows(data.funding_sources);
  clone.projected_expenses = freshRows(data.projected_expenses);
  clone.marketing_materials = freshRows(data.marketing_materials, (item) => {
    delete item.material_id;
    delete item.marketstreet_request_id;
    delete item.status;
    return item;
  });

  return clone;
}

export default function EventPlanForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("id");
  const cloneFromId = searchParams.get("clone_from");

  const [activeTab, setActiveTab] = useState("overview");
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [user, setUser] = useState(null);
  const [saveState, setSaveState] = useState("saved");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const formDataRef = useRef(initialFormData);
  const lastSavedSignatureRef = useRef(comparableFormData(initialFormData));
  const hasUserChangesRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const newlyCreatedIdRef = useRef(null);

  useEffect(() => {
    apiFetch("/me")
      .then((data) => setUser(data.user))
      .catch(() => {});
    apiFetch("/supply/items")
      .then((data) => setInventoryItems(Array.isArray(data) ? data : data?.rows || []))
      .catch(() => setInventoryItems([]));
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadEvent() {
      try {
        if (eventId && newlyCreatedIdRef.current === eventId) {
          newlyCreatedIdRef.current = null;
          return;
        }
        setLoading(true);
        if (eventId) {
          const data = await apiFetch(`/events/${eventId}`);
          if (mounted) {
            formDataRef.current = data;
            lastSavedSignatureRef.current = comparableFormData(data);
            hasUserChangesRef.current = false;
            setFormData(data);
            setSaveState("saved");
            setLastSavedAt(data.updated_at || null);
          }
        } else if (cloneFromId) {
          const data = await apiFetch(`/events/${cloneFromId}`);
          if (mounted) {
            const cloned = prepareClonedEvent(data);
            formDataRef.current = cloned;
            lastSavedSignatureRef.current = comparableFormData(cloned);
            setFormData(cloned);
          }
        }
      } catch {
        toast.error("Failed to load event plan");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEvent();
    return () => {
      mounted = false;
    };
  }, [eventId, cloneFromId]);

  const updateFormData = useCallback((updates) => {
    setFormData((previous) => {
      const next = { ...previous, ...updates };
      formDataRef.current = next;
      return next;
    });
    hasUserChangesRef.current = true;
    setSaveState("unsaved");
  }, []);

  const saveCurrentForm = useCallback(
    async ({ silent = false } = {}) => {
      if (saveInFlightRef.current) {
        saveQueuedRef.current = true;
        return null;
      }

      saveInFlightRef.current = true;
      setSaving(true);
      setSaveState("saving");
      const payload = {
        ...formDataRef.current,
        event_champion_user_id:
          formDataRef.current.event_champion_user_id || user?.id || null,
      };
      const startedSignature = comparableFormData(formDataRef.current);

      try {
        const saved = eventId
          ? await apiFetch(`/events/${eventId}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            })
          : await apiFetch("/events", {
              method: "POST",
              body: JSON.stringify(payload),
            });

        lastSavedSignatureRef.current = comparableFormData(saved);
        setLastSavedAt(saved.updated_at || new Date().toISOString());

        if (comparableFormData(formDataRef.current) === startedSignature) {
          formDataRef.current = saved;
          hasUserChangesRef.current = false;
          setFormData(saved);
          setSaveState("saved");
        } else {
          const merged = {
            ...saved,
            ...formDataRef.current,
            id: saved.id,
            status: saved.status,
          };
          formDataRef.current = merged;
          setFormData(merged);
          setSaveState("unsaved");
        }

        if (!eventId) {
          newlyCreatedIdRef.current = saved.id;
          navigate(`/event-plan?id=${saved.id}`, { replace: true });
        }
        if (!silent) toast.success("Event plan saved");
        return saved;
      } catch {
        setSaveState("error");
        if (!silent) toast.error("Failed to save event plan");
        return null;
      } finally {
        saveInFlightRef.current = false;
        setSaving(false);
        if (saveQueuedRef.current) {
          saveQueuedRef.current = false;
          if (eventId) {
            window.setTimeout(
              () => saveCurrentForm({ silent: true }),
              0
            );
          }
        }
      }
    },
    [eventId, navigate, user?.id]
  );

  const handleSave = () => saveCurrentForm({ silent: false });

  useEffect(() => {
    if (loading || !hasUserChangesRef.current) return undefined;
    const timeout = window.setTimeout(() => {
      saveCurrentForm({ silent: true });
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [formData, loading, saveCurrentForm]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUserChangesRef.current && !saveInFlightRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const name = formData.name?.trim();
    const year = formData.start_date?.slice(0, 4);
    if (!name || !year) {
      setDuplicates([]);
      return undefined;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          name,
          year,
          ...(eventId ? { exclude_id: eventId } : {}),
        });
        const result = await apiFetch(`/events/duplicates?${query.toString()}`, {
          signal: controller.signal,
        });
        setDuplicates(result?.rows || []);
      } catch {
        if (!controller.signal.aborted) setDuplicates([]);
      }
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [eventId, formData.name, formData.start_date]);

  const handleSubmit = async () => {
    const errors = {};
    if (!formData.name) errors.name = "Event Name is required";
    if (!formData.start_date) errors.start_date = "Start Date is required";
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fill in required fields.");
      setActiveTab("overview");
      return;
    }
    setValidationErrors({});
    try {
      const saved = await saveCurrentForm({ silent: true });
      if (!saved && saveState === "error") throw new Error("Save failed");
      await apiFetch(`/events/${eventId}/submit`, { method: "POST" });
      toast.success("Event plan submitted for review");
      navigate("/master-planner");
    } catch {
      toast.error("Failed to submit event plan");
    }
  };

  const handleApprove = async () => {
    try {
      const saved = await saveCurrentForm({ silent: true });
      if (!saved && saveState === "error") throw new Error("Save failed");
      await apiFetch(`/events/${eventId}/approve`, { method: "POST" });
      toast.success("Event approved and downstream items created");
      navigate("/master-planner");
    } catch {
      toast.error("Failed to approve event plan");
    }
  };

  const handleFinish = async () => {
    try {
      const saved = await saveCurrentForm({ silent: true });
      if (!saved && saveState === "error") throw new Error("Save failed");
      await apiFetch(`/events/${eventId}/finish`, { method: "POST" });
      toast.success("Event marked as finished");
      navigate("/master-planner");
    } catch {
      toast.error("Failed to mark event finished");
    }
  };

  const handleReopenDraft = async () => {
    try {
      const updated = await apiFetch(`/events/${eventId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "draft" }),
      });
      setFormData(updated);
      toast.success("Event moved back to draft");
    } catch {
      toast.error("Failed to move event back to draft");
    }
  };

  const handleSyncChanges = async () => {
    try {
      await saveCurrentForm({ silent: true });
      const result = await apiFetch(`/events/${eventId}/sync`, {
        method: "POST",
      });
      formDataRef.current = result.event;
      lastSavedSignatureRef.current = comparableFormData(result.event);
      hasUserChangesRef.current = false;
      setFormData(result.event);
      setSaveState("saved");
      setLastSavedAt(result.event.updated_at || new Date().toISOString());
      const volunteerSummary = result.summary.volunteer_jobs || {
        created: 0,
        updated: 0,
        removed: 0,
      };
      toast.success(
        `Synced tasks (${result.summary.created} created, ${result.summary.updated} updated) and volunteer opportunities (${volunteerSummary.created} created, ${volunteerSummary.updated} updated, ${volunteerSummary.removed} archived)`
      );
    } catch (error) {
      toast.error(error?.message || "Failed to sync downstream changes");
    }
  };

  const planSummary = useMemo(() => buildPlanSummary(formData), [formData]);

  if (loading) return <div className="p-8 text-center">Loading event plan...</div>;

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isChampion = user?.id && user?.id === formData.event_champion_user_id;
  const canApprove =
    eventId &&
    ["draft", "pending_review", "changes_requested"].includes(formData.status);
  const canFinish = eventId && formData.status === "approved" && (isAdmin || isChampion);
  const canReopenDraft = eventId && formData.status === "finished" && (isAdmin || isChampion);
  const canSync = eventId && formData.status === "approved" && (isAdmin || isChampion);
  const needsSync =
    canSync &&
    (!formData.downstream_synced_at ||
      new Date(formData.updated_at).getTime() >
        new Date(formData.downstream_synced_at).getTime());

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/master-planner")}>
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {eventId ? formData.name || "Edit Event Plan" : "New Event Plan"}
              </h1>
              <div className="text-sm text-slate-500 mt-1 capitalize">
                {formData.status || "draft"}
              </div>
              <div
                className={`mt-1 flex items-center gap-1.5 text-xs ${
                  saveState === "error"
                    ? "text-red-600"
                    : saveState === "unsaved"
                      ? "text-amber-600"
                      : "text-slate-500"
                }`}
                aria-live="polite"
              >
                {saveState === "saving" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : saveState === "saved" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Cloud className="h-3.5 w-3.5" />
                )}
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "unsaved"
                    ? "Unsaved changes"
                    : saveState === "error"
                      ? "Autosave failed — use Save Draft"
                      : `Saved${lastSavedAt ? ` at ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && canApprove && (
              <Button
                onClick={handleApprove}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Event Plan
              </Button>
            )}
            {canFinish && (
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Event Finished
              </Button>
            )}
            {canReopenDraft && (
              <Button
                onClick={handleReopenDraft}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reopen as Draft
              </Button>
            )}
            {canSync && (
              <Button
                variant={needsSync ? "default" : "outline"}
                onClick={handleSyncChanges}
                disabled={saving || !needsSync}
                className={needsSync ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {needsSync ? "Sync changes" : "Tasks & volunteers synced"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => downloadEventWorkbook(formData)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export Plan
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            {formData.status === "draft" && (
              <Button
                onClick={handleSubmit}
                disabled={!eventId || saving}
                className="bg-[#835879] text-white gap-2"
              >
                <Send className="w-4 h-4" />
                Submit for Review
              </Button>
            )}
          </div>
        </div>

        {duplicates.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-semibold text-amber-950">
                    A plan with this event name and year already exists.
                  </p>
                  <p className="text-sm text-amber-800">
                    Open the existing plan to update it, or clone it instead of
                    creating an accidental duplicate.
                  </p>
                </div>
                {duplicates.map((duplicate) => (
                  <div
                    key={duplicate.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 p-3"
                  >
                    <span className="text-sm font-medium">
                      {duplicate.name} — {duplicate.start_date?.slice(0, 4)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/event-plan?id=${duplicate.id}`)}
                      >
                        Open & update
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(`/event-plan?clone_from=${duplicate.id}`)
                        }
                      >
                        Clone
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              planSummary.missing[0] &&
              setActiveTab(planSummary.missing[0].section)
            }
            className={`rounded-xl border p-4 text-left ${
              planSummary.missing.length
                ? "border-amber-300 bg-amber-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <div className="font-semibold">
              {planSummary.missing.length
                ? `${planSummary.missing.length} missing plan item${planSummary.missing.length === 1 ? "" : "s"}`
                : "Core plan fields complete"}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {planSummary.missing.slice(0, 3).map((item) => item.label).join(" • ") ||
                "No required or row-level gaps detected."}
            </div>
          </button>
          <div
            className={`rounded-xl border p-4 ${
              planSummary.tbdCount
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="font-semibold">
              {planSummary.tbdCount
                ? `${planSummary.tbdCount} unresolved TBD value${planSummary.tbdCount === 1 ? "" : "s"}`
                : "No unresolved TBD values"}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              TBD values remain visible and are excluded from downstream numeric totals.
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <Card className="sticky top-6 bg-white/80 border-slate-200">
              <CardContent className="p-2">
                <div className="flex flex-col gap-1">
                  {SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveTab(section.id)}
                      className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex justify-between items-center ${
                        activeTab === section.id
                          ? "bg-slate-100 text-[#2d4650]"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                      }`}
                    >
                      {section.label}
                      {activeTab === section.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#835879]" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-9">
            <Card className="bg-white/90 border-slate-200 min-h-[500px]">
              <CardContent className="p-6">
                {SECTIONS.map((section) => {
                  if (section.id !== activeTab) return null;
                  const Component = section.component;
                  return (
                    <div key={section.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <h2 className="text-xl font-bold mb-6 pb-4 border-b border-slate-100 text-[#2d4650]">
                        {section.label}
                      </h2>
                      <Component
                        data={formData}
                        onChange={updateFormData}
                        readOnly={false}
                        validationErrors={validationErrors}
                        eventId={eventId}
                        inventoryItems={
                          section.id === "materials" ? inventoryItems : undefined
                        }
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  const idx = SECTIONS.findIndex((s) => s.id === activeTab);
                  if (idx > 0) setActiveTab(SECTIONS[idx - 1].id);
                }}
                disabled={activeTab === SECTIONS[0].id}
              >
                Previous Section
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const idx = SECTIONS.findIndex((s) => s.id === activeTab);
                  if (idx < SECTIONS.length - 1) setActiveTab(SECTIONS[idx + 1].id);
                }}
                disabled={activeTab === SECTIONS[SECTIONS.length - 1].id}
              >
                Next Section
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
