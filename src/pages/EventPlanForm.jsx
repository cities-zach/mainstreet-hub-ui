import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Send, CheckCircle, Download } from "lucide-react";
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
];

export default function EventPlanForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("id");
  const cloneFromId = searchParams.get("clone_from");

  const [activeTab, setActiveTab] = useState("overview");
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    status: "draft",
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    apiFetch("/me")
      .then((data) => setUser(data.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadEvent() {
      try {
        setLoading(true);
        if (eventId) {
          const data = await apiFetch(`/events/${eventId}`);
          if (mounted) setFormData(data);
        } else if (cloneFromId) {
          const data = await apiFetch(`/events/${cloneFromId}`);
          const { id, created_at, updated_at, ...rest } = data;
          if (mounted) {
            setFormData({
              ...rest,
              name: `${rest.name || "Event"} (Copy)`,
              status: "draft",
              volunteer_opportunities: (rest.volunteer_opportunities || []).map((v) => ({
                ...v,
                count_filled: 0,
                status: "open",
              })),
            });
          }
        }
      } catch (err) {
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

  const updateFormData = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        event_champion_user_id: formData.event_champion_user_id || user?.id || null,
      };
      if (eventId) {
        await apiFetch(`/events/${eventId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        const created = await apiFetch(`/events`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        navigate(`/event-plan?id=${created.id}`);
      }
      toast.success("Event plan saved");
    } catch (err) {
      toast.error("Failed to save event plan");
    } finally {
      setSaving(false);
    }
  };

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
      await apiFetch(`/events/${eventId}/submit`, { method: "POST" });
      toast.success("Event plan submitted for review");
      navigate("/master-planner");
    } catch (err) {
      toast.error("Failed to submit event plan");
    }
  };

  const handleApprove = async () => {
    try {
      await apiFetch(`/events/${eventId}/approve`, { method: "POST" });
      toast.success("Event approved and downstream items created");
      navigate("/master-planner");
    } catch (err) {
      toast.error("Failed to approve event plan");
    }
  };

  const handleFinish = async () => {
    try {
      await apiFetch(`/events/${eventId}/finish`, { method: "POST" });
      toast.success("Event marked as finished");
      navigate("/master-planner");
    } catch (err) {
      toast.error("Failed to mark event finished");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading event plan...</div>;

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isChampion = user?.id && user?.id === formData.event_champion_user_id;
  const canApprove =
    eventId &&
    ["draft", "pending_review", "changes_requested"].includes(formData.status);
  const canFinish = eventId && formData.status === "approved" && (isAdmin || isChampion);

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
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && canApprove && (
              <Button
                onClick={handleApprove}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Event Plan
              </Button>
            )}
            {canFinish && (
              <Button
                onClick={handleFinish}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Event Finished
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
                disabled={!eventId}
                className="bg-[#835879] text-white gap-2"
              >
                <Send className="w-4 h-4" />
                Submit for Review
              </Button>
            )}
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
