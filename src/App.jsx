import React, { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/queryClient";
import { apiFetch } from "@/api";
import { supabase } from "@/lib/supabaseClient";

import AppShell from "@/components/layout/AppShell";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import PageLoadingFallback from "@/components/system/PageLoadingFallback";

// Route modules stay out of the entry bundle and load only when visited.
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const MasterPlanner = React.lazy(() => import("@/pages/MasterPlanner"));
const EventPlanForm = React.lazy(() => import("@/pages/EventPlanForm"));
const MeetingNotes = React.lazy(() => import("@/pages/MeetingNotes"));
const DocumentLibrary = React.lazy(() => import("@/pages/DocumentLibrary"));
const ActionCenter = React.lazy(() => import("@/pages/ActionCenter"));
const PocketBook = React.lazy(() => import("@/pages/PocketBook"));
const BudgetDetails = React.lazy(() => import("@/pages/BudgetDetails"));
const MarketStreet = React.lazy(() => import("@/pages/MarketStreet"));
const CampaignWorkspace = React.lazy(() => import("@/pages/CampaignWorkspace"));
const CreateRequest = React.lazy(() => import("@/pages/CreateRequest"));
const RequestDetails = React.lazy(() => import("@/pages/RequestDetails"));
const FeedBack = React.lazy(() => import("@/pages/FeedBack"));
const SurveyBuilder = React.lazy(() => import("@/pages/SurveyBuilder"));
const PublicSurvey = React.lazy(() => import("@/pages/PublicSurvey"));
const SurveyResults = React.lazy(() => import("@/pages/SurveyResults"));
const TaskMaster = React.lazy(() => import("@/pages/TaskMaster"));
const CRM = React.lazy(() => import("@/pages/CRM"));
const Outreach = React.lazy(() => import("@/pages/Outreach"));
const WalkingTours = React.lazy(() => import("@/pages/WalkingTours"));
const WalkingTourPublic = React.lazy(() => import("@/pages/WalkingTourPublic"));
const DistrictMaps = React.lazy(() => import("@/pages/DistrictMaps"));
const DistrictMapPublic = React.lazy(() => import("@/pages/DistrictMapPublic"));
const Fundraising = React.lazy(() => import("@/pages/Fundraising"));
const FundraisingPublic = React.lazy(() => import("@/pages/FundraisingPublic"));
const Contests = React.lazy(() => import("@/pages/Contests"));
const ContestPublic = React.lazy(() => import("@/pages/ContestPublic"));
const InvestorTrack = React.lazy(() => import("@/pages/InvestorTrack"));
const SupplyStop = React.lazy(() => import("@/pages/SupplyStop"));
const TeamBuilder = React.lazy(() => import("@/pages/TeamBuilder"));
const WheelSpin = React.lazy(() => import("@/pages/WheelSpin"));
const WheelSpinPresenter = React.lazy(() => import("@/pages/WheelSpinPresenter"));
const PassportAdmin = React.lazy(() => import("@/pages/PassportAdmin"));
const PassportPublic = React.lazy(() => import("@/pages/PassportPublic"));
const Chat = React.lazy(() => import("@/pages/Chat"));
const PhotoBooth = React.lazy(() => import("@/pages/PhotoBooth"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const UserManagement = React.lazy(() => import("@/pages/UserManagement"));
const TeamManagement = React.lazy(() => import("@/pages/TeamManagement"));
const AiSessions = React.lazy(() => import("@/pages/AiSessions"));
const Login = React.lazy(() => import("@/pages/Login"));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const InviteAccept = React.lazy(() => import("@/pages/InviteAccept"));
const PrivacyPolicy = React.lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("@/pages/TermsOfService"));
const PolicyAcceptanceModal = React.lazy(() => import("@/components/policies/PolicyAcceptanceModal"));
const NamePromptModal = React.lazy(() => import("@/components/users/NamePromptModal"));
const AccessRequestPanel = React.lazy(() => import("@/components/users/AccessRequestPanel"));

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

function AccessError({ error, onReset, session }) {
  const notProvisioned = error?.code === "ACCOUNT_NOT_PROVISIONED";
  if (notProvisioned) {
    return <AccessRequestPanel session={session} onReset={onReset} />;
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          MainSuite is temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          We could not finish loading your account. Please try again, or return to sign in if the problem continues.
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
        session={session}
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
              {needsPolicyAcceptance && (
                <PolicyAcceptanceModal
                  isOpen
                  policyVersions={policyVersions}
                  onAccepted={() =>
                    queryClient.invalidateQueries({ queryKey: ["me"] })
                  }
                />
              )}
              {needsNamePrompt && (
                <NamePromptModal
                  isOpen
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ["me"] })}
                />
              )}
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
          <Route path="/marketstreet/campaign/:id" element={<CampaignWorkspace />} />
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
          <Route path="/settings/teams" element={<TeamManagement />} />
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
          <Suspense fallback={<PageLoadingFallback />}>
            <AppInner />
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
