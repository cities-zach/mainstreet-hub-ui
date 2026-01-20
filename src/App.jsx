import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/queryClient";
import { apiFetch } from "@/api";

/* ---------- CORE PAGES ---------- */
import Dashboard from "@/pages/Dashboard";
import MasterPlanner from "@/pages/MasterPlanner";
import EventPlanForm from "@/pages/EventPlanForm";

/* ---------- BUDGET / FINANCE ---------- */
import PocketBook from "@/pages/PocketBook";
import BudgetDetails from "@/pages/BudgetDetails";

/* ---------- MARKETING ---------- */
import MarketStreet from "@/pages/MarketStreet";
import CreateRequest from "@/pages/CreateRequest";
import RequestDetails from "@/pages/RequestDetails";

/* ---------- FEEDBACK ---------- */
import FeedBack from "@/pages/FeedBack";
import SurveyBuilder from "@/pages/SurveyBuilder";
import PublicSurvey from "@/pages/PublicSurvey";
import SurveyResults from "@/pages/SurveyResults";

/* ---------- TASKS ---------- */
import TaskMaster from "@/pages/TaskMaster";

/* ---------- CRM / INVESTORS ---------- */
import InvestorTrack from "@/pages/InvestorTrack";

/* ---------- INVENTORY ---------- */
import SupplyStop from "@/pages/SupplyStop";

/* ---------- VOLUNTEERS ---------- */
import TeamBuilder from "@/pages/TeamBuilder";

/* ---------- SETTINGS ---------- */
import Settings from "@/pages/Settings";
import UserManagement from "@/pages/UserManagement";

function AppInner() {
  const {
    data: me,
    isLoading,
    error
  } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/me")
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error.message}</p>;

  return (
    <BrowserRouter>
      <Routes>

        {/* ---------- HOME ---------- */}
        <Route path="/" element={<Dashboard me={me} />} />

        {/* ---------- MASTER PLANNING ---------- */}
        <Route path="/master-planner" element={<MasterPlanner />} />
        <Route path="/event-plan" element={<EventPlanForm />} />

        {/* ---------- BUDGET ---------- */}
        <Route path="/pocketbook" element={<PocketBook />} />
        <Route path="/budget-details" element={<BudgetDetails />} />

        {/* ---------- MARKETING ---------- */}
        <Route path="/marketstreet" element={<MarketStreet />} />
        <Route path="/marketstreet/new" element={<CreateRequest />} />
        <Route path="/marketstreet/request" element={<RequestDetails />} />

        {/* ---------- FEEDBACK ---------- */}
        <Route path="/feedback" element={<FeedBack />} />
        <Route path="/feedback/builder" element={<SurveyBuilder />} />
        <Route path="/feedback/public" element={<PublicSurvey />} />
        <Route path="/feedback/results" element={<SurveyResults />} />

        {/* ---------- TASKS ---------- */}
        <Route path="/taskmaster" element={<TaskMaster />} />

        {/* ---------- INVESTORS ---------- */}
        <Route path="/investors" element={<InvestorTrack />} />

        {/* ---------- SUPPLY ---------- */}
        <Route path="/supplystop" element={<SupplyStop />} />

        {/* ---------- VOLUNTEERS ---------- */}
        <Route path="/teambuilder" element={<TeamBuilder />} />

        {/* ---------- SETTINGS ---------- */}
        <Route
          path="/settings"
          element={
            <Settings
              currentUser={me?.user}
              isSuperAdmin={me?.user?.role === "super_admin"}
            />
          }
        />
        <Route path="/settings/users" element={<UserManagement />} />

      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
