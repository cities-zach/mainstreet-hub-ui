import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import OverviewSection from "../components/masterplanner/OverviewSection";
import ContactsSection from "../components/masterplanner/ContactsSection";
import CommunicationSection from "../components/masterplanner/CommunicationSection";
import FeedbackSection from "../components/masterplanner/FeedbackSection";
import FinanceSection from "../components/masterplanner/FinanceSection";
import HealthSafetySection from "../components/masterplanner/HealthSafetySection";
import MaterialsSection from "../components/masterplanner/MaterialsSection";
import ScheduleSection from "../components/masterplanner/ScheduleSection";
import SiteSection from "../components/masterplanner/SiteSection";
import VolunteersSection from "../components/masterplanner/VolunteersSection";

import { apiFetch } from "../api";

const SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "contacts", label: "Contacts" },
  { key: "communications", label: "Communications" },
  { key: "finance", label: "Finance" },
  { key: "health_safety", label: "Health & Safety" },
  { key: "materials", label: "Materials" },
  { key: "schedule", label: "Schedule" },
  { key: "site", label: "Site" },
  { key: "volunteers", label: "Volunteers" },
  { key: "feedback", label: "Feedback" },
];

export default function EventPlanForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const eventId = searchParams.get("id");
  const cloneFromId = searchParams.get("clone_from");

  const [eventPlan, setEventPlan] = useState({});
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load event plan (edit or clone)
  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true);

        if (eventId) {
          const data = await apiFetch(`/event-plans/${eventId}`);
          setEventPlan(data);
        } else if (cloneFromId) {
          const data = await apiFetch(`/event-plans/${cloneFromId}`);
          delete data.id;
          data.status = "draft";
          setEventPlan(data);
        } else {
          setEventPlan({});
        }
      } catch (err) {
        setError("Failed to load event plan");
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId, cloneFromId]);

  const updateSection = (patch) => {
    setEventPlan((prev) => ({ ...prev, ...patch }));
  };

  const saveEventPlan = async () => {
    try {
      setSaving(true);

      if (eventId) {
        await apiFetch(`/event-plans/${eventId}`, {
          method: "PATCH",
          body: JSON.stringify(eventPlan),
        });
      } else {
        const created = await apiFetch(`/event-plans`, {
          method: "POST",
          body: JSON.stringify(eventPlan),
        });
        navigate(`/event-plan?id=${created.id}`);
      }
    } catch (err) {
      setError("Failed to save event plan");
    } finally {
      setSaving(false);
    }
  };

  const readOnly = eventPlan.status === "approved";

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <OverviewSection data={eventPlan} onChange={updateSection} readOnly={readOnly} />
        );

      case "contacts":
        return (
          <ContactsSection data={eventPlan} onChange={updateSection} readOnly={readOnly} />
        );

      case "communications":
        return (
          <CommunicationSection data={eventPlan} onChange={updateSection} readOnly={readOnly} />
        );

      case "finance":
        return (
          <FinanceSection data={eventPlan} onChange={updateSection} readOnly={readOnly} />
        );

      case "health_safety":
        return (
          <HealthSafetySection data={eventPlan} onChange={updateSection} readOnly={readOnly} />
        );

      case "materials":
        return (
          <MaterialsSection data={eventPlan} onChange={updateSection} readOnly={readOnly} />
        );

      case "schedule":
        return (
          <ScheduleSection data={eventPlan} onChange={updateSection} readOnly={readOnly} />
        );

      case "site":
        return <SiteSection data={eventPlan} onChange={updateSection} readOnly={readOnly} />;

      case "volunteers":
        return (
          <VolunteersSection data={eventPlan} onChange={updateSection} readOnly={readOnly} />
        );

      case "feedback":
        return (
          <FeedbackSection data={eventPlan} onChange={updateSection} readOnly={readOnly} />
        );

      default:
        return null;
    }
  };

  if (loading) return <p>Loading event plan…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <h1>Event Plan</h1>

      {/* Section Navigation */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            style={{
              padding: "0.5rem 1rem",
              borderBottom:
                activeSection === section.key ? "2px solid #835879" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              fontWeight: activeSection === section.key ? "bold" : "normal",
            }}
          >
            {section.label}
          </button>
        ))}
      </div>

      {renderActiveSection()}

      <div style={{ marginTop: "3rem" }}>
        <button onClick={saveEventPlan} disabled={saving}>
          {saving ? "Saving…" : "Save Event Plan"}
        </button>
      </div>
    </div>
  );
}
