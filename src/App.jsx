import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/queryClient";
import { apiFetch } from "@/api";
import { supabase } from "@/lib/supabaseClient";

/* ---------- CORE PAGES ---------- */
import Dashboard from "@/pages/Dashboard";
import MasterPlanner from "@/pages/MasterPlanner";
import EventPlanForm from "@/pages/EventPlanForm";
import MeetingNotes from "@/pages/MeetingNotes";
import DocumentLibrary from "@/pages/DocumentLibrary";
import ActionCenter from "@/pages/ActionCenter";

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
import CRM from "@/pages/CRM";
import Outreach from "@/pages/Outreach";
import WalkingTours from "@/pages/WalkingTours";
import WalkingTourPublic from "@/pages/WalkingTourPublic";
import DistrictMaps from "@/pages/DistrictMaps";
import DistrictMapPublic from "@/pages/DistrictMapPublic";
import Fundraising from "@/pages/Fundraising";
import FundraisingPublic from "@/pages/FundraisingPublic";
import Contests from "@/pages/Contests";
import ContestPublic from "@/pages/ContestPublic";
import InvestorTrack from "@/pages/InvestorTrack";

/* ---------- INVENTORY ---------- */
import SupplyStop from "@/pages/SupplyStop";

/* ---------- VOLUNTEERS ---------- */
import TeamBuilder from "@/pages/TeamBuilder";
import WheelSpin from "@/pages/WheelSpin";
import WheelSpinPresenter from "@/pages/WheelSpinPresenter";
import PassportAdmin from "@/pages/PassportAdmin";
import PassportPublic from "@/pages/PassportPublic";
import Chat from "@/pages/Chat";
import PhotoBooth from "@/pages/PhotoBooth";

/* ---------- SETTINGS ---------- */
import Settings from "@/pages/Settings";
import UserManagement from "@/pages/UserManagement";
import AiSessions from "@/pages/AiSessions";
import AppShell from "@/components/layout/AppShell";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import PolicyAcceptanceModal from "@/components/policies/PolicyAcceptanceModal";
import NamePromptModal from "@/components/users/NamePromptModal";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import InviteAccept from "@/pages/InviteAccept";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";

const PUBLIC_PATH_PATTERNS = [
  /^\/invite\/?$/,
  /^\/privacy\/?$/,
  /^\/terms\/?$/,
  /^\/reset-password\/?$/,
  /^\/p\/[^/]+\/?$/,
  /^\/tours\/[^/]+\/?$/,
  /^\/maps\/[^/]+\/?$/,
  /^\/fundraising\/[^/]+\/?$/,
  /^\/contests\/[^/]+\/?$/,
  /^\/feedback\/public\/?$/,
];

function isPublicPath(pathname) {
  return PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(pathname || "/"));
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/invite" element={<InviteAccept />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/p/:slug" element={<PassportPublic />} />
      <Route path="/tours/:slug" element={<WalkingTourPublic />} />
      <Route path="/maps/:slug" element={<DistrictMapPublic />} />
      <Route path="/fundraising/:slug" element={<FundraisingPublic />} />
      <Route path="/contests/:slug" element={<ContestPublic />} />
      <Route path="/feedback/public" element={<PublicSurvey />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function AccessError({ error, onReset }) {
  const notProvisioned = error?.code === "ACCOUNT_NOT_PROVISIONED";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          {notProvisioned ? "Your account needs access" : "MainSuite is temporarily unavailable"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {notProvisioned
            ? "Your sign-in is valid, but it is not linked to an active MainSuite account for this organization. Ask an administrator to finish setting up your access."
            : "We could not finish loading your account. Please try again, or return to sign in if the problem continues."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Try again
          </button>
          <button type="button" onClick={onReset} className="rounded-lg bg-[#835879] px-4 py-2 text-sm font-semibold text-white hover:bg-[#704a67]">
            Return to sign in
          </button>
        </div>
      </section>
    </main>
  );
}

function AppInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const publicPath = isPublicPath(location.pathname);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      if (data.session && hashParams.get("type") === "recovery") {
        navigate("/reset-password", { replace: true });
      }
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);
        if (event === "PASSWORD_RECOVERY") {
          navigate("/reset-password", { replace: true });
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate]);

  const {
    data: me,
    isLoading,
    error
  } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/me"),
    enabled: Boolean(session) && !publicPath,
    retry: false,
  });

  useEffect(() => {
    if (publicPath || !session || error?.status !== 401) return;
    void supabase.auth.signOut({ scope: "local" }).finally(() => {
      queryClient.removeQueries({ queryKey: ["me"] });
      setSession(null);
    });
  }, [error?.status, publicPath, queryClient, session]);

  useEffect(() => {
    const enabled = Boolean(me?.user?.dark_mode);
    document.documentElement.classList.toggle("dark", enabled);
  }, [me?.user?.dark_mode]);

  useEffect(() => {
    const faviconUrl = me?.organization?.logo_url || "/favicon.png";
    if (typeof document === "undefined") return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const setFavicon = (url) => {
      const cleanUrl = url.split("?")[0];
      const extension = cleanUrl.split(".").pop()?.toLowerCase();
      link.type =
        extension === "svg"
          ? "image/svg+xml"
          : extension === "jpg" || extension === "jpeg"
            ? "image/jpeg"
            : "image/png";
      link.href = url;
    };

    if (!me?.organization?.logo_url) {
      setFavicon("/favicon.png");
      return;
    }

    const tester = new Image();
    tester.onload = () => setFavicon(faviconUrl);
    tester.onerror = () => setFavicon("/favicon.png");
    tester.src = faviconUrl;
  }, [me?.organization?.logo_url]);

  if (publicPath) return <PublicRoutes />;
  if (authLoading || (session && error?.status === 401)) return <p>Loading…</p>;
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  if (isLoading) return <p>Loading…</p>;
  if (error) {
    return (
      <AccessError
        error={error}
        onReset={() => {
          void supabase.auth.signOut({ scope: "local" }).finally(() => {
            queryClient.removeQueries({ queryKey: ["me"] });
            setSession(null);
          });
        }}
      />
    );
  }

  const policyVersions = me?.policy_versions;
  const privacyAccepted =
    me?.user?.privacy_policy_version &&
    me?.user?.privacy_policy_version === policyVersions?.privacy_policy_version;
  const termsAccepted =
    me?.user?.terms_of_service_version &&
    me?.user?.terms_of_service_version === policyVersions?.terms_of_service_version;
  const needsPolicyAcceptance = Boolean(
    me?.user &&
      policyVersions &&
      (!privacyAccepted || !termsAccepted)
  );
  const needsNamePrompt = Boolean(
    me?.user && !needsPolicyAcceptance && !me.user.full_name?.trim()
  );

  return (
    <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/invite" element={<InviteAccept />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/p/:slug" element={<PassportPublic />} />
        <Route path="/tours/:slug" element={<WalkingTourPublic />} />
        <Route path="/maps/:slug" element={<DistrictMapPublic />} />
        <Route path="/fundraising/:slug" element={<FundraisingPublic />} />
        <Route path="/contests/:slug" element={<ContestPublic />} />
        <Route path="/feedback/public" element={<PublicSurvey />} />
        <Route
          element={
            <>
              <PolicyAcceptanceModal
                isOpen={needsPolicyAcceptance}
                policyVersions={policyVersions}
                onAccepted={() =>
                  queryClient.invalidateQueries({ queryKey: ["me"] })
                }
              />
              <NamePromptModal
                isOpen={needsNamePrompt}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ["me"] })}
              />
              <AppShell me={me} />
            </>
          }
        >
          {/* ---------- HOME ---------- */}
          <Route path="/" element={<Dashboard me={me} />} />

          {/* ---------- MASTER PLANNING ---------- */}
          <Route path="/master-planner" element={<MasterPlanner />} />
          <Route path="/event-plan" element={<EventPlanForm />} />
          <Route path="/meeting-notes" element={<MeetingNotes />} />
          <Route path="/documents" element={<DocumentLibrary />} />
          <Route path="/action-center" element={<ActionCenter />} />

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
          <Route path="/feedback/results" element={<SurveyResults />} />

          {/* ---------- TASKS ---------- */}
          <Route path="/taskmaster" element={<TaskMaster />} />

          {/* ---------- CHAT ---------- */}
          <Route path="/chat" element={<Chat />} />

          {/* ---------- INVESTORS ---------- */}
          <Route path="/crm" element={<CRM />} />
          <Route path="/crm/contacts/:contactId" element={<CRM />} />
          <Route path="/crm/entities/:entityId" element={<CRM />} />
          <Route path="/crm/places/:placeId" element={<CRM />} />
          <Route path="/crm/imports" element={<CRM />} />
          <Route path="/crm/audiences" element={<CRM />} />
          <Route path="/crm/touchpoints" element={<CRM />} />
          <Route path="/outreach" element={<Outreach />} />
          <Route path="/walking-tours" element={<WalkingTours />} />
          <Route path="/district-maps" element={<DistrictMaps />} />
          <Route path="/fundraising" element={<Fundraising />} />
          <Route path="/contests" element={<Contests />} />
          <Route path="/investors" element={<InvestorTrack />} />

          {/* ---------- SUPPLY ---------- */}
          <Route path="/supplystop" element={<SupplyStop />} />

          {/* ---------- VOLUNTEERS ---------- */}
          <Route path="/teambuilder" element={<TeamBuilder />} />

          {/* ---------- WHEELSPIN ---------- */}
          <Route path="/wheelspin" element={<WheelSpin me={me} />} />
          <Route
            path="/wheelspin/:id/presenter"
            element={<WheelSpinPresenter me={me} />}
          />

          {/* ---------- PASSPORTS ---------- */}
          <Route path="/passports" element={<PassportAdmin />} />
          <Route path="/photobooth" element={<PhotoBooth />} />

          {/* ---------- SETTINGS ---------- */}
          <Route
            path="/settings"
            element={
              <Settings
                currentUser={me?.user}
                isSuperAdmin={me?.user?.role === "super_admin"}
                isAdmin={
                  me?.user?.role === "admin" ||
                  me?.user?.role === "super_admin"
                }
              />
            }
          />
          <Route path="/settings/users" element={<UserManagement />} />
          <Route path="/settings/ai-sessions" element={<AiSessions />} />
        </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
