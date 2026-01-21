import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/queryClient";
import { apiFetch } from "@/api";
import { supabase } from "@/lib/supabaseClient";

/* ---------- CORE PAGES ---------- */
import Dashboard from "@/pages/Dashboard";
import MasterPlanner from "@/pages/MasterPlanner";
import EventPlanForm from "@/pages/EventPlanForm";
import MeetingNotes from "@/pages/MeetingNotes";

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
import RAGTime from "@/pages/RAGTime";

/* ---------- INVENTORY ---------- */
import SupplyStop from "@/pages/SupplyStop";

/* ---------- VOLUNTEERS ---------- */
import TeamBuilder from "@/pages/TeamBuilder";

/* ---------- SETTINGS ---------- */
import Settings from "@/pages/Settings";
import UserManagement from "@/pages/UserManagement";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";

function AppInner() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const {
    data: me,
    isLoading,
    error
  } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/me"),
    enabled: !!session
  });

  if (authLoading) return <p>Loading…</p>;
  if (!session) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error.message}</p>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<AppShell me={me} />}>
          {/* ---------- HOME ---------- */}
          <Route path="/" element={<Dashboard me={me} />} />

          {/* ---------- MASTER PLANNING ---------- */}
          <Route path="/master-planner" element={<MasterPlanner />} />
          <Route path="/event-plan" element={<EventPlanForm />} />
          <Route path="/meeting-notes" element={<MeetingNotes />} />

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

          {/* ---------- RAGTIME ---------- */}
          <Route path="/ragtime" element={<RAGTime />} />

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
        </Route>
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
